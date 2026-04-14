# CPU Scheduling

![NotebookLM Mind Map (5)](./assets/NotebookLM Mind Map (5).png)

​	CPU Scheduling 不仅适用于进程调度，也适用于线程的调度。

​	在系统调用完成并返回用户态时能够进行 CPU 调度。

## 基本概念

* Maximum CPU utilization obtained with multiprogramming
* CPU–I/O Burst Cycle – Process execution consists of a cycle of CPU execution and I/O wait
* CPU burst distribution

​	进程在运行的时候，总是会遇到很多 I/O 操作，此时 CPU 会停止运行。为了最大化利用 CPU的资源，我们希望可以利用这些空余时间。

### Alternating Sequence of CPU And I/O Bursts

​	一个程序执行的过程被 I/O 操作分成了很多片段，我们称为 ==CPU burst== 。

![image-20251028185553980](./assets/image-20251028185553980.png)

![image-20251028185844531](./assets/image-20251028185844531.png)

​	上面的图片告诉我们 scheduler 的选择应该很快，不能使用很长的时间。(short scheduler)

### CPU 调度程序

![image-20251028190612242](./assets/image-20251028190612242.png)

### 抢占调度

* CPU scheduling decisions may take place when a process:
  * When a process switches from the running state to the waiting state (e.g. I/O request or an invocation of wait())
  * When a process switches from the running state to the ready state (e.g., when an interrupt occurs)
  * When a process switches from the waiting state to the ready state (e.g., at completion of I/O)
  * When a process terminates
* Scheduling under 1 and 4 is nonpreemptive All other scheduling is preemptive

![image-20251028190858732](./assets/image-20251028190858732.png)

* 若调度==只能发生在第1种和第4种==情况下，则调度方案称为==非抢占的（nonpreeemptive）或者是协作的（cooperative）==，否则，调度方案称为==抢占的（preemptive）==。
* 在非抢占调度下，一段某个进程分类到 CPU，该进程就会一直使用 CPU，直到它终止或者是切换到等待状态。

### 调度程序（Dispatcher）

* Dispatcher module gives control of the CPU to the process selected by the short-term scheduler; this involves:
* 调度程序是一个模块，用来将 CPU 控制交给由==短期调度程序选择的进程==。这个功能包括：
  * switching contexts
  * switching to user mode
  * jumping to the proper location in the user program to restart that program
* Dispatch latency – time it takes for the dispatcher to stop one process and start another running

​	下图展示了什么叫做 Dispatch latency。

![image-20251029161146850](./assets/image-20251029161146850.png)

​	调度程序应该尽可能块，因为每次进程切换的时候都需要使用。

​	需要注意的是，**Dispatcher（分发器）是在 Scheduler（调度器）做出决定之后才介入的。**以下是甜美两者的区别：

| **模块**       | **英文名**           | **角色**               | **核心问题**       | **动作**                                                     |
| -------------- | -------------------- | ---------------------- | ------------------ | ------------------------------------------------------------ |
| **短期调度器** | Short-term Scheduler | **决策者** (The Brain) | "下一个该谁运行？" | 浏览就绪队列，根据算法（如 FCFS, 轮转等）**选出**一个进程。  |
| **分发器**     | Dispatcher           | **执行者** (The Hands) | "怎么把它放上去？" | 实际上手操作 CPU 寄存器，**切换**上下文，让选中的进程跑起来。 |

## 调度准则（Scheduling Criteria）

​	跟之前的学科一样，想要从众多的调度程序中选择出最好的，我们需要定义一些指标。

* CPU utilization (CPU利用率) – keep the CPU as busy as possible
* 注意是在运行一定任务的时候，我们希望 CPU 的运用率高
* Throughput (吞吐率)– # of processes that complete their execution per time unit
* 一个时间单元内进程完成的数量。
* Turnaround time (周转时间)– amount of time to execute a particular process
* 从进程提交到进程完成的时间段被称为周转时间（turnaround time）
* Waiting time (等待时间)– amount of time a process has been waiting in the ready queue
* 在就绪队列中等待所花费的时间之和。
* Response time (响应时间)– amount of time it takes from when a request was submitted until the first response is produced, not output  (for time-sharing environment)	
* 提交任务之后第一次响应的时间

## 调度算法

​	CPU 调度处理的问题是：从就绪队列中选择进程以便为其分配 CPU。

### First-Come, First-Served (==FCFS==) Scheduling（先到先出服务调度）

​	采用这种方案，先请求 CPU 的进程首先分配到 CPU。![image-20251029192350345](./assets/image-20251029192350345.png)

​	缺点是平均等待时间（算术平均）很长。例如：

![image-20251029192445465](./assets/image-20251029192445465.png)

