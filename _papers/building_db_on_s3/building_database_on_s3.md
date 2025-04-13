# Building a database on S3

## Summary

in scope
- building a basic database with different consistency levels on S3

out of scope
- strict consistency and db-style transactions (not useful in web-scale apps)

what are the advantages of building on S3?
- easier to control security (3.6)
- easier to control and tune for different levels of consistency
- easier to provide latency guarantees (upper bounds for all read write requests)

what are the limitations?
- cannot do chained IO to scan through several pages on S3 -> important for S3 db algo design.
- in theory, it can take undetermined amount of time before updates of one client are visible to others.

## Problems
(answers at the end)

1. problem: reading from S3 at best at 100ms (100x-1000x local disk) is too slow for a database.
2. problem: low bandwidth with small objects.
3. problem: S3 uses `last update wins` policy.
4. problem: the system is eventually-consisten and it can take undetermined amount of time before updates of one client are visible to others.
5. problem: a PU queue can only be checkpointing by 1 client at a time.


## Terms
- checkpointing: applying log records of updates on SQS to S3 pages.
- consistency
  - strict
  - monotonic reads
  - monotonic writes
  - read your writes
  - write follows read
  - eventual
- isolation: snapshot isolation, backward-oriented concurrency control (BOCC)
- BOCC: global counter

## Details

how many levels of consistency is designed?
1. naive
2. basic
3. monotonicity
4. atomic

what is the Naive approach?
- commit op writes all dirty pages directly back to S3
- can have lost updates -> cannot achieve even `eventual consistency`

basic
- supports eventual consistency

monotonicity

atomicity

how different levels of consistency affects latency and cost?

[!img](./building_s3_running_time_txns.png)

how to deal with concurrent clients update records on the same page?
1. coordinate the updates -> limit the scalability

coordinate updates = synchronize updates

s3 vs disk
- pros: can support ~indefinite num clients, way faster throughput not reducing with num clients.
- cons: 100x-1000x worse latency for read and write.

why only 1 PU queue can be used at a time?

### commit protocol

#### What happens if a client crashes during a commit?
- client resends all log records when it restarts.
- some log records are sent twice but not a problem since they are idempotent.
- indeterminism still possible: an update-ts1 might overwrite update-ts2 happening after it.

#### why are log records idempotent?
- there are 3 types of log records: insert, delete, update so we look at them each
- (insert, key, payload) -> if applied again, the same key is inserted so idempotent
- (delete, key) -> if applied again, the same key is deleted so idempotent
- (update, key, afterimage) -> if applied again, the same key is updated to same value so idempotent
- note that idempotent is not consistent in concurrency scenarios so `update-ts1` can still overwrite `update-ts2` when update-ts1 is reapplied.
ts1 happens before ts2 in reality. this problem is called `indeterminism`

#### what is a redo log record? how is it different from undo?
- redo captures the change and new value for roll-forward in case of a crash.
- undo captures the old value before the change for roll-back.
- example
```
a table user with userid=1, username=before
a SQL update executed in txn T1 `UPDATE user where userid=1 SET username='after'

redo: txn=t1, table=user, rowid=1, column=username, value='after', action=update
undo: txn=t1, table=user, rowid=1, column=username, value='before', action=update
```

#### in what case atomicity is violated?
- a client issues txn T1: where it updates table1 and table2.
- after table1 update is done, the `record manager` sends update1 `log record` to `Pending Update` queue.
- the checkpoint worker applies this log record to table state on S3.
- client crashes.
- the state on S3 now is in the middle of transaction. 
- client might not come back and the other log record might not ever be updated.
- so this txn is not atomic.

#### how to ensure atomicity?
todo

#### what happens if a PU queue is checkpointed by multiple clients?
- lost updates. 
  - Let's say there are 2 client1 and client2 checkpointing a PU queue with 2 log records {r1, r2}
  - update r1 writes table1 value from 0 to 1
  - update r2 writes table1 value from 1 to 2
  - client1 takes r1, client2 takes r2
  - client2 updates first, then client1 updates
  - table1 now at value 1 instead of 2 as we wanted (r2 happens after r1).

#### what is the protocol to synchronize concurrent update transactions then?

#### what is a checkpoint strategy? what are the options? what is proposed by the paper?
- determine by whom and when to checkpoint.
- 4 options for the checkpointer of a Page X
  1. reader of X
  2. writer: a client who just committed updates to X
  3. watchdog: a process which periodically checks PU queues
  4. owners: X is assigned to a specific client which periodically checks PU queue of X
- proposed: readers and writers of X because 
  - they need to work in X anyway to avoid extra resource needed.
  - owners might be offline for an undetermined amount of time.

### Transactional properties

<details>
  <summary>Which specific transactional properties this section provides implementation strategies for?</summary>
  - atomicity and 
  - all client-side consistency levels
    - monotonic reads
    - monotonic writes
    - read your writes
    - write follows read
</details>

<details>
  <summary>Which ACID properties are impractical to achive?</summary>
  - Isolation and Strong Consistency.
</details>

<details>
  <summary>Why is strong consistency considered different from client-side consistency?</summary>
  - Strong consistency refers to the whole system, every clients scope. This guarantees that every clients agree on a global order of operations. This often means Linearizability`` for operations and `Serializability` for transactions.
  - Client-side consistency refers to only 1 client and its sequence of operations. This guarantees only the consistency for one client operations, not globally for every clients.
</details>

<details>
<summary>What is the mechanism to ensure atomicity?</summary>
```
3 steps for commit operation. Step 2 and 3 can be async.
1. send all log records to ATOMIC queue. Commit record sent last.
2. Send all log records to PU queues.
3. Delete commit record from ATOMIC queue.
```
</details>


## Answers

1. solution: aggresive caching.
2. solution: batching objects into big pages.
3. solution: all commit protocol ensures there is enough time (seconds) between updates to same objects. 
4. solution: the eventual time can be capped by checkpointing. Tuning checkpoint interval (trade-off increasing cost ~ checkpoint more frequent) to e.g. 10 seconds -> all clients must see updates after 10 seconds.
5. solution: using multiple PU queues.
