---
id: "compiler-principles-lec11"
slug: "compiler-principles-lec11"
title: "Lec11: 寄存器分配"
description: "用图染色分配有限寄存器，理解简化、溢出、合并与迭代寄存器分配。"
contentKind: "note"
type: "course"
topics: ["compilers"]
visibility: "published"
author: "Goongmly"
course: {"id":"compiler-principles","order":11}
tags: ["编译原理","课程笔记","计算机科学"]
category: "编译原理"
---

## 第 11 章关注什么？

第 10 章用活跃性分析得到了 **冲突图（interference graph）**：

- 图中的节点是 temporary（临时变量）。
- 如果两个 temporary 不能放在同一个寄存器里，就在它们之间连一条边。

第 11 章接着问：

> **如何把很多 temporary 分配到有限的 K 个真实机器寄存器里？**

答案是：把寄存器分配问题近似成 **graph coloring（图染色）** 问题。

```mermaid
flowchart LR
    A[抽象汇编<br/>很多 temporaries] --> B[活跃性分析]
    B --> C[冲突图]
    C --> D[图染色<br/>K 种颜色 = K 个寄存器]
    D --> E[寄存器分配结果]
    E --> F[真实汇编]
```

第 11 章的核心内容：

1. **通过简化染色**：用近似算法给冲突图染色。
2. **Spilling（溢出）**：寄存器不够时，把某些 temporary 放到内存。
3. **Coalescing（合并）**：消除不必要的 move 指令。
4. **Precolored nodes（预着色节点）**：处理已经绑定真实寄存器的特殊节点。

---

## 我们在哪里？

```text
源代码
    |
    | 词法分析 / 语法分析 / 语义分析
    v
IR
    |
    | 第 8 章：规范化
    v
规范 IR
    |
    | 第 9 章：指令选择
    v
抽象汇编
    |
    | 第 10 章：活跃性分析
    v
冲突图
    |
    | 第 11 章：寄存器分配
    v
机器码
```

---

# 第 1 部分：为什么需要寄存器分配？

## 1.1 寄存器比内存快

真实机器上，寄存器比内存快得多。课件里给出的直观事实是：

> 寄存器通常比 cache 快 2 到 7 倍。

因此，编译器希望尽量把常用值放进寄存器，而不是频繁访问内存。

## 1.2 但真实寄存器数量有限

抽象汇编里可以有很多 temporary：

```text
t1, t2, t3, ..., tn
```

但真实机器只有有限个寄存器：

```text
r1, r2, ..., rK
```

寄存器分配器的任务就是：

> 把很多 temporary 分配到 K 个真实机器寄存器中。

## 1.3 寄存器分配的要求

寄存器分配器需要做到：

1. 生成正确代码，并且使用不超过 K 个寄存器。
2. 尽量减少 load、store，以及保存溢出值的空间。
3. 分配过程本身要高效。

如果所有 temporary 都能放进寄存器，就很好。  
如果放不下，就要 **spill**：把某些 temporary 放到内存里。

---

# 第 2 部分：图染色寄存器分配

## 2.1 基本对应关系

图染色模型：

| 寄存器分配概念 | 图染色概念 |
|---|---|
| temporary | 图中的节点 |
| 两个 temporary 同时活跃，不能共用寄存器 | 节点之间的边 |
| 真实寄存器 | 颜色 |
| K 个寄存器 | K 种颜色 |

规则：

> 如果两个节点之间有冲突边，它们不能分配到同一个颜色。

也就是：

```text
t1 -- t2    表示 t1 和 t2 不能使用同一个寄存器
```

## 2.2 例子

假设有 3 个 temporary：

```text
      b
     / \
    c---a
```

如果 `a`、`b`、`c` 两两冲突，那么它们必须使用 3 个不同颜色，也就是 3 个不同寄存器。

如果图是：

```text
    b
   / \
  c   a
```

那么 `a` 和 `c` 没有边，可以使用同一个寄存器。

## 2.3 难点

寄存器分配是 NP-complete 问题。  
图染色本身也是 NP-complete 问题。

所以实际编译器不会精确求全局最优解，而是使用效果好的近似算法。

本章主要讲一种近似算法：

```text
Build -> Simplify -> Spill -> Select
```

