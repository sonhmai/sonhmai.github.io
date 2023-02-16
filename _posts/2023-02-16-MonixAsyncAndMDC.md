---
title: 'Monix Async, MDC, Thread Local, Correlation ID in Scala'
date: 2023-02-16
tags:
  - monix
  - http4s
  - scala
  - mdc
  - threadlocal
  - local
  - correlationid
---


TLDR
- Using MDC in async execution is hard to reason about
- A solution of propagating MDC in async execution is to use Monix library and to base
the computation on task.
- When there is async boundaries between monix Task and scala Future, thread context should
be manually propagated (copied)
- Avoid using Task and converting to cats IO at the end of your program (e.g. HTTP server layer),
using Task only helps because Monix has a TracingSchedule


# Problem
Context 
- We have a HTTP server written in Scala, using `Monix` as the async library,
`http4s` HTTP Server.
- We use MDC to hold specific variables for a request such as 
correlation ID (unique ID of a HTTP request for logging and tracing)
- Execution model is async where a request might switch between different threads when
there is async boundaries (e.g. querying a database, calling an external service,...)


We observed:
  - there are many requests and responses having null correlation ID which should not be 
  the case as our code generates a UUID if no correlation ID is found in the request header.
  - sometimes there are duplicated correlation ID 
  - sometimes in debugging, we see the correlation IDs of request and response do not match 


Assumptions
- MDC is not properly propagated between requests



# Investigation


# Solution
## 1-Base your computation on monix `Task`, avoid converting it to cats `IO`

What did not work when converting Task to IO at HTTP layer
- MDC state is global and overwritten by concurrent requests
```
val httpApp: HttpApp[IO] = ???
val resource = BlazeServerBuilder[IO](scheduler)
  .bindHttp(80, "0.0.0.0")
  .withHttpApp(httpApp)
  .resource
val (serverIO: Server[IO], resourceReleaser: IO[Unit]) = resource.allocated.unsafeRunSync()
```


What works
```
var httpApp: HttpApp[Task] = ???
val resource = BlazeServerBuilder[Task](scheduler)
  .bindHttp(80, "0.0.0.0")
  .withHttpApp(httpApp)
  .resource
val (server: Server[Task], resourceReleaser: Task[Unit]) = resource.allocated.runSyncUnsafe()
```


## 2-Put MDC before the async boundary Task->Future

If you have to use `Future` together with monix `Task` or `Observable`
(e.g. using a library that returns Future), add another Future before your
Future to add MDC in Thread Local to the executing Future.


what does not work
```
// here we use Observable, same thing applies for Task
Observable.fromFuture {
  Future {
    // thread executing here won't have the Thread Local of the previous Task
    Thread.sleep(1000) // sleeping to simulate a database call
    "result"
  }
}
```


what works
``` 
Observable.fromFuture {
  Thread.sleep(1000)
  for {
    // adding this line helps correlationId properly propagated to sangria Execution thread
    _ <- Future(MDC.put(correlationId, requestContext.correlationId)) 
    result <- Future {
      Thread.sleep(1000) // sleeping to simulate a database call
      "result"
    }
  } yield result
}
```


# Reference
- https://blog.knoldus.com/how-to-use-mdc-logging-in-scala/
- https://www.signifytechnology.com/blog/2018/11/correlation-ids-in-scala-using-monix-by-adam-warski
- https://medium.com/iadvize-engineering/request-tracing-in-microservices-architecture-a-kleisli-tale-aae8daaa61f
- https://medium.com/hootsuite-engineering/logging-contextual-info-in-an-asynchronous-scala-application-8ea33bfec9b3
- [Log4j2 java map - Multiple nested parallel MDC inserts is inconsistent](https://github.com/mdedetrich/monix-mdc/issues/3)
- https://speakerdeck.com/kubukoz/keep-your-sanity-with-compositional-tracing?slide=26
- https://github.com/mdedetrich/mdc-async/blob/master/src/main/scala/scala/concurrent/MDCExecutionContext.scala
