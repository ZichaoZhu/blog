---
title: "Lec8: Basic Blocks and Traces"
date: "2026-04-10"
description: "把前端友好的 IR Tree 改写成对后端友好的 canonical form:消除 ESEQ、切分基本块、再用 traces 把跳转重排为顺序流,为指令选择铺路。"
tags: ["编译原理","课程笔记","计算机科学"]
category: "编译原理"
author: "zhuzichao"
draft: false
---

## What does Chapter 8 focus on?

Chapter 7 把 typed AST 翻成了 IR Tree——`ESEQ`、`CJUMP(o, e1, e2, t, f)`、`CALL(f, args)` 这些节点表达力极强,前端写起来很顺手。但**前端方便不等于后端方便**:这些节点在真实机器上根本找不到对应物。Chapter 8 接着问:

> **怎么把"前端友好"的 IR Tree 改造成"后端友好"的 IR list,让指令选择能直接落地?**

答案是**三阶段规整**(canonicalization):

```mermaid
flowchart LR
    A[IR Tree<br/>含 ESEQ/CJUMP双跳] --> B[Stage 1<br/>Canonical Trees]
    B --> C[无 SEQ/ESEQ<br/>CALL 在顶层]
    C --> D[Stage 2<br/>Basic Blocks]
    D --> E[每块 LABEL 开头<br/>JUMP/CJUMP 结尾]
    E --> F[Stage 3<br/>Traces]
    F --> G[CJUMP 后必跟 false label]
    G --> H[Instruction Selection<br/>Ch9]
```

Chapter 8 的三个主题:

1. **Canonical Trees**:消灭 SEQ / ESEQ,把 CALL 拎到顶层
2. **Basic Blocks**:把语句序列切成一段段"一进一出"的直线代码
3. **Traces**:把 basic blocks 重新排序,让每个 CJUMP 后面紧跟它的 false label

---

## 我们在哪里?

```
┌──────────────────────┐
│ Abstract Syntax Tree │
└──────────┬───────────┘
           ↓ Chapter 7: IR Generation
┌──────────────────────┐
│ Intermediate Repr.   │
└──────────┬───────────┘
           ↓ Chapter 8: Canonical Trees / Basic Blocks / Traces  ← 你在这里
┌──────────────────────┐
│ Canonical IR         │
└──────────┬───────────┘
           ↓ Chapter 9: Instruction Selection
┌──────────────────────┐
│ Abstract Assembly    │
└──────────┬───────────┘
           ↓ Chapter 10/11: Register Allocation
┌──────────────────────┐
│ Assembly Code        │
└──────────────────────┘
```

---

# Part 1: Motivation —— IR Tree 跟机器对不上的四个地方

Tree 语言虽然故意挑了**接近大多数机器**的算子,但仍然有四个 mismatch:

### Mismatch 1:CJUMP 双 label

IR 的 `CJUMP(e, t, f)` 可以跳**两个**地方;真实机器的条件跳转**只能指定 true label**,假就 fall through 到下一条。

```
        IR Tree                    Machine
   CJUMP(e, t, f)            evaluate e
   ...                       JNZ t
   LABEL(t)                  if-false code
   if-true code              t: ...
   LABEL(f)
   if-false code
```

> 想让机器直接执行 CJUMP,**必须**保证 CJUMP 后面紧跟 false label——这是 Stage 3 要做的事。

### Mismatch 2:ESEQ 让求值顺序变敏感

```
      BINOP
     ╱  │  ╲
   op  e1  ESEQ
            ╱  ╲
           s    e2
```

`s` 有副作用,先算 `e1` 还是先算 `s` 结果不一样。**例子**:`e1 = a + 5`、`s 是 a := 5`——左右子树先后顺序决定结果。

> 但好的指令选择 / 调度器希望能**自由调度子表达式**。混杂在表达式里的语句剥夺了这种自由。

### Mismatch 3:CALL 同样有副作用

CALL 节点出现在表达式里和 ESEQ 同病相怜,而且 CALL 还有额外问题。

### Mismatch 4:嵌套 CALL 抢 RV 寄存器