后面加入 coalescing 后，会变成：

```text
Build -> Simplify -> Coalesce -> Freeze -> Spill -> Select
```

---

# 第 3 部分：通过简化进行染色

## 3.1 核心引理

设机器有 `K` 个寄存器，也就是图可以用 `K` 种颜色染色。

如果图 `G` 中有一个节点 `m`，它的邻居数少于 `K`：

```text
degree(m) < K
```

那么可以先把 `m` 从图中删掉，得到：

```text
G' = G - {m}
```

如果 `G'` 可以 K 染色，那么 `G` 也可以 K 染色。

原因：

- 给 `G'` 染完色后，再把 `m` 放回来。
- `m` 的邻居少于 `K` 个。
- 邻居最多占用少于 `K` 种颜色。
- 所以至少还有一种颜色可以给 `m`。

这就是 simplify 的基础。

## 3.2 简化算法

Simplify 阶段做的事：

1. 找一个度数 `< K` 的节点。
2. 把它从图里删掉。
3. 把它压入栈。
4. 删除它的边后，其他节点的度数会下降，可能产生新的可删除节点。
5. 重复，直到图中只剩下度数 `>= K` 的节点。

可以画成：

```text
原图 G:

      b
     / \
    c---m

如果 K = 2，且 degree(m) < 2，
可以先删除 m：

栈: [m]

剩下 G':

      b
      |
      c
```

## 3.3 高度数节点

课件里把度数 `>= K` 的节点称为 **高度数节点（significant degree）**。

```text
degree(n) < K   -> 可以 simplify
degree(n) >= K  -> 高度数节点
```

如果图里还有低度数节点，就继续 simplify。  
如果图里所有节点都是高度数节点，就要考虑 spill。

---

# 第 4 部分：Spill 与 Optimistic Coloring

## 4.1 Spill 候选

当图中所有节点度数都 `>= K` 时，simplify 暂时无法继续。

这时可以选一个节点作为 **potential spill（潜在溢出）**：

> 假装它会被 spill 到内存，把它从图中删掉并压入栈。

注意这里还不是真的 spill，只是候选。

```text
所有节点 degree >= K
        |
        v
选择一个节点 b 作为潜在溢出
        |
        v
删除 b，压入栈
        |
        v
继续 simplify
```

## 4.2 为什么叫 optimistic coloring？

把 spill candidate 删除时，算法采用一种乐观假设：

> 先假设这个节点不会影响剩下图的染色，等 Select 阶段再看它到底能不能染色。

如果 Select 阶段发现它还能染色，那么它就不是 actual spill。  
如果 Select 阶段发现它真的没有颜色可用，才是 actual spill。

这叫 **optimistic coloring（乐观染色）**。

## 4.3 potential spill 和 actual spill

| 名称 | 含义 |
|---|---|
| potential spill（潜在溢出） | simplify 阶段暂时挑出来的 spill 候选 |
| actual spill（实际溢出） | select 阶段真的发现没有颜色可用 |

这两个不能混淆。

```text
潜在溢出不一定真的 spill
实际溢出才必须改写程序
```

---

# 第 5 部分：Select 阶段

## 5.1 从栈中弹出节点

Simplify / Spill 阶段不断删节点并压栈。  
Select 阶段反过来做：

1. 从空图开始。
2. 每次从栈顶弹出一个节点。
3. 把节点加回图中。
4. 给它选择一个没有被邻居使用的颜色。

也就是：

```text
Simplify: 删除节点，压栈
Select:   弹出节点，染色
```

## 5.2 普通节点一定能染色

如果某节点是因为 `degree < K` 被 simplify 删除的，那么它弹出时一定能染色。

原因和前面的引理一样：

- 它最多有 `K - 1` 个已染色邻居。
- 邻居最多占用 `K - 1` 种颜色。
- 至少还剩一种颜色可用。

## 5.3 spill candidate 不一定能染色

如果某节点是通过 Spill heuristic 压入栈的，就没有保证。

弹出它时分两种情况：

| 情况 | 结果 |
|---|---|
| 邻居使用的颜色少于 K 种 | 可以染色，不会 actual spill |
| 邻居已经使用 K 种不同颜色 | 无法染色，成为 actual spill |

