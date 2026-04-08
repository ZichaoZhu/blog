# Lec7: Deadlocks

![NotebookLM Mind Map (7)](./assets/NotebookLM Mind Map (7).png)

## The Deadlock Problem

* A set of blocked processes each holding a resource and waiting to acquire a resource held by another process in the set.
* Example 
  * System has 2 disk drives.
  * P1 and P2 each hold one disk drive and each needs another one.
* Example semaphores A and B, initialized to 1     
  * P0		   	   P1   
  * wait (A);		wait(B)   
  * wait (B);		wait(A)

## System Model

* Resource types $R_1, R_2, . . ., R_m$
  * *CPU cycles, memory space, I/O devices*
* 资源有不同的种类，分别记为$R_1, R_2, . . ., R_m$。这可以分别是*CPU cycles, memory space, I/O devices*
* Each resource type $R_i$ has $W_i$ instances.
* 假设每一种资源$R_i$有$W_i$个资源
* Each process utilizes a resource as follows:
  * request 
  * use 
  * release
* 每个进程可以使用`request`、`use`、`release`三种方法使用资源

## Deadlock Characterization

​	Deadlock can arise if four conditions hold ==simultaneously==（同时地）.

* **Mutual exclusion**:  only one process at a time can use a resource.
  * 互斥

* **Hold and wait**:  a process holding at least one resource is waiting to acquire additional resources held by other processes.
  * 一定存在一个进程**当前至少持有一个**资源，并且正在**等待获取**额外的资源，而这些额外的资源正被其他进程所持有。

* **No preemption**:  a resource can be released only voluntarily by the process holding it, after that process has completed its task.
  * 非抢占式的

* **Circular wait**:  there exists a set $\{P_0, P_1, …, P_n\}$ of ==waiting processes== such that $P_0$ is waiting for a resource that is held by $P_1$, $P_1$ is waiting for a resource that is held by $P_2, …, P_{n–1}$ is waiting for a resource that is held by $P_n$, and $P_n$ is waiting for a resource that is held by $P_0$.
  * 循环等待


​	只有上面四个条件同时成立时才会出现死锁。

### Resource-Allocation Graph

​	A set of vertices V and a set of edges E.

* V is partitioned into two types:
  * $P = \{P_1, P_2, …, P_n\}$, the set consisting of all the processes in the system.
  * $R = \{R_1, R_2, …, R_m\}$, the set consisting of all resource types in the system.
* request edge – directed edge $P_i \rightarrow R_j$
* 代表进程$P_i$==等待==资源类型$R_j$的一个实例
* assignment edge – directed edge $R_j \rightarrow P_i$
* 代表进程$P_i$==占有==资源类型$R_j$的一个实例

​	画图如下所示：

<img src="./assets/image-20260101110754553.png" alt="image-20260101110754553" style="zoom:33%;" />	

> Ex1:
>
> <img src="./assets/image-20251218105150728.png" alt="image-20251218105150728" style="zoom:50%;" />
>
> 这种情况下不存在死锁。
>
> Ex2:
>
> ![image-20251218105458751](./assets/image-20251218105458751.png)
>
> 这种情况是死锁的。$P_1,P_2,P_3$形成了环路。
>
> Ex3:
>
> ![image-20251218105514172](./assets/image-20251218105514172.png)
>
> 这种情况不是死锁的。

### Basic Facts

* If graph contains no cycles $\Rightarrow$ no deadlock.
* If graph contains a cycle $\Rightarrow$
  * if only one instance per resource type, then deadlock.
  * if several instances per resource type, possibility of deadlock.
  * 也就是说，形成了 circle，系统也不一定会死锁

## Methods for Handling Deadlocks

​	一般而言，处理死锁问题有三种方法：

* Ensure that the system will never enter a deadlock state.
  * 确保系统不会进入死锁

* Allow the system to enter a deadlock state and then recover.
  * 允许进入死锁，然后检测并加以恢复

* Ignore the problem and pretend that deadlocks never occur in the system; u==sed by most operating systems, including UNIX==.
  * 忽视死锁问题，认为死锁不会在系统中发生
  * 实现复杂的死锁预防或避免算法（如银行家算法）需要大量的代码和系统开销。而且如果系统在每一次资源分配时都运行检测算法，会严重拖慢 CPU 的处理速度。
  * 一般而言，这种方法将死锁交给应用程序以及程序员来解决。


### Deadlock Prevention

​	==一个进程永远都不会进入死锁==

​	Restrain the ways request can be made.

​	死锁预防方法确保==至少有一个必要条件不成立==。这些方法通过限制如何申请资源的方法来预防死锁

* **Mutual Exclusion** – not required for sharable resources; must hold for nonsharable resources.
  * 互斥条件必须成立，因为总是有资源是非共享的。