```
CALL(f, [e1, CALL(g, [e2, ...])])
```

每个函数都把返回值放在同一个 **TEMP(RV)**——内层 g 的结果会**覆盖**外层 e1 已经放好的东西。

---

## 三阶段解决方案

```
1. A tree → list of canonical trees    (无 SEQ/ESEQ)        ← 解决 ESEQ + CALL
2. list   → set of basic blocks        (无内部 jumps/labels)
3. blocks → set of traces              (CJUMP 后必跟 false)  ← 解决 CJUMP
```

> Stage 2 + 3 一起保证 CJUMP(cond, lt, lf) 后面**总是**紧跟 LABEL(lf),从而能直接翻成机器条件分支。

---

# Part 2: Canonical Trees(Stage 1)

## 定义

**Canonical tree** 满足两个性质:

1. **没有 SEQ 也没有 ESEQ**
2. **每个 CALL 的父节点要么是 `EXP(...)` 要么是 `MOVE(TEMP t, ...)`**

> Property 1 ⇒ 每棵 canonical tree **最多一个 statement 节点**(根),其余都是 expression。
> Property 2 ⇒ 一个 canonical tree 里**最多一个 CALL**——因为 EXP/MOVE 只装一个 CALL。

## Stage 1 要做三件事

```
1. eliminate ESEQs       ← 拎 ESEQ 上浮直到变成 SEQ
2. move CALLs to top level  ← 把 CALL 立刻搬到 fresh temp
3. eliminate SEQs         ← 把 SEQ 树拍扁成线性 list
```

---

## 2.1 Eliminating ESEQs:把 ESEQ 提升到顶部

**核心思路**:不停往上**抬** ESEQ,直到它能变成 SEQ。

### 简单情形(显然成立)

```
ESEQ(s1, ESEQ(s2, e))     =  ESEQ(SEQ(s1, s2), e)
BINOP(op, ESEQ(s, e1), e2) =  ESEQ(s, BINOP(op, e1, e2))
MEM(ESEQ(s, e1))           =  ESEQ(s, MEM(e1))
JUMP(ESEQ(s, e1))          =  SEQ(s, JUMP(e1))
CJUMP(op, ESEQ(s, e1), e2, l1, l2) = SEQ(s, CJUMP(op, e1, e2, l1, l2))
```

> 规律:`ESEQ(s, e)` 出现在某节点的**第一个**子表达式里 —— 直接把 `s` 抽出来放外层就行,因为 s 本来就该最先算。

### 难情形:ESEQ 出现在**第二个**子表达式

```
BINOP(op, e1, ESEQ(s, e2))
CJUMP(op, e1, ESEQ(s, e2), l1, l2)
```

直接搬不行——`s` 可能改写 `e1` 依赖的内存。比如:

```
s  = MOVE(MEM(x), y)
e1 = MEM(x)
```

要是不管不顾把 s 提到 e1 前面,e1 读到的就是写过之后的值,**语义错了**。

#### 通用解法:暂存 e1

把 e1 先求出来塞进一个**新 temp t**:

```
BINOP(op, e1, ESEQ(s, e2))
↓
ESEQ(MOVE(TEMP t, e1),
     ESEQ(s,
          BINOP(op, TEMP t, e2)))
```

这样 e1 已经"凝固"在 t 里,s 怎么折腾都不影响。CJUMP 同理。

#### 优化:可交换时不需要 temp

如果 `s` 和 `e1` **commute**(可交换求值顺序),就能直接搬:

```
若 s 和 e1 commute:
BINOP(op, e1, ESEQ(s, e2)) = ESEQ(s, BINOP(op, e1, e2))
```

> 多一个 MOVE 不致命,但能省就省——实际机器 instruction scheduling 也是这种思路。

### `commute(s, e)`:保守近似

什么时候 s 和 e 一定可换序?**真实判断不可能**(要做精确别名分析),所以用**保守估计**:

- **常量**和任何 statement 都 commute
- **空 statement**(`EXP(CONST x)`)和任何 expression 都 commute
- 其他一律假设**不**commute

