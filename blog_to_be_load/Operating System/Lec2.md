# Operating-System Structures

## Operation System Services

​	以下图片展示了操作系统所能提供的服务：

![image-20250928140236105](./assets/image-20250928140236105.png)

​	对于==用户==来说，操作系统可以提供一系列的服务：

*  User Interface：基本上所有的操作系统都有用户界面。
  * 多种方式：命令行界面（CLI）、批处理界面（Batch Interface）、图形用户界面（GUI）
* Program Execution：系统应能加载程序到内存，并加以运行。程序应能结束执行，包括正常和不正常。
* I/O 操作：为了安全，用户一般不控制 I/O
* File system manipulation：文件操作
* Conmunications：
  * （同一/不同）电脑的进程与进程之间交换信息
  * 实现：
    * Shared memory
    * Message Passing
*  Error detection：

​	Another set of OS functions exists for ensuring the efficient operation of the ==system itself== via resource sharing

*  Resource allocation：
*  Accounting：
  * 需要记录用户所用资源类型以及数量
*  Protection and security：

## System calls

<img src="./assets/image-20250928141607903.png" alt="image-20250928141607903" style="zoom:30%;" />

* 相对于繁琐的系统调用，程序员们更喜欢使用 API。而对于绝大多数程序设计语言来说，运行时支持系统提供了系统调用接口（System-call Interface）。
* 在调用的时候，我们有一个参数，叫做 System-call number，我们使用这个参数确定我们要使用哪个 System-call。
  * 有两种传参的方式，一种是使用 register；另一种针对参数较多的情况，在 System-call 之前在内存中开辟一段空间，将参数放入这个空间中。
    * 我们知道，对于 user mode 和 kenel mode 来说，它们对 memory 的视角是非常不一样的。
      * <img src="./assets/image-20250928145657205.png" alt="image-20250928145657205" style="zoom:50%;" />

## System Programs

​	让我们回顾一下计算机的逻辑层次：硬件-->操作系统-->系统程序-->应用程序。系统程序（System Program）也被称为系统工具（System Utility），为程序开发和执行提供了一个方便的环境。有些系统程序只是系统调用的简单用户接口，而其他的可能相当复杂。

​	系统程序可分为以下几类：

<img src="./assets/image-20250928150920161.png" alt="image-20250928150920161" style="zoom:33%;" />

## OS design and implementation

### Two goals

* User goals – operating system should be ==convenient== to use, easy to learn, reliable, safe, and fast
* System goals – operating system should be easy to design, implement, and maintain, as well as flexible, reliable, error-free, and efficient

### Policy and Mechanism

* Policy:   What will be done? 策略（确定具体做什么事）
  *  它是在拥有机制的基础上，
  *  决定**如何使用这些工具**的具体**规则或决策**
* Mechanism:  How to do it? 机制（定义做事方式）
  * 机制通常是比较**固定且通用**的。
  * 它不关心具体的业务逻辑，只负责提供“能力”
  * 策略应该是**灵活且易变**的。
  * 不同的环境下，我们可以制定不同的策略，
  * 而不需要更换底层的机制


## OS Structure

### Simple Structure（MS-DOS）

* MS-DOS – written to provide the most functionality in the least space
* Not divided into modules
* Although MS-DOS has some structure, its interfaces and levels of functionality are not well separated

<img src="./assets/image-20250928160613979.png" alt="image-20250928160613979" style="zoom:50%;" />

### Layered Approach

* The operating system is divided into a number of layers (levels), each built on top of lower layers.  The bottom layer (layer 0), is the hardware; the highest (layer N) is the user interface.
* With modularity, layers are selected such that each uses functions (operations) and services of only lower-level layers

<img src="./assets/image-20250928160746191.png" alt="image-20250928160746191" style="zoom:33%;" />

​	一个经典的案例就是 Unix，其结构如下：

<img src="./assets/image-20250928160901651.png" alt="image-20250928160901651" style="zoom:30%;" />

​	Unix 操作系统包含了两个部分：

1. System programs
2. The kernel
   1. Consists of everything below the system-call interface and above the physical hardware
   2. Provides the file system, CPU scheduling, memory management, and other operating-system functions; a large number of functions for one level

### Microkernel System Structure 

