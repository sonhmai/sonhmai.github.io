---
title: 'Scala ClassTag and JVM Type Erasure'
date: 2023-03-09
permalink: /software/scala-classtag-and-type-erasure
tags:
  - java
  - scala
  - classtag
  - typeerasure
  - flink
  - generics
---


TLDR
- We had an error related to Scala `ClassTag` and `type erasure` when writing a streaming app with Flink.


# Problem

We wrote a streaming job in Flink and encountered the following error.

```shell
15:07:01.620 [main] DEBUG org.apache.flink.api.java.ClosureCleaner - Dig to clean the scala.reflect.ClassTag$GenericClassTag
15:07:01.620 [main] DEBUG org.apache.flink.api.java.ClosureCleaner - Dig to clean the java.lang.Class
Exception in thread "main" org.apache.flink.api.common.functions.InvalidTypesException: 
The return type of function 'sourceStream(StreamingJob.scala:74)' could not be determined automatically, 
due to type erasure. 
You can give type information hints by using the returns(...) method 
on the result of the transformation call, or by letting your function 
implement the 'ResultTypeQueryable' interface.

	at org.apache.flink.api.dag.Transformation.getOutputType(Transformation.java:508)
	at org.apache.flink.streaming.api.datastream.DataStream.getType(DataStream.java:191)
	at org.apache.flink.streaming.api.datastream.KeyedStream.<init>(KeyedStream.java:116)
	at org.apache.flink.streaming.api.datastream.DataStream.keyBy(DataStream.java:291)
	
...

Caused by: org.apache.flink.api.common.functions.InvalidTypesException: 
Type of TypeVariable 'OUT' in 'class org.apache.flink.api.common.functions.RichMapFunction' could not be determined. 
This is most likely a type erasure problem. The type extraction currently supports types with 
generic variables only in cases where all variables in the return type can be deduced from the input type(s). 
Otherwise the type has to be specified explicitly using type information.
```

# Concepts
There are several new concepts in the error for me so I did some readings.

## ClassTag
- A `ClassTag[T]` stores erased class of a given type `T`, accessible via `runtimeClass` field
- used whenever we want to access type information T during runtime, we use `ClassTag[T]`
- limitation: can only pass higher type info e.g. `ClassTag[List[Int]]` can only pass `List` not `Int` to runtime
- use `TypeTag` if we need both List and Int

```scala
val map: Map[String, Any] = Map(
  "Number" -> 1,
  "String" -> "hello"
)
val number: Int = map("Number") // compiler error: assigned Any to Int val
val number: Int = map("Number").asInstanceOf[Int] // this works
// error of casting to the wrong type will be a runtime error as we don't know this at compiling time
val s: String = map("Number").asInstanceOf[String] // throws ClassCastException
// 1st solution - try/catch: not scalable, inelegant
// 2nd solution - pattern matching for every type possible of Map value -> not scalable
// 3rd solution - generic pattern matching -> scalable but can cause Runtime Error
def getValueFromMap[T](key:String, dataMap: collection.Map[String, Any]): Option[T] =
  dataMap.get(key) match {
    case Some(value:T) => Some(value)
    case _ => None
  }

// compiler does not complain about assigning Option[String] to Option[Int]
val num: Option[Int] = getValueFromMap[Int]("String", myMap)
// here it becomes a Runtime Error which is not what we want
// Exception in thread "main" java.lang.ClassCastException: java.lang.String cannot be cast to java.lang.Integer
// at scala.runtime.BoxesRunTime.unboxToInt(BoxesRunTime.java:101)
val somevalue = greetingInt.map((x) => x + 5)
// problem is that runtime only looks to see whether it has some value for the key
// and did not check whether value belongs to passed type T.
// Why method getValueFromMap failed to capture type difference?
//   Runtime does not have any info about the type we passed e.g. Int in getValueFromMap[Int].
//   In execution time, T (Int) is erased and does not exist.
//   This is called Type Erasure in JVM world.
// => we need to pass type T in the runtime to help it check => ClassTag
// 4rd solution
def getValueFromMap[T](key:String, dataMap: collection.Map[String, Any])(implicit t:ClassTag[T]): Option[T] = {
  dataMap.get(key) match {
    case Some(value: T) => Some(value)
    case _ => None
  }
}
// rewritten as to be more elegant
def getValueFromMap[T : ClassTag](key:String, dataMap: collection.Map[String, Any]): Option[T] = {
  dataMap.get(key) match {
    case Some(value: T) => Some(value)
    case _ => None
  }
```

## Type Erasure
- to implement `generic` behavior, java compiler apply `type erasure`
- `Type Erasure`: process of enforcing type constraints only at `compile time`
and discarding element type information at `runtime`.
- Rules
  1. Replace type param in generic type with their bound if bounded type parameters are used
  2. Replace type param in generic type with `Object` if `unbounded` type param are used
  3. Insert type casts to preserve type safety
  4. Generate bridge methods to keep polymorphism in extended generic types


T is bounded and will be erased and replaced by Number by compiler
```
class Box<T extends Number> {
   private T t;

   public void add(T t) {
      this.t = t;
   }

   public T get() {
      return t;
   }   
}
```


Compiler replaces unbound type E with actual type of `Object`
```java
public static <E> boolean containsElement(E [] elements, E element){
    for (E e : elements){
        if(e.equals(element)){
            return true;
        }
    }
    return false;
}
// replaced
public static boolean containsElement(Object [] elements, Object element){
    for (Object e : elements){
        if(e.equals(element)){
            return true;
        }
    }
    return false;
}
```


# Reference
- [Dzone - How to Use Scala ClassTag](https://dzone.com/articles/scala-classtag-a-simple-use-case)
- [Java Generics - Type Erasure](https://www.tutorialspoint.com/java_generics/java_generics_type_erasure.htm)