```c
static bool isNop(T_stm x) {
  return x->kind == T_EXP && x->u.EXP->kind == T_CONST;
}
static bool commute(T_stm x, T_exp y) {
  return isNop(x) || y->kind == T_NAME || y->kind == T_CONST;
}
```

> 保守 = "宁可多塞 temp,也不破坏语义"。会多生成些 IR,但后续 dead code elimination 能扫掉。

---

## 2.2 General Rewriting:`reorder` / `do_stm` / `do_exp`

### Tiger 编译器的实现接口

```c
typedef struct expRefList_ *expRefList;
struct expRefList_ { T_exp *head; expRefList tail; };

struct stmExp { T_stm s; T_exp e; };

static T_stm    reorder(expRefList rlist);     // 关键
static T_stm    do_stm(T_stm stm);             // 处理 stmt
static struct stmExp do_exp(T_exp exp);        // 处理 expr,返回 (s, e)
```

- `expRefList`:**指针的 list**,每个元素指向一个 T_exp 槽位(便于原地 update)
- `stmExp`:`do_exp` 返回 `(s, e')`,使得 `e ≡ ESEQ(s, e')` 且 e' 已无 ESEQ

### `reorder` 的语义

输入:一组子表达式 `[e1, e2, ESEQ(s, e3)]`
输出:把里面的 statement **抽出来**,把子表达式槽位**原地改成** ESEQ-clean 版本

```
[e1, e2, ESEQ(s, e3)]
   │
   ├── s commute with e1, e2:
   │     抽出 s,槽位变成 [e1, e2, e3]
   │
   ├── e2 不和 s commute:
   │     抽出 SEQ(MOVE(t1,e1), SEQ(MOVE(t2,e2), s)),槽位变成 [TEMP(t1), TEMP(t2), e3]
   │
   └── e2 和 s commute,但 e1 不:
         抽出 SEQ(MOVE(t1,e1), s),槽位变成 [TEMP(t1), e2, e3]
```

### `do_stm`:每种 statement 怎么处理(节选)

```c
static T_stm do_stm(T_stm stm){
  switch (stm->kind) {
    case T_SEQ:                     // SEQ(s1, s2)
      return seq(do_stm(stm->u.SEQ.left),
                 do_stm(stm->u.SEQ.right));
    case T_JUMP:                    // JUMP(e)
      return seq(reorder(ExpRefList(&stm->u.JUMP.exp, NULL)), stm);
    case T_CJUMP:                   // CJUMP(o, e1, e2, t, f)
      return seq(reorder(ExpRefList(&stm->u.CJUMP.left,
                        ExpRefList(&stm->u.CJUMP.right, NULL))), stm);
    case T_MOVE: ...                // 见下面
    case T_EXP:
      if (stm->u.EXP->kind == T_CALL)
        return seq(reorder(get_call_rlist(stm->u.EXP)), stm);
      else
        return seq(reorder(ExpRefList(&stm->u.EXP, NULL)), stm);
  }
}
```

`MOVE` 要分四种情况:

```c
case T_MOVE:
  if (dst==TEMP && src==CALL)            // MOVE(TEMP, CALL(...))  ← 已 canonical
    return seq(reorder(get_call_rlist(src)), stm);
  else if (dst==TEMP)                    // MOVE(TEMP, e)
    return seq(reorder([&src]), stm);
  else if (dst==MEM)                     // MOVE(MEM(e1), e2)
    return seq(reorder([&dst.MEM, &src]), stm);
  else if (dst==ESEQ) {                  // MOVE(ESEQ(s, e1), e2)
    // 拆成 SEQ(s, MOVE(e1, e2)) 再递归
    return do_stm(T_Seq(dst.ESEQ.stm,
                        T_Move(dst.ESEQ.exp, src)));
  }
```

### `do_exp`:每种 expression 怎么处理

