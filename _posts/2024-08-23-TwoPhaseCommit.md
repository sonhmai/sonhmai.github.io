---
layout: post
title: "Two Phase Commit Pattern"
date: 2024-08-23
tags:
  - distributed
---


# Introduction
Today I learned about the `Two Phase Commit` pattern to achieve distributed transactions in Distributed Systems.
Problem
- data needs to be `atomically` stored on multiple cluster nodes.

To note
1. what happens if coordinator fails?
2. what happens if participant fails?

two phase commit
1. prepare phase
2. commit phase

Issues: conflicting transactions
- Solution: throwing exception in prepare step (commit phase) if seeing conflicting `read lock` while acquiring `write lock`

Issue: read-only transactions holding lock causing bad performance
- Solution: `Versioned Value` = storing multiple versions of values

```mermaid
sequenceDiagram
    title check phase
    participant Alice
    participant TruckServer
    participant BikeServer
    
    Alice->>Alice: maybeBegin(txnId=1)
    Alice->>TruckServer: get(txnId=1, "booking monday")
    TruckServer->>TruckServer: acquireLock(txnId=1, "booking monday", READ)
    TruckServer-->>Alice: empty (slot available)
    
    Alice->>BikeServer: get(txnId=1, "booking monday")
    BikeServer->>BikeServer: acquireLock(txnId=1, "booking monday", READ)
    BikeServer-->>Alice: empty (slot available)
```

```mermaid
sequenceDiagram
    title commit phase
    participant Alice
    participant Coordinator
    participant TruckServer
    participant BikeServer
    note over Coordinator: truck acts as coord
    
    Alice->>Alice: commit(txnId=1)
    Coordinator->>TruckServer: prepare(txnId=1)
    TruckServer->>TruckServer: getPendingOps(txnId=1)
    TruckServer-->>TruckServer: acquireLock("booking monday", WRITE)
    TruckServer-->>TruckServer: writeToWAL("booking monday", "Alice")
    TruckServer-->>Coordinator: success
    
    Coordinator->>BikeServer: prepare(txnId=1)
    BikeServer->>BikeServer: getPendingOps(txnId=1)
    BikeServer-->>BikeServer: acquireLock("booking monday", WRITE)
    BikeServer-->>BikeServer: writeToWAL("booking monday", "Alice")
    BikeServer-->>Coordinator: success
```

## MVCC

1. read requests issued, holds a lock
2. all cluster nodes store kv at commit timestamp

```mermaid
sequenceDiagram
    title Versioned Value helps read-transactions not holding lock
    participant Alice
    participant ReportClient
    participant Coordinator
    participant Server
    
    ReportClient->>Server: readOnlyGet(ts=2, "booking monday")
    note over Server: report client read does not block <br/> client1 read-write transaction
    Server-->ReportClient: response
    
    %% two phase commit starts: read write transaction
    %% check phase
    Alice->>Alice: maybeBegin(txnId=1)
    Alice->>Server: get(txnId=1, ts=3, "booking monday")
    Server->>Server: acquireLock(txnId=1, "booking monday", READ)
    Server-->>Alice: empty (slot available)
    
    %% commit phase
    Alice->>Coordinator: commit(txnId=1)
    Coordinator->>Server: prepare(txnId=1)
    Server->>Server: getPendingOps(txnId=1)
    Server-->>Server: acquireLock("booking monday", WRITE)
    Server-->>Server: writeToWAL("booking monday", "Alice", ts=4)
    Server-->>Coordinator: success, ts=4
    Coordinator->>Server: commit(txnId=1, ts=4)
    Server-->>Server: apply("booking monday", ts=4, "Alice")
    Server-->>Server: releaseLock("booking monday")
```

```java
// MVCC using Lamport clock
class MvccTransactionalStore {
  public String readOnlyGet(String key, long readTimestamp) {
    adjustServerTimestamp(readTimestamp);
    return kv.get(new Versionedkey(key, readTimestamp));
  }
  
  
}

```

## Cockroachdb Approach

TODO

## Dynamodb Approach

Shopping cart example

``` 
TransactWriteItems(
    Check(table=customer, key=susie, exists)
    Check(table=inventory, key=book-99, amount>=5)
    Put(table=orders, key=newGUID(), customer=susie, product=book-99, copies=5,..)
    Update(table=inventory, key=book-99, amount-5)
)
```

Under the hood
- tx coordinator executes a `two phase commit`
- `prepare phase` checks the conditions e.g. check customer exists above
- `commit phase`
    - coordinator tries as hard as possible to commit the txn
    - if there is timeout in commit request -> resending to storage node until success
    - commit request is idempotent. can be retries by any coord
    - in case one failed -> coord sends release requests to rollback txn

fault tolerance, recovery
- multiple coordinators
- ledger for checkpointing `txn state`

serializability
- `timestamp ordering`
- assign timestamp to each txn = value of coord current clock
- time-drift between coords problem?

---
how a normal request routed
![img.png](img.png)

how a transact request routed
![img_1.png](img_1.png)

![img_2.png](img_2.png)

![img_3.png](img_3.png)

![img_4.png](img_4.png)

## Refs
- [USENIX ATC '23 - Distributed Transactions at Scale in Amazon DynamoDB](https://www.youtube.com/watch?v=3OpEIMR-ml0)
- [22 - Distributed Transactional Database Systems (CMU Intro to Database Systems / Fall 2022)](https://www.youtube.com/watch?v=yu2TZF7S1Mg)
