struct inode {
    /* File mode and owner info */
    uint16_t    i_mode;         /* 2 bytes: File type and access rights */
    uint16_t    i_uid;          /* 2 bytes: Owner user ID */
    uint32_t    i_size;         /* 4 bytes: Size in bytes */
    /* Cumulative: 8 bytes */
    
    /* Time values */
    uint32_t    i_atime;        /* 4 bytes: Last access time */
    uint32_t    i_ctime;        /* 4 bytes: Creation time (inode change time) */
    uint32_t    i_mtime;        /* 4 bytes: Last modification time */
    uint32_t    i_dtime;        /* 4 bytes: Deletion time */
    /* Cumulative: 24 bytes */
    
    /* Group, links, blocks */
    uint16_t    i_gid;          /* 2 bytes: Group ID */
    uint16_t    i_links_count;  /* 2 bytes: Number of hard links to this inode */
    uint32_t    i_blocks;       /* 4 bytes: Number of 512-byte blocks allocated */
    /* Cumulative: 32 bytes */
    
    /* Flags and version */
    uint32_t    i_flags;        /* 4 bytes: File flags */
    uint32_t    i_generation;   /* 4 bytes: File version (for NFS) */
    /* Cumulative: 40 bytes */
    
    /* Direct block pointers */
    uint32_t    i_block[12];    /* 48 bytes: 12 direct block pointers (4 bytes each) */
    /* Cumulative: 88 bytes */
    
    /* Indirect block pointers */
    uint32_t    i_indirect;     /* 4 bytes: Single indirect block pointer */
    uint32_t    i_double;       /* 4 bytes: Double indirect block pointer */
    uint32_t    i_triple;       /* 4 bytes: Triple indirect block pointer */
    /* Cumulative: 100 bytes */
    
    /* File system specific information */
    uint32_t    i_file_acl;     /* 4 bytes: File ACL */
    uint32_t    i_dir_acl;      /* 4 bytes: Directory ACL */
    uint32_t    i_faddr;        /* 4 bytes: Fragment address */
    /* Cumulative: 112 bytes */
    
    /* OS-dependent fields */
    union {
        struct {
            uint8_t    i_frag;     /* 1 byte: Fragment number */
            uint8_t    i_fsize;    /* 1 byte: Fragment size */
            uint16_t   pad1;       /* 2 bytes: Padding */
            uint16_t   i_uid_high; /* 2 bytes: Upper 16 bits of 32-bit user ID */
            uint16_t   i_gid_high; /* 2 bytes: Upper 16 bits of 32-bit group ID */
            uint32_t   pad2;       /* 4 bytes: Padding */
            /* Cumulative: 124 bytes */
        } linux2;
        
        /* Extended attributes and other OS-specific data */
        uint8_t    i_osd2[144];   /* 144 bytes: OS-dependent data */
        /* Cumulative: 256 bytes */
    } osd2;
};  /* Total: 256 bytes */