```c
static struct stmExp do_exp(T_exp exp){
  switch(exp->kind) {
    case T_BINOP:
      return StmExp(reorder([&L, &R]), exp);
    case T_MEM:
      return StmExp(reorder([&exp->u.MEM]), exp);
    case T_ESEQ: {
      struct stmExp x = do_exp(exp->u.ESEQ.exp);   // {x.s, x.e}
      return StmExp(seq(do_stm(exp->u.ESEQ.stm), x.s), x.e);
    }
    case T_CALL:
      return StmExp(reorder(get_call_rlist(exp)), exp);
    default:
      return StmExp(reorder(NULL), exp);    // CONST/NAME/TEMP 没子表达式
  }
}
```

> `T_ESEQ` 那一支是关键:把内部 `s` 和 `do_exp(e)` 的 statement 部分串起来,作为新的 statement 抛出去;e 部分留作返回的 expression。

---

## 2.3 Move CALLs to Top Level

为什么 CALL 要单独处理?——**所有函数都把返回值放在 RV**。

```
BINOP(PLUS, CALL(...), CALL(...))
                     ↑
                第二个 CALL 会覆盖第一个的 RV
```

**做法**:一遇到 CALL 就立刻把返回值搬进**新 temp**:

```
CALL(f, args)
↓
ESEQ(MOVE(TEMP t, CALL(f, args)), TEMP t)
```

经过 ESEQ 上浮 + 这条规则,所有 CALL 最后都成 `MOVE(TEMP t, CALL(...))` 或 `EXP(CALL(...))`,符合 canonical tree property 2。

---

## 2.4 Eliminate SEQs:线性化

ESEQ 拎光后,所有 SEQ 都聚在树顶,长成左偏深树:

```
SEQ
├── s1
└── SEQ
    ├── s2
    └── SEQ
        ├── s3
        └── ...
```

反复用结合律 `SEQ(SEQ(a, b), c) = SEQ(a, SEQ(b, c))`,把树掰成右展开的链:

```
SEQ(s1, SEQ(s2, ..., SEQ(s_{n-1}, s_n)...))
```

这跟一个**简单 list `[s1, s2, ..., sn]`** 没区别——SEQ 本身没语义信息,直接扔掉。

> Tiger compiler 的 `C_linearize(T_stm stm)` 一步到位返回 `T_stmList`。

---

## 2.5 Canonical 改写规则速查

| 模式 | 改写 |
|---|---|
| `ESEQ(s1, ESEQ(s2, e))` | `ESEQ(SEQ(s1, s2), e)` |
| `BINOP(op, ESEQ(s, e1), e2)` | `ESEQ(s, BINOP(op, e1, e2))` |
| `MEM(ESEQ(s, e1))` | `ESEQ(s, MEM(e1))` |
| `JUMP(ESEQ(s, e1))` | `SEQ(s, JUMP(e1))` |
| `CJUMP(op, ESEQ(s, e1), e2, l1, l2)` | `SEQ(s, CJUMP(op, e1, e2, l1, l2))` |
| `BINOP(op, e1, ESEQ(s, e2))` | `ESEQ(MOVE(TEMP t, e1), ESEQ(s, BINOP(op, TEMP t, e2)))` |
| `CJUMP(op, e1, ESEQ(s, e2), l1, l2)` | `SEQ(MOVE(TEMP t, e1), SEQ(s, CJUMP(op, TEMP t, e2, l1, l2)))` |
| `MOVE(ESEQ(s, e1), e2)` | `SEQ(s, MOVE(e1, e2))` |
| `CALL(f, a)` | `ESEQ(MOVE(TEMP t, CALL(f, a)), TEMP t)` |

---

# Part 3: Basic Blocks(Stage 2)

## Motivation:控制流分析的最小单位

**Control flow** = 指令的执行顺序,**忽略**寄存器/内存里的具体数值,**忽略**算术。

- 不是 jump 的指令,从控制流角度看**毫无意义**——它顺序执行,啥都不会改路径
- CJUMP 的真假分支事先无法静态判断,**两条都可能走**

> 把任意一段非分支指令**捏成一坨**(basic block),然后只分析 block 之间的控制流——这是 control-flow analysis 的核心简化。

## Basic Block 的定义

一个 basic block 是一段**只能从头进、只能从尾出**的语句序列:

