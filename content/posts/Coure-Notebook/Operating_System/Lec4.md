# Threads（多线程编程）

![image-20251231103705989](./assets/image-20251231103705989.png)

## 引入：为什么需要线程

​	首先来看几段代码：

代码1:
```C
main(){
	while(1){
		RetrieveData();	// Block for 1 second
		DisplayData();	// Block for 1 second
		GetInputEvents();	// Block for 1 second
	}
}

```

代码2:
```c
main(){
	while(1){
		RetrieveALittleData();	// Block for 0.1 second
		DisplayALittleData();	// Block for 0.1 second
		GetAFewInputEvents();	// Block for 0.1 second
	}
}

代码3:
main(){
	while(1){
		if(CheckData()==True){
			RetrieveALittleData();	// 0.1 second
			DisplayALittleData();	// 0.1 second
		}
		if(CheckInputEvents()==True){
			GetAFewInputEvents();	// 0.1 second
		}
	}
}

```

* 对于代码1来说，如果想要操作系统有一个更快的反应（more responsive），就需要将各个进程切换的时间减少。于是我们得到了代码2
* 在代码2的基础上，我们可以增加条件判断，比如在需要查看数据的情况下在选择查找数据，这样可以减少无效时间。这样就的得到了代码3
* 然而，切换的时间消耗也是比较大的。较少的 response time 会导致切换的时间大大增多。
* More precisely, we want to SCHEDULE these operations in our own program code.
* Leave the tedious work to the OS which schedules them in *Threads*!

## 概述

### 什么是线程

* 线程是 CPU 使用的基本单元，包括：
  * 线程 ID
  * 程序计数器
  * 寄存器组
  * 堆栈
* 线程与同一进程的其他线程共享：
  * 代码段
  * 数据段
  * 其他系统资源

​	据此，我们可以将进程分为两种：单线程进程与多线程进程

<img src="./assets/image-20251021140803642.png" alt="image-20251021140803642" style="zoom:33%;" />

​		使用多线程编程有以下好处：

* Responsiveness
  * interactive applications
  * 即使部分阻塞或者是执行冗长操作，都可以继续执行。
* Resource Sharing
  * memory for code and data can be shared.
  * 线程默认共享它们所属进程的内存和资源。
  * 代码和数据共享的优点是：允许一个应用程序在同一地址空间内有多个不同活动线程。
* Economy
  * creating processes are more expensive.
  * 创建一个进程的代价很大，因此显得线程创建的代价很小
* Utilization of MP Architectures（可伸缩性）
  * multi-threading increases concurrency.
  * 多线程进程可以运行在多处理核上，单线程进程只能运行在一个 CPU 上。
  * <img src="./assets/image-20251021141934640.png" alt="image-20251021141934640" style="zoom:33%;" />
  * 实际上，上面这张图也展示了==并发（**Concurrency**）==与==并行（**Parallelism**）==的区别：
    * **并发 (Concurrency)**：指的是系统支持多个任务，并允许所有任务都能**取得进展**。在单核 CPU 系统上，这通过在多个任务（线程）之间**快速切换**来实现。虽然在任何给定的瞬间只有一个任务在运行，但从宏观上看，所有任务都在向前推进。
    * **并行 (Parallelism)**：指的是**同时执行**多个任务。这意味着在同一时刻，有多个任务在不同的处理单元上真实地运行。
    * 两者的区别就像上面的一样

​	当然，还是多线程还是有一点问题的，比如，多线程有可能会导致一个地址被同时访问，产生错误。

### 多核编程

​	无论是多个计算核在多个 CPU 芯片上，还是多个计算核在单个 CPU 芯片上，我们都称之为**多核**或者是**多处理器**系统。

​	并行和并发有所不同。并行指的是同时执行多个任务，而并发则是支持多个任务甚至是所有的任务都可以取得进展。并行一定是并发，并发不一定是并行。

#### 编程挑战

<img src="./assets/image-20251021145426968.png" alt="image-20251021145426968" style="zoom:33%;" />

#### 并行类型

<img src="./assets/image-20251021145611434.png" alt="image-20251021145611434" style="zoom:33%;" />

<img src="./assets/image-20251021145627917.png" alt="image-20251021145627917" style="zoom:33%;" />

​	并行分为两种：

* 数据并行：数据分到不同的核上，任务操作相同
* 任务并行：不同任务分到不同核上

### Multithreading Models

​	有两种不同方法来提供线程支持：User Threads 和 Kernal Threads，介绍分别如下：

* User Threads:
  * ==Thread management done by user-level threads library==
  * Three primary thread libraries: 
    * POSIX Pthreads (can also be provided as system library) 
    * Win32 threads 
    * Java threads
* Kernal Threads:
  * ==Supported by the Kernel==
  * Almost all contemporary OS implements kernel threads. Examples
    * Windows XP/2000
    * Solaris
    * Linux
    * MacOS

​	总结下如下：