* **Hold and Wait** – must guarantee that whenever a process requests a resource, it does not hold any other resources.
  * 应确保当每一个进程申请一个资源的时候，它不能抢占其他资源
  * Require process to request and be allocated all its resources before it begins execution, or allow process to request resources only when the process has none (release all current resources before requesting any additional ones).
  * 一种方法是每个进程执行前申请并获得所有资源；
  * 另一种方法是允许进程仅在没有资源的时候才可以申请资源，一个进程可申请一些资源并使用，但是，在申请更多资源前，应该释放现在已经分配的所有资源。
  * Low resource utilization; starvation possible. (example: copy data from DVD drive to a disk file, sorts the file, then prints the results to a printer.)
  * 两个缺点：
    * 资源利用率较低
    * 可能发生饥饿

* No Preemption –
  * If a process that is holding some resources requests another resource that cannot be immediately allocated to it, ==then all resources currently being held are released==.
  * Preempted resources are added to the list of resources for which the process is waiting.
  * Process will be restarted only when it can regain its old resources, as well as the new ones that it is requesting.
  * 可能会导致重复的 request，导致系统效率低下 
* Circular Wait – impose a total ordering of all resource types, and require that each process requests resources in an increasing order of enumeration. (page 255)
  * F(tape drive)=1
  * F(disk drive)=5
  * F(printer)=12
  * 可以给资源编号，并按照编号分配资源来避免死锁
    * 证明（反证法）：
    * ![image-20251218113640575](./assets/image-20251218113640575.png)
  *  很多时候是做不到按照编号分配资源的

### Deadlock Avoidance

​	==死锁可能会发生，但是通过分配资源使得死锁不会真正发生==

​	Requires that the system has some additional a priori information available.

* Simplest and most useful model requires that each process declares the ==maximum number== of resources of each type that it may need.
* 每个进程都应该声明可能需要的每种类型资源的最大数量
* The ==deadlock-avoidance algorithm== ==dynamically== examines the resource-allocation state to ensure that there can never be a circular-wait condition.
* Resource-allocation state is defined by the number of available and allocated resources, and the maximum demands of the processes.

#### Safe State

* When a process requests an available resource, system must decide if immediate allocation leaves the system in a safe state.
* System is in ==safe state== if there exists a sequence $<P_1, P_2, …, P_n>$ of ALL the  processes such that  for each Pi, the resources that Pi can still request can be satisfied by currently available resources + resources held by all the Pj, with j < i.
* That is:
  * If $P_i$ resource needs are not immediately available, then $P_i$ can wait until all $P_j$ have finished.
  * When $P_j$ is finished, $P_i$ can obtain needed resources, execute, return allocated resources, and terminate. 
  * When $P_i$ terminates, $P_{i +1}$ can obtain its needed resources, and so on. 

![image-20251218115506265](./assets/image-20251218115506265.png)

* 安全状态下，操作系统就能避免死锁
* 但在非安全状态下，操作系统可能会导致死锁
  * 实际上，unsafe 意味着在系统进行某些进程操作后，会引发死锁 


![image-20251218115552141](./assets/image-20251218115552141.png)

​	这里需要注意的是，==An unsafe state implies that some unfortunate sequence of events mightlead to a deadlock==。反过来说，==unsafe 的状态有时候并不会导致死锁的发生==。若是一个进程在执行的过程中发现自己其实并不需要自己声明的那么多的资源（比如，只要一半），从而解决死锁。

#### Avoidance algorithms

* Single instance of a resource type.  Use a resource-allocation graph
* Multiple instances of a resource type.  Use the banker’s algorithm

##### Resource-Allocation Graph Scheme

* Claim edge $P_i \rightarrow R_j$ indicated that process $P_i$ may request resource $R_j$; represented by a dashed line.
* Claim edge converts to request edge when a process requests a resource.
* Request edge converted to an assignment edge when the  resource is allocated to the process.
* When a resource is released by a process, assignment edge reconverts to a claim edge.
* Resources must be claimed a priori in the system.

​	也就是我们多了一种边，叫做共享边，一般写成$P_i \rightarrow R_j$，代表$P_i$可能需要使用$R_j$类型的实例。

<img src="./assets/image-20251219201959497.png" alt="image-20251219201959497" style="zoom:33%;" />

​	需要注意的是，这里每种的实例有只有一个。

| **状态**   | **边的类型**        | **视觉表示**                 | **含义**                                   |
| ---------- | ------------------- | ---------------------------- | ------------------------------------------ |
| **未来**   | 需求边 (Claim)      | $P \dashrightarrow R$ (虚线) | 以后可能会要                               |
| **申请中** | 请求边 (Request)    | $P \rightarrow R$ (实线)     | 现在立刻要                                 |
| **已占用** | 分配边 (Assignment) | $R \rightarrow P$ (实线)     | 资源正在被该进程使用，由请求边箭头反转得来 |

##### Banker's Algorithm

​	Assumptions: 

* Multiple instances.
* Each process must a priori claim maximum use.
* When a process requests a resource it may have to wait.  
* When a process gets all its resources it must return them in a finite amount of time.

