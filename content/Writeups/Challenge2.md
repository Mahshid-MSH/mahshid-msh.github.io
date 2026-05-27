**Goal:** Exploit a buffer overflow to bypass authentication checks, solve a hidden mathematical equation, and read the flag.
### 1. Initial Recon

First things first, we start by checking the metadata and the security options applied to the binary.

![alt](./assets/challenge2/1.png)

### 2. Diving into Ghidra

Next, we load the file into Ghidra to see what is really going on under the hood. Unlike some other challenges, this binary hasn't been stripped, so we can clearly see the real function names, which makes our analysis much easier.

![alt](./assets/challenge2/2.png)

If you take a look at the `main` function, you will see a bunch of local variables. 
At line $19$, the program uses `fgets` to take the username. This specific read is not vulnerable to a buffer overflow because it takes exactly $0x40$ characters (which equals $64$ bytes in decimal) into a $72$-byte buffer. 

However, at line $21$, you can see the usage of `gets()`. Because `gets()` reads input without any size limitations, we have a confirmed buffer overflow vulnerability here.

### 3. Analyzing the Checks

To successfully take advantage of this buffer overflow, we need to bypass a series of conditions:
1. **The Username Check:** The variable `local_14` must be equal to `MyAdminUser` so the first `if` condition is met.
2. **The Password Check:** The vulnerable buffer `local_a8` is compared using `strcmp`. We need this to return $0$. The trick here is that `strcmp` stops comparing as soon as it hits a null byte (`\x00`). If we craft our payload so that there is a `\x00` immediately after our password string, `strcmp` will return $0$, and we can continue overflowing the rest of the stack.
3. **The Math Equation:** Finally, we need to bypass a second `if` condition by solving a math equation to find the exact values that must reside in `local_10` and `local_c`.

I wrote a simple Python script to automatically calculate the required values, as doing it by hand is a bit tedious:

![alt](./assets/challenge2/3.png)

The script reveals our solutions: we need $20275$ for `local_10` and $9725$ for `local_c`.

### 4. Crafting the Payload

Now it is time to craft the payload. Variables like `local_20` and `local_14` are not important as their values will simply be overwritten.

In Ghidra, variables are named based on their distance from the beginning of the stack frame. For example, `local_c` is $0xC$ bytes (or $12$ in decimal) away from the base of the stack. Because the stack grows downward, the variables sit on the stack in this order (from lowest address to highest): `local_128`, `local_a8` (our vulnerable buffer), `local_68`, `local_10`, and finally `local_c` which is closest to the stack beginning.

Here is how we build the exploit step-by-step:
1. **The Password:** We start with the password (`my4dm1np455w0rd`), which goes at the beginning of the buffer. We immediately follow it with a null byte (`\x00`) to bypass `strcmp`.
2. **Padding 1:** We calculate the distance from the end of the password to the start of `local_68`, which equals $65 - 15 - 1$ bytes ($1$ being the null byte). We fill this space with garbage characters.
3. **The Username:** Next, we place `MyAdminUser` into the buffer to bypass the first check.
4. **Padding 2:** We calculate the distance to `local_10`, which requires $88 - 11 - 1$ bytes of garbage ($11$ is the length of the username, and $1$ is for the null byte). 
5. **Target Variable 1:** We write our calculated number ($20275$) into `local_10`, making sure to pack it in little-endian format.
6. **Target Variable 2:** The distance between `local_10` and `local_c` is exactly $4$ bytes. Since a standard integer is also $4$ bytes long, we don't need any padding here. We just append our second number ($9725$) for `local_c`, also in little-endian.

This table represents the stack layout and how the payload fills it from the lowest address to the highest address:

| Variable / Section | Offset (Hex) | Distance / Size | Payload Content                              |
| :----------------- | :----------- | :-------------- | :------------------------------------------- |
| `local_a8` (Start) | `-0xa8`      | $16$ bytes      | `my4dm1np455w0rd\x00` (Password + Null byte) |
| Padding 1          | `-0x98`      | $48$ bytes      | Garbage characters (e.g., `'A' * 48`)        |
| `local_68`         | `-0x68`      | $12$ bytes      | `"MyAdminUser\x00"` (Username + Null byte)   |
| Padding 2          | `-0x5c`      | $76$ bytes      | Garbage characters (e.g., `'B' * 76`)        |
| `local_10`         | `-0x10`      | $4$ bytes       | $20275$ (Little-endian: `\x33\x4f\x00\x00`)  |
| `local_c`          | `-0x0c`      | $4$ bytes       | $9725$ (Little-endian: `\xfd\x25\x00\x00`)   |
| Saved RBP          | `-0x08`      | $8$ bytes       | (Unmodified / Not reached)                   |
| Return Address     | `0x00`       | $8$ bytes       | (Unmodified / Not reached)                   |

Here is the python script that puts it all together:

![alt](./assets/challenge2/4.png)

### 5. Executing the Exploit

There is only one thing left. Our payload is ready, but the program initially asks: *Enter admin username*. 

We need to supply this legitimate input before triggering our overflow. To handle this, we add the username followed by a newline (`\n`) to the very beginning of our exploit file to stop the first `fgets` read, allowing the program to move onto the vulnerable `gets()` call.

![alt](./assets/challenge2/5.png)

We are all set! Let's feed this file to the program.

![alt](./assets/challenge2/6.png)

It worked exactly as expected! 

*Note: Because I was running this locally and didn't have the actual `flag.txt` file on my machine, the program threw a "missing flag" error. However, this perfectly confirms that our exploit successfully bypassed all checks and reached the restricted code block responsible for reading the flag!*

