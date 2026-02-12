## 

1. Interrupt: When a physical device get error, it sends interrupt to the Operatinig System, after which the Operatinig System switch from user mode to the kernel mode.
2. System call: Also called monitor call, usually happens when a software needs do some special operations like getting keyboard inputs, which turn the system into kernel mode to duel with keyboard reading.
3. Exception: When a program encounters an error like invalid memory access, Operation System would switch from user mode to kernel mode to duel with this error.

## 

![image-20251014201318790](./assets/image-20251014201318790.png)

## 

![image-20251014201329304](./assets/image-20251014201329304.png)

Answer:PARENT: value = 20

For father process, it goes:
1. `value += 10`
2. `wait(NULL)`

so value = 20


For child process, it goes:
1. `value += 10`
2. `value += 5`

so value = 25


But these two processses run independently and don't effect each other, so the result is the 20, since parent process runs the code `printf("PARENT: value = %d", value)`