如果出现 actual spill，就不为它分配颜色，继续 Select 阶段找出其他 actual spills。

---

# 第 6 部分：改写程序

## 6.1 什么时候需要改写程序？

如果 Select 阶段发现某些节点无法染色，这些节点就是 actual spills（实际溢出）。

这时必须改写程序：

- 在每次 use 前，从内存 fetch。
- 在每次 def 后，store 回内存。

也就是：

```text
使用 spilled temp 之前:
    从内存读到新的临时值

定义 spilled temp 之后:
    把新的临时值写回内存
```

## 6.2 spill 后会产生新的 temporary

一个 spilled temporary 会被拆成多个新的 temporary，它们的 live range 很短。

原因：

- 每次 use 前都会生成一个新的临时值来保存 load 结果。
- 每次 def 后也会生成一个新的临时值来保存 store 前的值。

这些新 temporary 会重新参与活跃性分析和冲突图构建。

## 6.3 算法需要重新开始

程序被改写后，原来的冲突图就不准了。

所以必须重新执行：

```text
改写程序
    |
    v
构建新的冲突图
    |
    v
Simplify / Spill / Select
```

这个过程会重复，直到 Select 阶段没有 actual spill。

实践中，一般一两轮就够了。

## 6.4 总流程

```text
Build
  |
  v
Simplify
  |
  v
Potential Spill
  |
  v
Select
  |
  +-- 没有实际溢出 --> 完成
  |
  +-- 有实际溢出 --> 改写程序 -> 重新 Build
```

---

# 第 7 部分：Coalescing

## 7.1 Coalescing 是什么？

如果有一条 move 指令：

```text
MOVE t1, t2
```

并且 `t1` 和 `t2` 在冲突图中没有冲突边，那么它们可以分配到同一个寄存器。

这样 `MOVE` 就变成了：

```text
r <- r
```

这条 move 可以删除。

图上做的事情叫 **coalescing（合并）**：

```text
t1      t2
 \      /
  coalesce
     |
   t1&t2
```

合并后的新节点拥有原来两个节点的边的并集。

## 7.2 为什么 coalescing 有用？

coalescing 可以：

- 删除多余 move 指令。
- 有时还能改善图的可染色性。

例如合并两个 move 相关节点后，其他节点可能少一个邻居，从而更容易 simplify。

## 7.3 为什么不能随便 coalesce？

合并后的节点拥有两个节点边的并集，所以它可能比原来的节点更受约束。

危险是：

> 合并前图可以 K-coloring，合并后图可能不能 K-coloring。

因此需要 **保守合并（conservative coalescing）**：

> 只在确定安全时才合并。

课件给出两个安全准则：

- Briggs
- George

---

# 第 8 部分：保守 Coalescing

## 8.1 Briggs 准则

设要合并节点 `a` 和 `b`，合并后的节点叫 `ab`。

Briggs 准则：

> 如果合并后的 `ab` 拥有少于 `K` 个 significant-degree 邻居，那么可以合并。

这里：

```text
高度数节点 = degree >= K
```

为什么安全？

- simplify 阶段可以移除所有低度数邻居。
- 合并后的节点只需要担心 significant-degree 邻居。
- 如果 significant-degree 邻居少于 `K` 个，那么之后 `ab` 仍然可以被 simplify。
- 所以不会把一个可 K-coloring 的图变成不可 K-coloring。

## 8.2 George 准则

George 准则：

> 如果 `a` 的每个邻居 `t` 都满足下面二者之一，那么 `a` 和 `b` 可以合并：

1. `t` 已经和 `b` 冲突。
2. `t` 是低度数节点，也就是 `degree(t) < K`。

为什么安全？

- 如果 `t` 已经和 `b` 冲突，那么合并后 `(a,t)` 和 `(b,t)` 只是合成 `(ab,t)`，不会增加 `t` 的度数。
- 如果 `t` 是低度数节点，它后面可以被 simplify 移除，也不会制造染色困难。

---

# 第 9 部分：带 Coalescing 的染色算法

## 9.1 为什么要交替执行？

加入 coalescing 后，不能简单地只做一次 simplify 或 coalesce。

原因：

- simplify 删除节点后，图变小，可能创造新的 coalescing 机会。
- coalescing 合并节点后，某些节点可能不再 move 相关，又能进入 simplify。

