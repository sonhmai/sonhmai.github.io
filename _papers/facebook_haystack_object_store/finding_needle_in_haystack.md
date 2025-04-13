# Finding Needle in Haystack

- [Finding Needle in Haystack](#finding-needle-in-haystack)
  - [Summary](#summary)
  - [what did not work in NFS design?](#what-did-not-work-in-nfs-design)
  - [Haystack design](#haystack-design)
    - [Haystack Directory](#haystack-directory)
    - [Haystack Cache](#haystack-cache)
    - [Haystack Store](#haystack-store)
    - [Recovery from failures](#recovery-from-failures)
    - [Optimizations](#optimizations)
  - [4-Evaluation](#4-evaluation)
  - [Refs](#refs)

## Summary

problems with serving photos with NFS approach
1. wasted storage for not-used dir and file metadata (posix file system)
2. requires to load metadata into mem first to then load file itself from disk. This results in more disk IOs for file read.

solution
- building a custom storage system `haystack` that can reduce the amount of metadata per photo hence less disk IO to achive lower latency and higher throughput.
- use haystack to serve long-tail photos and CDN for popular photos.

result
- Haystack serves photos with less cost and higher throughput compared to previous design with NFS and NAS (Network Attached Storage).
- It is incrementally scalable.

design requirements
1. high throughput low latency
2. fault-tolerant
3. more cost-effective than building for NAS
4. simple

## what did not work in NFS design?
1. CDN misses the long-tail requests (older, less common photos) - typical for Facebook photos usage - which result in high latency. This is bad for user experience. 
2. Caching all in CDN is not cost effective.
3. Having enough RAM to cache all the inodes (~256 bytes each) is also not cost effective.

<p align="center">
<img src="./haystack_nfs_design.png" width="50%" height="50%">
</p>

1 photo = 1 file = 1 inode = hundred of bytes

<p align="center">
<img src="./inode.png" width="80%" height="80%">
</p>

## Haystack design

Haystack solves the solution by 
1. reducing the amound of metadata per photo to keep all the metadata in memory. 
2. storing multiple photos in a very large file to reduce metadata further.

This then reduces the disk operations that the storage systems need when doing a read. Using the typical POSIX inode design the amount of memory needed is `256 bytes * 2B * 1000 = 512TB` for metadata alone. 

System components
1. Store: persistent storage system, manages fs metadata for photos.
2. Directory: maintains logical to physical mapping and application metadata (how to construct the photo URL for app to access).
3. Cache: internal CDN provides shield `Store` against CDN failure and frequent requests.

<p align="center">
<img src="./haystack_design.png" width="50%" height="50%">
</p>

<p align="center">
<img src="./haystack_uploading_photo.png" width="50%" height="50%">
</p>

### Haystack Directory

```
http://<CDN>/<Cache>/<machine id>/<logical volume, photo>
```

### Haystack Cache

### Haystack Store

`Key design decision`: metadata operations (getting filename, location, offset, size) do not need disk IO.

Physical volume as a very large file
```
/hay/haystack_<logical volume id>
```

- photo read
- photo write
- photo delete
- index file
- filesystem

<p align="center">
<img src="./haystack_store_file_layout.png" width="70%" height="70%">
</p>

### Recovery from failures

Failures to tolerate: faulty hard drives, bad RAID controllers, bad motherboards, etc.

How?
1. detection
   1. background job `pitch-fork` periodically checks health of Store machines.
   2. mark read-only if any problem and alert for intervention.
2. repair: 
   1. investigate and fix offline or
   2. `bulk-sync` op to reset a Store machine using a replica

### Optimizations

1. compaction
2. reducing 20% mem footprints reduce
   - 10 bytes of memory/ photo (instead of 536 bytes of `xfs_inode_t` in Linux with 1 file/photo per inode metadata)
   - replacing delete flag by setting offset 0
   - not keeping track of cookies in memory
3. batch upload
   - because big sequential writes is more suitable for disks than small random writes.
   - applies well to Facebook because users usually upload entire albums instead of single pictures.
   - improvements of aggregating writes result below.



## 4-Evaluation

## Refs
- https://azrael.digipen.edu/~mmead/www/Courses/CS180/FileSystems-1.html