![image-20251029192457601](./assets/image-20251029192457601.png)

* 这样来算的话，$Throughput=3/30=0.1$。
* $Average \; Turn \; around \; time = (24+27+30)/3$

![image-20251029193322013](./assets/image-20251029193322013.png)

* 这种方法==对长时间作业比较有利==，==对短时间作业不利==；因为 CPU 密集型作业需要占据的 CPU 时间很多，因此属于长时间作业；而 I/O 密集型作业因为要频繁调用 I/O 操作，CPU 使用的少，因此属于短时间作业。
  * 长时间一旦占据 CPU 之后，就可以一直使用，因此处理效率很高。

* 长短时间描述的是占据 CPU 的时间。

### Shortest-Job-First (==SJF==) Scheduling（最短作业优先调度）

​	根据上面的例子我们可以知道==把执行时间较短的进程放在前面比较合理==。因此，我们可以考虑采用==最短作业优先==的调度算法。

* Associate with each process the length of its next CPU burst.  Use these lengths to schedule the process with the shortest time
* Two schemes: 
* 根据是否抢占，我们可以将调度方法分为两种：非抢占式的和抢占式的。
  * nonpreemptive – once CPU given to the process it cannot be preempted until completes its CPU burst
  * preemptive – if a new process arrives with CPU burst length less than remaining time of current executing process, preempt.  This scheme is known as the Shortest-Remaining-Time-First (SRTF)
* SJF is optimal – gives minimum average waiting time for a given set of processes

​	对于上述的两种类型的调度，我们可以举两个例子：

![image-20251029194933497](./assets/image-20251029194933497.png)

![image-20251029195151997](./assets/image-20251029195151997.png)

* Unfortunately, no way to know the length of the next burst
* 不幸的是，在实际中，我们是无法知道一个进程的 CPU buest time 的
* Can only estimate the length
* 我们只能进行预测
* Can be done by using the length of previous CPU bursts, using exponential averaging（指数平均）

![image-20251029202402084](./assets/image-20251029202402084.png)

![image-20251029203652294](./assets/image-20251029203652294.png)

![image-20251029203706926](./assets/image-20251029203706926.png)

​	优先调度算法一个最主要的问题就是==无穷阻塞（indefinite blocking）==或者是==饥饿（starvation）==。就绪运行但是等待 CPU 的进程可以认为是阻塞的。优先调度算法会让某个低优先级的进程无穷等待 CPU。

​	解决饥饿的方案之一是==老化（aging）==。老化逐渐增加在系统中等待很长的进程的优先级。

### 轮转（Round-Robin）调度

* 时间量（time quantum）/时间片（time slice）：一个较小的时间单元。
* 就绪队列作为==循环队列==，类似于循环列表。
* 过程：

![image-20251102141006123](./assets/image-20251102141006123.png)

* 时钟中断发生后，系统会修改当前进程在时间片内的剩余时间。
* 时间片结束还没运行完成的，状态变为就绪态，等待下次的系统调用。
* 这种方法的实时性很好，可以很好地和用户交流

### 多级队列调度（Multilevel Queue）

​	在进程容易分成不同组的情况下，可以有另外一类调度算法，例如，Ready queue is partitioned into separate queues:  

* foreground process(==interactive==)  前台进程
* background process(==batch==)  后台进程

​	这两种类型具有不同的响应时间要求，进而有不同调度需要。==进台进程可能有比后台进程更高的优先级。==

* Each queue has its own scheduling algorithm, for example
  * foreground – RR
  * 交互性好
  * background – FCFS
* Scheduling must be done between the queues
  * Fixed priority scheduling; (i.e., serve all from foreground then from background).  Possibility of starvation.
  * Time slice – each queue gets a certain amount of CPU time which it can schedule amongst its processes; 
    * i.e., 80% to foreground in RR
    * 20% to background in FCFS 

### 多级反馈队列调度（Multilevel Feedback Queue）

![image-20251102171625862](./assets/image-20251102171625862.png)

![image-20251102171633089](./assets/image-20251102171633089.png)

### 多处理器调度方法（Multiple-Processor Scheduling）

![image-20251102171756887](./assets/image-20251102171756887.png)

* 需要考虑
  * 负载平衡：尽量让每一个 CPU 都同等忙碌
  * 处理器亲和性：尽量让同一个进程运行在一个 CPU 上
* ==Asymmetric multiprocessing==
* ==Symmetric MultiProcessing, SMP==

### 实时 CPU 调度

![image-20251102172030681](./assets/image-20251102172030681.png)

* ==Hard real-time systems==
* ==Soft real-time computing==
* 抢占式优先级高者优先算法比较适合实时系统的进程调度。