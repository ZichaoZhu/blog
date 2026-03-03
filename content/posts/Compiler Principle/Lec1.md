# **Introduction**

## 编译器

1. 什么是编译器：编译器实际上就是一个可以将一个语言（source language）转化成另一个语言（target language）的程序（equivalent program）。

![image-20260302141910891](./assets/image-20260302141910891.png)

## Modules and Interfaces: Overview

![image-20260302142201915](./assets/image-20260302142201915.png)

* 两个重要概念：
  * Phases：one or more modules operating on the different abstract “languages” during compiling process
    * 每一个阶段中，处理一种表示形式，输出另一种表示形式，相当于在不同“语言层次”之间转换。
  * Interfaces：Describe the information exchanged between modules of the compiler
    * 编译器各个阶段之间传递的信息格式
    * 上一个阶段的输出，必须符合下一个阶段的输入格式

### Phases

​	Phase 指的是编译过程中的一个“工作步骤”，比如如下所示：

| Phase                 | Description                                               |
| --------------------- | --------------------------------------------------------- |
| Lex                   | Break source file into tokens                             |
| Parse                 | Analyze the phrase structure of the program               |
| Parsing Actions       | Build abstract syntax tree (AST) for each phrase          |
| Semantic Analysis     | Determine meaning; check types; resolve variable bindings |
| Frame Layout          | Organize variables and parameters into stack frames       |
| Translate             | Produce intermediate representation (IR trees)            |
| Canonicalize          | Simplify IR; hoist side effects; clean conditionals       |
| Instruction Selection | Map IR nodes to target machine instructions               |
| Control Flow Analysis | Build control flow graph (CFG)                            |
| Dataflow Analysis     | Analyze flow of values (e.g., liveness analysis)          |
| Register Allocation   | Assign variables to machine registers                     |
| Code Emission         | Generate final assembly code                              |

### Modularization

* Several modules maybe combined into one phase
* 有些模块会被整合在一个阶段中
* Simple compilers may omit the Control Flow Analysis, Data Flow Analysis, and Register Allocation phases
* 简单的编译器会省略 CFA、DFA、RA 这些优化阶段

### Interfaces

​	Interfaces 指的是 phases 之间如何交换数据。比如 Phase 拿到 token：

```C
Token getNextToken();
```

## Tools and Software

​	有两种非常有用的概念供我们使用：

* Regular expression: for lexical analysis
* Context-free grammers: for parsing

​	相应的，有两个工具供使用，来进行编译：

* **Lex** converts a declarative specification into a lexical analysis program
* **Yacc** converts a grammar into a parsing program