因此要交替执行：

```text
simplify -> coalesce -> simplify -> coalesce -> ...
```

直到图空掉，或者必须 freeze / spill。

## 9.2 完整阶段

带 coalescing 的图染色流程：

```text
Build
Simplify
Coalesce
Freeze
Spill
Select
```

## 9.3 Build 阶段

Build 阶段：

1. 构建冲突图。
2. 把节点分成两类：

| 节点类型 | 含义 |
|---|---|
| move 相关节点 | 是某条 move 指令的源或目标 |
| 非 move 相关节点 | 不参与 move 指令 |

## 9.4 Simplify

Simplify 阶段只删除：

```text
低度数、并且非 move 相关的节点
```

也就是：

```text
degree < K
不是 move 相关节点
```

## 9.5 Coalesce

Coalesce 阶段做保守合并。

如果合并后的节点不再 move 相关，它可以进入下一轮 simplify。

Simplify 和 Coalesce 会重复，直到只剩下：

- 高度数节点
- move 相关节点

## 9.6 Freeze

如果 simplify 和 coalesce 都不能进行，就找一个低度数的 move 相关节点，冻结它参与的 move。

Freeze 的意思是：

> 放弃合并这些 move 的希望。

冻结后，这个节点不再被当作 move 相关节点，于是可能进入 simplify。

## 9.7 Spill

如果没有低度数节点，就选一个高度数节点作为 potential spill，并压入栈。

## 9.8 Select

Select 阶段弹出整个栈并分配颜色。

如果出现 actual spill，就改写程序，然后重新构建冲突图。

---

# 第 10 部分：Precolored Nodes

## 10.1 什么是 precolored node？

有些寄存器有特殊用途，例如：

- 参数寄存器
- 帧指针寄存器
- 返回值寄存器

这些寄存器在程序中已经有固定身份。  
编译器会使用某个固定 temporary 永久绑定到这些寄存器。

这种 temporary 叫 **precolored node（预着色节点）**。

性质：

1. 每种颜色只有一个 precolored node。
2. 所有 precolored nodes 彼此冲突。
3. precolored node 不能 simplify。
4. precolored node 不应该 spill 到内存。

原因：

> 机器寄存器本来就是寄存器，不能说把机器寄存器 spill 到内存里。

## 10.2 普通 temporary 可以和预着色寄存器同色

普通 temporary 可以使用和某个预着色寄存器相同的颜色，只要它们之间没有冲突边。

例子：

> 调用约定里的某个寄存器，也可以在过程内部临时复用。

---

# 第 11 部分：机器寄存器的临时副本

## 11.1 为什么需要临时副本？

由于 precolored nodes 不能 spill，前端或代码生成阶段要尽量让它们的 live range 短。

做法是生成 MOVE 指令，把值在 precolored node 和普通 temporary 之间搬来搬去。

例如 `r7` 是 callee-save register（被调用者保存寄存器）：

```text
不使用临时副本:

Enter: def(r7)
       ...
Exit:  use(r7)

使用临时副本:

Enter: def(r7)
       t231 <- r7
       ...
       r7 <- t231
Exit:  use(r7)
```

## 11.2 为什么这样有用？

如果当前函数寄存器压力大：

- `t231` 可能 spill。
- `r7` 仍然作为 precolored node 保持很短的 live range。

如果寄存器压力不大：

- `t231` 可以和 `r7` coalesce。
- 两条 MOVE 指令可以被删除。

---

# 第 12 部分：Caller-save 与 Callee-save

## 12.1 基本策略

课件给出一个经验规则：

| 变量情况 | 适合的寄存器 |
|---|---|
| 不跨越过程调用活跃 | caller-save register（调用者保存寄存器） |
| 跨越多个过程调用仍然活跃 | callee-save register（被调用者保存寄存器） |

原因：

- caller-save 寄存器可能被被调函数破坏。
- 如果变量跨越调用仍然活跃，把它放在 caller-save 中就需要额外保存和恢复。
- callee-save 寄存器由被调函数负责保存，适合保存跨调用仍然活跃的值。

## 12.2 变量跨调用活跃时会发生什么？

如果变量 `x` 在某个过程调用前后都活跃，那么：

