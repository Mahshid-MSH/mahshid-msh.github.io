[link of the binary file](assets/binary_patching/binary_patching)

# Bypassing Hardcoded Limits via Assembly Modification

This writeup details the process of reverse engineering a binary to locate and modify a hardcoded threshold constraint. By locating the specific condition check within IDA Pro, we can patch the immediate value directly in the assembly instruction to significantly alter the binary's execution flow.

### Phase 1: Identifying the Target Constraint

The initial phase involves running the binary and analyzing its behavior to pinpoint where the restriction occurs.

![alt](./assets/binary_patching/1.png)

Once the high-level restriction is observed, we trace the internal functions to find where this logic is handled within the application structure.

### Phase 2: Static Analysis in IDA Pro

Loading the executable into IDA Pro allows us to examine the disassembly and map out the control flow graph.

![alt](./assets/binary_patching/2.png)

To speed up comprehension of the validation routine, we generate the decompiled pseudo-code. This clearly exposes a comparison or loop condition running against a large threshold value.

![alt](./assets/binary_patching/3.png)

With the pseudo-code providing the logical context, we switch back to the graph view to map those high-level variables directly to hardware registers and memory addresses.

![alt](./assets/binary_patching/4.png)

### Phase 3: Pinpointing the Comparison Instruction

Here we find the exact target: a `cmp` (compare) instruction checking a register against the hex value `1312D00h`. 

![alt](./assets/binary_patching/5.png)

Converting `1312D00h` to decimal yields exactly `20000000`, matching our target hardcoded limit.

![alt](./assets/binary_patching/6.png)

### Phase 4: Patching the Binary

To bypass or accelerate this process, we use IDA Pro’s built-in patching functionality (`Edit -> Patch program -> Change byte`) to modify the instruction's immediate value.

![alt](./assets/binary_patching/7.png)

We overwrite the original value with a significantly smaller hex integer, lowering the execution threshold and causing the condition to trigger much earlier than originally intended.

![alt](./assets/binary_patching/8.png)

Finally, we verify that the modification is correctly applied within the disassembly graph. The binary is now ready to be exported with the modified behavior intact.

![alt](./assets/binary_patching/9.png)