| 比较维度          | 用户线程（User Threads）                      | 内核线程（Kernel Threads）                            |
| ----------------- | --------------------------------------------- | ----------------------------------------------------- |
| **管理者**        | 由用户级线程库管理，如 Pthreads、Java Threads | 由操作系统内核直接管理                                |
| **运行环境**      | 用户态                                        | 内核态                                                |
| **创建/切换开销** | 小，线程切换不需要进入内核                    | 大，线程切换涉及用户态与内核态转换                    |
| **并发能力**      | 受限，无法充分利用多核 CPU                    | 强，可在多核 CPU 上并行执行                           |
| **阻塞影响**      | 一个线程阻塞会导致整个进程阻塞                | 一个线程阻塞不会影响其他线程                          |
| **可见性**        | 操作系统不可见，只在进程内部可见              | 操作系统可见，可被调度器调度                          |
| **调试难度**      | 较高，操作系统无法直接跟踪                    | 较低，系统工具可直接监控                              |
| **适用场景**      | 轻量级任务、需要快速切换的应用                | 多核并行、高性能计算、系统服务                        |
| **示例系统支持**  | Java虚拟机、某些轻量级线程库                  | Windows XP/2000、Linux、Solaris、MacOS 等现代操作系统 |

​	用户线程和内核线程之间一定存在着某种关系，我们研究常用的建立这种关系的方法：==Many-to-One、One-to-One、Many-to-Many。==

#### Many-to-One

* Many user-level threads mapped to single kernel thread
* The scheduling is done completely by the thread library and ==the kernel itself is not aware of the multiple threads== in user-space.
* Examples: 
  * Solaris Green Threads
  * GNU Portable Threads

<img src="./assets/image-20251021151109161.png" alt="image-20251021151109161" style="zoom:33%;" />

<img src="./assets/image-20251021151135849.png" alt="image-20251021151135849" style="zoom:33%;" />

* 是==多个==用户级线程映射到==一个==内核线程上，内核并不知道用户层有多线程

#### One-to-One

* Each user-level thread maps to kernel thread
* Examples
  * Windows NT/XP/2000
  * Linux
  * Solaris 9 and later

<img src="./assets/image-20251021151303724.png" alt="image-20251021151303724" style="zoom:33%;" />

<img src="./assets/image-20251021151231103.png" alt="image-20251021151231103" style="zoom:33%;" />

#### Many-to-Many Model

* Allows many user level threads to be mapped to many kernel threads
* Allows the  operating system to create a sufficient number of kernel threads
* A program can have as many threads as are appropriate without making the process too heavy or burdensome. In this model, a user-level threads library provides sophisticated scheduling of user-level threads above kernel threads.
* Solaris prior to version 9
* Windows NT/2000 with the ThreadFiber package
* Go routines

<img src="./assets/image-20251021151519028.png" alt="image-20251021151519028" style="zoom:33%;" />

<img src="./assets/image-20251021151531579.png" alt="image-20251021151531579" style="zoom:33%;" />

<img src="./assets/image-20251021151556692.png" alt="image-20251021151556692" style="zoom:33%;" />

#### Two-level Model

* Similar to M:M, except that it allows a user thread to be bound to a kernel thread
* Examples
  * IRIX
  * HP-UXTru64 
  * UNIX
  * Solaris 8 and earlier

<img src="./assets/image-20251021151647221.png" alt="image-20251021151647221" style="zoom:33%;" />

### Threading Issuses

#### fork() and exec()

* 当某个进程调用 fork() 的时候，要么新进程复制所有的线程，要么仅仅复制了调用了系统调用 fork() 的线程。
* 但是，当 fork() 后面跟着 exec()，那么就不是这么一回事了。因为 exec() 参数指定的程序会取代整个进程（子进程的），在这种情况下，仅仅复制调用线程比较合适。
  * 仅仅只复制调用了系统调用 fork() 的线程的话，exec()时只需要销毁一个线程；但要是新进程复制所有的线程，那就需要销毁掉所有的线程，再加载新进程，这种方式的开销过大。

* 不过，若是分叉后不调用 exec()，那么新进程还是应该重复所有的线程。

### Thread Cancellation

* Terminating a thread before it has finished
* 线程撤销指的是在线程完成之前中止线程
* 我们称需要撤销的线程为目标线程（target thread）
* Two general approaches:
  * Asynchronous cancellation terminates the target thread  ==immediately==
  * Deferred cancellation allows the target thread to periodically check via a flag if it should be cancelled
  * 延迟撤销。==目标线程不断检查他是否应终止==，这允许目标线程有机会有序终止自己。

![image-20251028182339234](./assets/image-20251028182339234.png)

<img src="./assets/image-20251028182407782.png" alt="image-20251028182407782" style="zoom:50%;" />

​	下方的`pthread_join(tid, NULL)`有点类似于之前讲过的`wait`操作。

![image-20251028182620788](./assets/image-20251028182620788.png)

#### Thread Pools

​	创建一个线程，需要一定的系统开销（比如 CPU 时间和内存）。若是对于所有的请求，如果我们都采用创建线程，运行结束后再销毁的方法，那么显而易见的，系统的开销回很大。

​	为了解决这样的问题，可以使用==线程池==。它的思想是在进程开始的时候就创建一定数量的线程，并加到池子里空转，等待工作。当需要的时候就取出来，运行完再放回去。

* Advantages:
  * Usually slightly faster to service a request with an existing thread than create a new thread
  * Allows the number of threads in the application(s) to be bound to the size of the pool
  * 线程池限制了任何时候可用线程的数量。这对那些不能支持大量并发线程的系统非常重要