1. `x` 与所有 caller-save 预着色寄存器冲突。
2. `x` 与为 callee-save 寄存器创建的新 temporaries 冲突。
3. 冲突变多，可能导致 spill。

课件提示：使用常见 spill-cost heuristic（溢出代价启发式）时，会优先 spill：

> 度数高、use 次数少的节点。

---

# 第 13 部分：Spill 优先级

## 13.1 选择谁 spill？

如果必须 spill，就要选一个“代价较低”的节点。

课件例子里采用的思路是：

> 优先 spill 度数高、使用次数少的节点。

一种常见优先级形式：

```text
spill 优先级 = (uses + defs 加权次数) / degree
```

课件例子中，循环内的 use/def 按 10 倍权重计算：

| 节点 | 循环外 uses+defs | 循环内 uses+defs | degree | spill 优先级 |
|---|---:|---:|---:|---:|
| `a` | 2 | 10 x 0 | 4 | 0.50 |
| `b` | 1 | 10 x 1 | 4 | 2.75 |
| `c` | 2 | 10 x 0 | 6 | 0.33 |
| `d` | 2 | 10 x 2 | 4 | 5.50 |
| `e` | 1 | 10 x 3 | 3 | 10.33 |

优先级越低，越适合 spill。  
所以例子里先 spill `c`。

---

# 第 14 部分：完整例子的主线

课件最后用一个带 precolored nodes 的例子展示完整过程：

```text
机器有 3 个寄存器:
    r1, r2 是 caller-save
    r3 是 callee-save
```

源程序大意：

```c
int f(int a, int b) {
  int d = 0;
  int e = a;
  do {
    d = d + b;
    e = e - 1;
  } while (e > 0);
  return d;
}
```

生成的抽象代码包含：

```text
enter: c <- r3
       a <- r1
       b <- r2
       d <- 0
       e <- a
loop:  d <- d + b
       e <- e - 1
       if (e > 0) goto loop
       r1 <- d
       r3 <- c
       return
```

过程主线：

1. 初始冲突图没有 simplify、coalesce、freeze 机会。
2. 根据 spill 优先级选择 `c` 作为 spill。
3. 进行 coalescing，例如 `a&e`、`b&r2`、`r1&ae`。
4. 对 `d` 执行 simplify。
5. Select 时发现 `c` 变成 actual spill（实际溢出）。
6. Rewrite 程序，在 `c` 的 use 前插入 fetch，在 def 后插入 store。
7. 重新 Build 新冲突图。
8. 再次 coalesce 和 simplify。
9. Select 后得到寄存器分配。
10. 删除源和目标相同的 move 指令。

改写后的关键形式：

```text
enter: c1 <- r3
       M[cloc] <- c1
       ...
       c2 <- M[cloc]
       r3 <- c2
       return
```

最后如果出现：

```text
r3 <- r3
r1 <- r1
r2 <- r2
```

这类源和目标相同的 move，都可以删除。

---

# 总结

第 11 章的核心可以压成一句话：

> 寄存器分配把冲突图染成 K 种颜色；颜色就是真实寄存器，染不了色的节点要 spill 到内存。

核心流程：

```text
Build
Simplify
Coalesce
Freeze
Spill
Select
如果有实际溢出，就改写程序
```

关键概念：

| 概念 | 含义 |
|---|---|
| 冲突图 | temporary 冲突图 |
| 颜色 | 真实寄存器 |
| simplify | 删除度数 `< K` 的节点并压栈 |
| potential spill | simplify 卡住时暂时挑出的 spill 候选 |
| actual spill | select 时真的没有颜色可用 |
| optimistic coloring | 先乐观地把 spill candidate 压栈，之后再看能不能染色 |
| coalescing | 合并 move 的源和目标，删除多余 move |
| freeze | 放弃某些 move 的合并机会，让节点重新进入 simplify |
| precolored node | 已经固定绑定真实寄存器的节点 |

最重要的直觉：

- 度数 `< K` 的节点一定能安全删掉，因为最后总有颜色可用。
- spill candidate 不一定真的 spill，select 时没颜色才是 actual spill。
- coalescing 可以删除 move，但必须保守，否则会让图更难染色。
- precolored nodes 不能 simplify，也不应该 spill。