```
LABEL XX           ← 第一条必是 LABEL
... # 中间没有 LABEL/JUMP/CJUMP
JUMP / CJUMP       ← 最后一条必是 JUMP 或 CJUMP
```

## 切块算法

```
扫一遍 statement list:
  1. 遇到 LABEL → 上一块结束,从 LABEL 这里开新块
  2. 遇到 JUMP/CJUMP → 当前块结束,下一条开新块
  3. 若某块没以 JUMP/CJUMP 结尾 → 追加 JUMP(下一块的 label)
  4. 若某块没以 LABEL 开头   → 造一个新 label 塞进去
```

> Step 3 / 4 是为了**统一形式**:每块都"label 开头 + jump 结尾",后续阶段不用考虑特殊情况。

### 例子(三地址码)

```
(1)  x := input
(2)  y := x - 1
(3)  z := x * y
(4)  if z < x goto (7)
(5)  p := x / y
(6)  q := p + y
(7)  a := q
(8)  b := x + a
(9)  c := a - b
(10) if p == q goto (12)
(11) goto (3)
(12) return
```

**分块**:

- **新块开始**(LABEL 处 / 跳转目标):(1) (3) (5) (7) (11) (12)
- **新块开始**(紧跟 JUMP/CJUMP):在 (4) (10) (11) 后

得到 6 块:`{1,2}`、`{3,4}`、`{5,6}`、`{7,8,9,10}`、`{11}`、`{12}`。

### Tree 语言版本(加 LABEL / JUMP)

切完 (5)(6)(7)(8)(9)(10) 这两块后,要补:

```
LABEL(five)                LABEL(seven)
MOVE(p, x/y)               MOVE(a, q)
MOVE(q, p+y)               MOVE(b, x+a)
JUMP(NAME seven)  ← 补    MOVE(c, a-b)
                           CJUMP(EQ, p, q, twelve, eleven)
```

---

# Part 4: Traces(Stage 3)

## Motivation:消除 CJUMP 双 label 的最后一公里

Basic block 内部已经规整,但 block **之间的顺序**还没定。注意:

> Block 顺序怎么排,**不影响程序语义**——因为每块都靠显式 JUMP/CJUMP 跳转。

利用这一点,我们刻意挑一种排法:让每个 `CJUMP(cond, lt, lf)` 在最终序列里**紧挨着 LABEL(lf)**:

```
CJUMP(op, a, b, lt, lf)
LABEL(lf)              ← 紧跟 false label
```

这样 CJUMP 就能直接翻成机器的"条件跳真,假就 fall through"。

**附带好处**:也能让很多 unconditional `JUMP(NAME next)` 紧挨 `LABEL(next)`,这种 jump 可以**直接删掉**——程序更快。

## Trace 的定义

> **Trace** = 一段在执行中**可能连续执行**的 statement 序列(可以含 CJUMP)。

挑一组 trace 把整个程序**正好覆盖一次**:

- 每个 block **恰属一个** trace
- 每个 trace **无环**(loop free)
- trace 数**越少越好**(trace 之间要 JUMP,trace 内部不用)

## 算法:DFS 找 trace

```
把所有 block 放进队列 Q
while Q 非空:
    新建空 trace T
    从 Q 取出头部 block b
    while b 未标记:
        标记 b;把 b 追加到 T 末尾
        看 b 的后继(b 跳到的 block 们)
        if 有未标记的后继 c:
            b ← c
    (b 的所有后继都已标记 → trace 走到尽头)
    结束当前 trace T
```

**直觉**:从一个 block 开始,沿着 jump 链一路走,标记一个走一个,撞到死路就开新 trace。

### 配图示例

```
LABEL(b1)
...
JUMP(NAME b4)
        ↓
LABEL(b4)
...
JUMP(NAME b6)
        ↓
LABEL(b6)
...
CJUMP(cond, b7, b3)    ← 取 false 后继 b3 拼到 trace 后面
        ↓                  这样 CJUMP 后面就是 LABEL(b3) ✓
LABEL(b7)  LABEL(b3)
```

