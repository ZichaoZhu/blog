---
title: "Lec2: Lexical Analysisx"
date: "2026-03-06"
description: "​	编译器分为前端和后端： * 前端（Analysis）"
tags: ["编译原理","课程笔记","计算机科学"]
category: "编译原理"
author: "zhuzichao"
draft: false
---

# Lec2: Lexical Analysisx

## Compiling Process

​	编译器分为前端和后端：

* 前端（Analysis）
  - Lexical Analysis: breaking the input into individual words or =="tokens"==;
  - Syntax Analysis: parsing the ==phrase structure== of the program; 
  - Semantic Analysis: calculating the program's meaning.
* 后端（Synthesis）

| 阶段 |             内容 |
| ---- | ---------------: |
| 前端 |      源代码 → IR |
| 后端 | IR → 汇编/机器码 |

## Task of lexical analyzer

![image-20260303103527279](./assets/image-20260303103527279.png)

* 输入：字符流（stream of characters）
* 输出：token 流（stream of tokens）

​	例如：

```C
float match0(char *s)
```

​	会被转换为：

```C
FLOAT ID(match0) LPAREN CHAR STAR ID(s) RPAREN ...
```

## Lexical Token

* token: 
  * 是字符的一个序列
  * 是语法中的一个基本单位
  * 有有限种 token 类型

​	常见 token 类型：

| 类型   |     示例     |
| :----- | :----------: |
| ID     |   foo, n14   |
| NUM    |   73, 082    |
| REAL   | 1.2, 5.5e-10 |
| IF     |      if      |
| COMMA  |      ,       |
| NOTEQ  |      !=      |
| LPAREN |      (       |

* Reserved words: 不会用于 identifiers。例如：IF, VOID, RETURN

​	非 token 例子：

| 类型                        |        示例        |
| :-------------------------- | :----------------: |
| comment                     |  /* try again */   |
| preprocessor directive      | `#include<stdio.h>` |
| preprocessor directive      | `#define NUMS 5, 6` |
| macro                       |        NUMS        |
| blanks, tabs, and new-lines |                    |

* The preprocessor deletes the non-tokens
  * Operates on the source character stream
  * Producing another character stream to the lexical analyzer
* 预处理器先处理字符流，再交给词法分析器。

## How to implement a lexical analyzer

### 词法规则（英文描述示例）

![image-20260303104833367](./assets/image-20260303104833367.png)

### Implementation

* 四种方法：
  * An ad hoc lexer: 手写 lexer
  * Regular expressions: 描述 lexer
  * Deterministic finite automata: 实现 lexer
  * Mathematics: 结合 RE 和 DFA

$$
\text{Lexical Token Description}
\xrightarrow{\text{Manually}}
\text{RE}
\xrightarrow{\text{?}}
\text{DFA}
\xrightarrow{\text{Table-Driven Implementation}}
\text{Lexer}
$$

## Regular Expression

* A ==language== is a set of strings
* A ==string== is a finite sequence of symbols
* A ==symbol== is taken from a finite alphabet

### 基础元素

| 形式 | 含义   |
| ---- | ------ |
| a    | 字符 a |
| ε    | 空串   |

### 运算

* $M \mid N:L(M \mid N) = \{ s \mid s \in L(M) \; or \; s \in L(N) \}$
* $M \cdot N:L(M \cdot N) = \{\, st \mid s \in L(M),\; t \in L(N) \,\}$
* $M*$，Kleene closure

​	常见符号：

| 表达式 | 含义         |
| ------ | ------------ |
| M+     | M 至少一次   |
| M?     | 0或1次       |
| [abc]  | a \| b \| c  |
| [a-z]  | 字符范围     |
| .      | 任意字符     |
| "abc"  | 字符串字面量 |

### Regular Expressions for Tokens

![image-20260303111022753](./assets/image-20260303111022753.png)

### Disambiguation rules

​	有时规则匹配会有歧义冲突，有两种方式解决：

* Longest Match（最长匹配）：
  * 匹配最长可能字符串。
  * `if8` 匹配为 ID 而不是 IF + NUM
* Rule Priority（规则优先级）：
  * 若长度相同，优先匹配先写的规则
  * `if` 匹配为 IF 而不是 ID

## Finite Automata

* DFA 包含：
  * 有限状态集合
  * 唯一开始状态
  * 若干终止状态
  * 每个状态对每个字符只有一个转移
* 接受规则
  - 从开始状态出发
  - 逐字符转移
  - 最终落在终止状态 → 接受

![image-20260303111939210](./assets/image-20260303111939210.png)

### 多个 DFA 合并

* 多个 token 自动机合并为一个大自动机：
  * 所有表达式的起点合并
  * 每个终态标记 token 类型

​	例如：

![image-20260303152553266](./assets/image-20260303152553266.png)

![image-20260303152612668](./assets/image-20260303152612668.png)

* 冲突时：
  * 采用最长匹配
  * 再按规则优先级

​	例如在遇到 `if` 时：

![image-20260303152709491](./assets/image-20260303152709491.png)

### Transition matrix

​	可以对 DFA 进行编码：

```C
int edges[state][character];
int final[state];
```

​	`final[state]` 将 state numbers 映射至 actions，而 `edges[state][character]` 表示 DFA 的转移，如下：

![image-20260303152938927](./assets/image-20260303152938927.png)

### Recognizing the longest match

* 使用两个变量：
  * LastFinal
  * InputPositionAtLastFinal
* 当进入死状态时：
  * 回退到 last final
  * 输出 token

​	使用以下标志符：

* |：input position
* ⊥: automaton position
* T: Input position at last final

​	展示一个示例：

```C
if --not-a-com
```

​	过程如下：

![image-20260303160912398](./assets/image-20260303160912398.png)

## NFA

​	DFA 的构造有些困难，可以考虑使用 NFA：
$$
\text{Description of lexical tokens (in natural language or in mind)}
\xrightarrow{\text{Manually}}
\text{RE}
\xrightarrow{\text{Thompson's Construction}}
\text{NFA}
\xrightarrow{\text{Subset Construction, DFA Minimization}}
\text{Deterministic Finite Automata}
\xrightarrow{\text{e.g., Table-Driven Implementation}}
\text{Lexer}
$$

### NFA 定义

* 同一字符可能有多条边
* 可以有 ε 边（不消耗输入）
* 接受规则：只要有一条路径能到终态就接受
