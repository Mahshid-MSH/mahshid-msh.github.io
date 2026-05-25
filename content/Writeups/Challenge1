
We are going to solve a challenge. The goal is to see confidential access granted. 

First of all, like always, we check the security options enabled for this binary files:

![alt](./assets/1.png)

Canary is disabled, which means we will be able to change the return address easily. Also, the PIE is disabled, so the address of the code won't change. and we can use the same address for each run. 

Next we take a look at the metadata. It appears that the architecture is x86-64. Then we should use little-endian in the future. Also, it is stripped, meaning that we won't have the name of the functions. 
![alt](./assets/2.png)
To get a better understanding of the binary, we open it on ghidra. 

Thankfully, after anaylyzing, ghidra could find the entry point successfully:
![alt](./assets/3.png)

It is simply a _libc_stat_main which calls the main function with some arguments. 

We then go to the main function to see what is going on inside it. 

![alt](./assets/4.png)
It is simply calling out some functions sequentially. 

The first and the second functions are just printing out something, and are trivial. 
![alt](./assets/5.png)

![alt](./assets/6.png)


However, the third function seems to be vulnerable to buffer overflow, as it is using gets function:
![alt](./assets/7.png)


Now take a look at the variables. The fist one is a 56 byte buffer of characters. The second, and third one are local variables. 
Then it checks if they are equal to some characters or not. So in order to exit from this function successfully, without hitting exit(1), we should put the value 'cafebabe' to local_10, and '1337c0de' to local_c.


![alt](./assets/8.png)

Now we can use local_48 in this case. The distance between local_48 and lcoal_10 is 56 bytes exactly. So, we will fill out 56 bytes with any character we want, and then, we reach local_10, where we put 'cafebabe' on it. However, note that we said it is little-endian. So we should print them from right to left. Also, we should print it in raw byte, as if we just type out as simple characters, it will translate them to asci. So we print this input into a file, and then give it to the program. 
We also do the same thing to fill local_c with the correct word. 

![alt](./assets/9.png)

Command: 
```c
printf 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\xbe\xba\xfe\xca\xde\xc0\x37\x13' > input.bin
```
Now we can use gdb to run the file:
![alt](./assets/10.png)

However, this is not the actual flag. We should go further. 
If we take a look at the rest of the functions, we find another function, which is not called. 

![alt](./assets/11.png)

This is the function we are looking for. In order to call this function, we need to rewrite the return address of the current function we are on, to point to this desired function. 

Now we already have filled until the end of local_c. the distance of local_c from return address it 8 bytes. Because we know that the variables are named based on thier distance from the return address.  C in hexadecimal is 12 in decimal, and C is int, which is 4 bytes. 12 - 4 = 8. We fill out these 8 bytes with whatever we like, and then, we print the address of the function we would like to call. As shown in the picture, here the address is '004011b8'. We should again have the little-endian in mind. 

```
printf 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\xbe\xba\xfe\xca\xde\xc0\x37\x13BBBBBBBB\xb8\x11\x40\x00\x00\x00\x00\x00' > exploit.bin
```

![alt](./assets/12.png)

Now if we run the file again, and give it this last string, it will print the actual flag, saying that confidentail access is granted. 

![alt](./assets/13.png)