​	上面我们看到的都是巨核（Monolithic）操作系统，意思是它们的 Kernel 层都很大。Microkernel System Structure 做出了一系列更新：

* Moves as much from the kernel into “user” space
* Communication takes place between user modules using message passing
* Benefits:
  * Easier to extend a microkernel
  * Easier to port the operating system to new architectures
  * More reliable (less code is running in kernel mode)
  * More secure
* Detriments:
  * Performance overhead of user space to kernel space communication

​	以下是一个示例：

<img src="./assets/image-20250928161333821.png" alt="image-20250928161333821" style="zoom:30%;" />

​	一个现实中的例子就是 Mac OS X 的结构：

<img src="./assets/image-20250928161415709.png" alt="image-20250928161415709" style="zoom:33%;" />

<img src="./assets/image-20250928161430850.png" alt="image-20250928161430850" style="zoom:33%;" />

### Modules

* Most modern operating systems implement kernel modules
  * Uses object-oriented approach
  * Each core component is separate
  * Each talks to the others over known interfaces
    * Modules call each other instead of message passing
  * Each is loadable as needed within the kernel
* Overall, similar to layers but more flexible

<img src="./assets/image-20250928163957565.png" alt="image-20250928163957565" style="zoom:33%;" />

### Other Structure

#### Exokernel

<img src="./assets/image-20250928164101531.png" alt="image-20250928164101531" style="zoom:30%;" />

## Virtual Machine

* A virtual machine takes the layered approach to its logical conclusion.  It ==treats hardware and the operating system kernel as though they were all hardware==
* A virtual machine ==provides an interface identical to the underlying bare hardware==
* The operating system creates the illusion of multiple processes, each executing on its own processor with its own (virtual) memory

* The resources of the physical computer are ==shared== to create the virtual machines
  * CPU scheduling can create the appearance that users have their own processor
  * Spooling and a file system can provide virtual card readers and virtual line printers
  * A normal user time-sharing terminal serves as the virtual machine operator’s console

<img src="./assets/image-20250928164546957.png" alt="image-20250928164546957" style="zoom:33%;" />

* The virtual-machine concept provides complete protection of system resources since each virtual machine is isolated from all other virtual machines.  This isolation, however, permits no direct sharing of resources.
  * 每台虚拟机与其他虚拟机都是相互隔离独立的
* A virtual-machine system is a perfect vehicle for operating-systems research and development.  System development is done on the virtual machine, instead of on a physical machine and so does not disrupt normal system operation.
  * 虚拟机对开发操作系统很友好
* The virtual machine concept is difficult to implement due to the effort required to provide an exact duplicate to the underlying machine. (for example, virtual user mode and kernel mode)
  * 

​	VMM/Hypervisor 有两种：

* Type 1 Hypervisor：Bare-Metal Hypervisor
  * <img src="./assets/image-20250930143425857.png" alt="image-20250930143425857" style="zoom:33%;" />

* Type 2 Hypervisor：
  * <img src="./assets/image-20250930143444211.png" alt="image-20250930143444211" style="zoom:33%;" />
* Paravirtualization：
  * <img src="./assets/image-20250930161012743.png" alt="image-20250930161012743" style="zoom:33%;" />



<img src="./assets/image-20250928165254493.png" alt="image-20250928165254493" style="zoom:33%;" />

## Operating System Generation

​	在刚开机的时候，我们需要从磁盘中调用操作系统，生成操作系统。

* Operating systems are designed to run on any of a class of machines; the system must be configured for each specific computer site
* SYSGEN program obtains information concerning the specific configuration of the hardware system
* Booting – starting a computer by loading the kernel
* Bootstrap program – code stored in ROM that is able to locate the kernel, load it into memory, and start its execution

​	例子有 lab1 中的 OpenSBI。

## System Boot

* Operating system must be made available to hardware so hardware can start it
  * Small piece of code – bootstrap program (a.k.a. bootstrap loader), locates the kernel, loads it into memory, and starts it
  * Sometimes two-step process where boot block at fixed location loads bootstrap loader
  * When power initialized on system, execution starts at a fixed memory location
* ==Firmware used to hold initial boot code，and test basic hardware components==
* Boot loader：找到 Kernel 并加载到内存中，以此来启动操作系统

例如：OpenSBI 放在 0x80000000，用于启动 kernel。 