> 顺着 b1 → b4 → b6 → b3 跑成一条 trace,b7 留到下一条 trace。

## Finishing Up:CJUMP 的最后调整

把所有 trace 拼回一条长 list,处理三种 CJUMP:

| 情况 | 处理 |
|---|---|
| **CJUMP 后紧跟 false label** | 不动(我们追求的就是这个,绝大多数都是) |
| **CJUMP 后紧跟 true label** | 交换 lt / lf 并**取反**条件 |
| **CJUMP 后既不是 lt 也不是 lf** | 造一个新 label `lf'`,改写为:<br/>`CJUMP(cond, a, b, lt, lf')` <br/>`LABEL lf'`<br/>`JUMP(NAME lf)` |

## Optimal Traces:循环要单独成 trace

频繁执行的代码段(如循环体)应**独占一条 trace**,以减少 unconditional jump。

考虑 `while (i ≤ N) body`,有三种可能排法:

```
(a) prologue          (b) prologue          (c) prologue
    JUMP test             JUMP test             JUMP test
    LABEL test            LABEL test            LABEL body     ← 循环体先
    CJUMP > done body     CJUMP ≤ body done     body
    LABEL body            LABEL done            JUMP test      ← (可省)
    body                  epilogue              LABEL test
    JUMP test             LABEL body            CJUMP ≤ body done
    LABEL done            body                  LABEL done
    epilogue              JUMP test             epilogue
```

**每次循环要执行的跳转数**:

- (a):每轮 1 CJUMP + 1 JUMP
- (b):每轮 1 CJUMP + 1 JUMP
- (c):**第一次** 1 CJUMP + 1 JUMP;**之后每轮只剩 1 CJUMP**(JUMP test 紧跟 LABEL test 被删)

> (c) 把循环体做成一条独立 trace,test block 排在循环体后面——少一条 unconditional jump 看起来微小,但循环跑成千上万次会非常划算。register allocation 和 instruction scheduling 也偏爱长 trace。

---

# Part 5: Canon Module 接口

```c
typedef struct C_stmListList_ *C_stmListList;
struct C_block { C_stmListList stmLists; Temp_label label; };
struct C_stmListList_ { T_stmList head; C_stmListList tail; };

T_stmList     C_linearize(T_stm stm);            // Stage 1
struct C_block C_basicBlocks(T_stmList stmList); // Stage 2
T_stmList     C_traceSchedule(struct C_block b); // Stage 3
```

下游(Ch9 instruction selection)从这里拿到的是:**一个干净的、CJUMP 后必跟 false label 的 T_stmList**。

---

# Summary:Chapter 8 的核心思路

### 1. 为什么要 canonicalization?
IR Tree 写起来漂亮,但有四个跟机器对不上的地方:
- CJUMP 双 label,机器只能单 label
- ESEQ 让求值顺序变敏感
- CALL 当作子表达式时同样有副作用
- 嵌套 CALL 共享 RV 寄存器,会互相覆盖

### 2. 三阶段流水线
**Stage 1**(Canonical Trees)解决 ESEQ 和 CALL,**Stage 2 + 3**(Basic Blocks + Traces)联手解决 CJUMP。

### 3. ESEQ 上浮 + commute 估计
原则:不停把 ESEQ 抬高,直到它能转成顶层 SEQ。语义不允许直接搬时,先把会被打乱的子表达式**塞进 fresh temp**。`commute` 用最保守的常量/空 stmt 规则估,宁滥勿缺。

### 4. CALL 立刻搬到 fresh temp
`CALL → ESEQ(MOVE(TEMP t, CALL), TEMP t)`,确保下游每个 CALL 的父节点都是 EXP 或 MOVE(TEMP, ...)。

### 5. Basic Block = 控制流的最小颗粒
"LABEL 开头 + JUMP/CJUMP 结尾,中间无跳转"——切块时缺 LABEL 就造一个,缺 JUMP 就补一条到下一块。

### 6. Trace 用 DFS 排序,让 CJUMP 接 false label
Trace 内部沿可能的执行路径连成一串,CJUMP 后**主动**接它的 false 后继。剩下的少数 CJUMP 用"取反 / 加跳板"两招收尾。

