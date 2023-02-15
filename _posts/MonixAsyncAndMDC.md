---
title: 'Monix Async, MDC, Thread Local, Correlation ID in Scala'
date: 2023-02-16
permalink: /posts/monixmdc/
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
Base your computation on monix `Task`, avoid converting it to cats `IO`

What did not work when converting Task to IO at HTTP layer
- MDC state is global and overwritten by concurrent requests
```scala

```


What works
```scala

```


# Reference