​	为了实现这个算法，我们需要一些数据结构：

* ==Available==:  Vector of length m. If available[j] = k, there are k instances of resource type Rj  available.
  * 当前==系统中==每种资源类型还剩多少可用实例

* ==Max==: n x m matrix.  If Max [i,j] = k, then process Pi may request at most k instances of resource type Rj.
  * ==每个进程==最多可能==请求==的资源数量

* ==Allocation==:  n x m matrix.  If Allocation[i,j] = k then Pi is currently allocated k instances of Rj.
  * 当前==已经分配==给每个进程的资源数量

* ==Need==:  n x m matrix. If Need[i,j] = k, then Pi may need k more instances of Rj to complete its task.Need [i,j] = Max[i,j] – Allocation [i,j].
  * 每个进程==还需要==多少资源才能完成任务


​	具体的算法如下：

###### Safety Algorithm

![image-20251219204418996](./assets/image-20251219204418996.png)

​	这个算法的思路是，让 Work = 当前系统中每种类型的资源还剩多少可用实例，并使用 Finish[] 数组记录每个进程是否结束。

​	我们需要寻找这样的进程：未完成（Finish[i] = false）以及当前还需要的资源数量（Needi）少于当前系统的剩余数量（Work）（这里是向量的比较，需要每一个量都小于），在这种情况下，我们可以分配资源给这个进程使用，并等待期结束释放资源，也就是`Work = Work + Allocationi`（向量加法）。

​	注意，这里的 Work、Allocationi 等为一维向量，代表不同资源的实例数。

###### Resource-Request Algorithm for Process Pi

![image-20251219204432542](./assets/image-20251219204432542.png)

​	这个算法和上面的类似，不再赘述。

> 例题
>
> ![image-20251219212414764](./assets/image-20251219212414764.png)
>
> 答案是3

### Deadlock Detection

​	与上面的 Deadlock Prevention 不同（直接防止进程进入 Deadlock），Deadlock Detection ==允许系统进入死锁状态==，并设计了 Dection algorithm 来检测死锁，并设置了恢复机制 Recovery schema 来进行恢复。

​	关键词：

* Allow system to enter deadlock state 
* Detection algorithm
* Recovery scheme

#### Single Instance of Each Resource Type

* Maintain wait-for graph
  * Nodes are processes.
  * $P_i \rightarrow P_j$   if $P_i$ is waiting for $P_j$.
  * $P_i \rightarrow P_j$  的意思是 ==$P_i$ 等待 $P_j$ 的所占有的资源==
  * ![image-20251225151803009](./assets/image-20251225151803009.png)
* Periodically invoke an algorithm that searches for a cycle in the graph. If there is a cycle, there exists a deadlock.
* An algorithm to detect a cycle in a graph requires an order of $n^2$ operations, where $n$ is the number of vertices in the graph.

#### Several Instances of a Resource Type

​	等待图方案不适用于每种资源类型可有多个实例的资源分配系统。下面描述的死锁检测算法适用于这样的系统。该算法适用了一些随时间变化的数据结构，类似于银行家算法：

![image-20251225152058196](./assets/image-20251225152058196.png)

​	具体算法如下：

<img src="./assets/image-20251225152633695.png" alt="image-20251225152633695" style="zoom: 50%;" />

<img src="./assets/image-20251225152641025.png" alt="image-20251225152641025" style="zoom:50%;" />

#### Detection-Algorithm Usage

* When, and how often, to invoke depends on:
  * How often a deadlock is likely to occur?
  * How many processes will need to be rolled back?
    * one for each disjoint cycle
* If detection algorithm is invoked arbitrarily, there may be many cycles in the resource graph and so we would not be able to tell which of the many deadlocked processes “caused” the deadlock.

#### Recovery from Deadlock:  Process Termination

​	有两种基本的终止策略：

* Abort all deadlocked processes.
  * 第一种是杀死所有的进程
* Abort one process at a time until the deadlock cycle is eliminated.
  * 第二种是一次杀死一个进程
* In which order should we choose to abort?
  * Priority of the process.
    * 保留高优先级的，先杀死低优先级的
  * How long process has computed, and how much longer to completion.
    * 若一个进程开始了很久了，杀掉它代价太大；若一个进程刚开始没多久，杀掉它代价很小。
  * Resources the process has used.
    * 如果一个进程占用了大量昂贵或关键资源，杀掉它能释放更多资源给别人。
  * Resources process needs to complete.
    * 如果一个进程接下来还需要海量资源才能跑完，它很可能是导致死锁的风险源。
  * How many processes will need to be terminated. 
    * 我们希望以最少的进程牺牲来换取系统的恢复。
  * Is process interactive or batch?
    * **交互式 (Interactive)：** 比如用户正在使用的 Word，杀了会直接影响用户体验。
    * **批处理 (Batch)：** 比如后台自动备份，杀了用户可能感知不到，以后再重跑即可。