### 7. 循环体单独成 trace
test 排在循环体之后,使每轮迭代少一条 unconditional jump——循环执行次数越多收益越大。

---

## 一个总的理解框架

| Chapter | 问 | 答 |
|---|---|---|
| 5 | AST 语义对吗? | Symbol table + type checking |
| 6 | 运行时变量放哪? | Activation record + Frame |
| 7 | typed AST → IR 怎么翻? | IR Tree + Translate (Ex/Nx/Cx) |
| **8** | **IR 怎么整理才能落到机器?** | **Canonical Trees → Basic Blocks → Traces** |
| 9 | IR → 目标机器? | Instruction selection (maximal munch) |

到这里 IR 已经"机器友好"了:

```
typed AST + frame info → IR Tree fragments
→ Canonical IR list → Basic Blocks → Traces  ← 你在这里
→ Abstract Assembly → Real Assembly
```

下一章 Chapter 9 会用 **maximal munch** 把 canonical IR 一棵棵地匹配到目标指令集。

---

# 学习路线建议

按以下顺序推进,效率最高:

### Step 1:把"为什么"想清楚(0.5h)
- 复习 Lec7 的 IR Tree:CJUMP / ESEQ / CALL 三个节点的形状
- 理解四个 mismatch——特别是为什么 CJUMP 必须接 false label,为什么 ESEQ 让调度不自由
- 三阶段的对应关系:Stage 1 解 ESEQ + CALL,Stage 2 + 3 解 CJUMP

### Step 2:Canonical Trees(2h)⭐ **重点**
- 把 9 条改写规则**默写出来**——尤其是"e1 不和 s commute 时要塞 temp"那条
- 弄懂 `commute(s, e)` 的保守近似:常量 + 空 stmt,其他全否
- 看懂 `reorder` 的工作:输入指针 list,抽出 statement,原地更新成 ESEQ-clean
- `CALL → ESEQ(MOVE(TEMP t, CALL), TEMP t)` 一定要记住——这是 RV 冲突的统一解法

### Step 3:Basic Blocks(0.5h)
- 切块算法 4 步骤:LABEL 开头、JUMP/CJUMP 结尾、缺 JUMP 补、缺 LABEL 造
- 手切一遍课件那个 12 行三地址码的例子

### Step 4:Traces(1.5h)⭐ **重点**
- DFS 算法:沿着可能执行路径走,撞到死路开新 trace
- "Finishing Up" 三种 CJUMP 的处理
- 循环 trace 的三种排法 (a)(b)(c) 的跳转计数,理解为啥 (c) 最优

### Step 5:Canon Module 三个接口(0.5h)
- `C_linearize` / `C_basicBlocks` / `C_traceSchedule` 的输入输出
- 为什么 `C_basicBlocks` 返回 `C_block`(里面是 `C_stmListList`,即 list of basic blocks)

### Step 6:做作业 8.2 / 8.6 / 8.7(1h)
- 8.2:手算 ESEQ 改写
- 8.6:basic block 划分
- 8.7:trace 排序

### 常见陷阱
- **commute 错判**:别想着证明两个表达式可换序,**就用保守的"常量/空 stmt"规则**
- **ESEQ 在第二个子表达式**:不能直接搬,**必须**用 temp(除非确定 commute)
- **嵌套 CALL**:第一步就要拆,别等到指令选择
- **Trace 之间靠 JUMP 连**:别忘了基本块结尾要有 JUMP/CJUMP——切块阶段就要补
- **(c) 最优 ≠ 总用 (c)**:Trace 算法是启发式 DFS,只是**倾向**长 trace,不保证最少 jump

### 和后续章节的衔接
- Ch9:每条 canonical statement → 一条或多条机器指令(maximal munch / dynamic programming)
- Ch10/11:寄存器分配 / 调度——长 trace 提供了大块连续指令,**给寄存器分配腾出更大的活动区间**
- **Ch8 是 IR 的"最后整形"**:再往下,IR 的形态就只剩"机器指令的列表"了
