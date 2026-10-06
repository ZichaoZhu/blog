---
id: "compiler-principles-lec14"
slug: "compiler-principles-lec14"
title: "Lec14: 面向对象语言"
description: "对象字段布局、虚方法分派、多继承与运行时类型检查的编译实现。"
contentKind: "note"
type: "course"
topics: ["compilers"]
visibility: "published"
author: "Goongmly"
course: {"id":"compiler-principles","order":14}
tags: ["编译原理","课程笔记","计算机科学"]
category: "编译原理"
---

教材：Modern Compiler Implementation (Andrew W. Appel), Chapter 14 "Object-Oriented Languages"

载体：课程讲义 Chapter14（共 40 页幻灯片），示例语言为在 Tiger 上扩展的 Object-Tiger

## 一句话总结

面向对象语言编译的核心是“字段与方法的定位”：单继承下用前缀法(prefixing)让同名字段与方法在所有子类中保持相同偏移量，使字段访问与动态分派都退化为常数偏移取值；多继承破坏了前缀法，需用全局图着色或每类哈希表来定位成员；运行时类型测试(instanceof)可用沿父类链上溯的循环或固定深度的 display 数组以 $O(1)$ 完成；私有性与向下转型的安全性则由编译期类型检查（必要时辅以运行时检查）保证。

## 面向对象语言概述

- 基于类的(class-based)面向对象语言的特征：
  - (1) 所有(或大多数)值都是对象；(2) 对象是某个类的实例(instance)；(3) 对象封装状态(state，即字段 fields)与行为(behavior，即方法 methods)。
- 三大重要特性：继承(inheritance)、封装(encapsulation)、多态(polymorphism)。
- 本章主线（编译器视角的五个问题）：类的语法；单继承下数据字段的布局与方法分派；多继承下的成员定位；运行时类成员测试；私有字段与方法的实现。

## 类的语法：Object-Tiger

在 Tiger 上扩展声明语法以创建类。文法：

```
dec        → classdec
classdec   → class class-id extends class-id { {classfield} }
classfield → vardec
classfield → method
method     → method id(tyfields) = exp
method     → method id(tyfields) : type-id = exp
```

`class B extends A { ... }` 的语义：

- 声明新类 `B`，继承类 `A`；该声明须位于声明 `A` 的 let 表达式作用域内。
- `A` 的所有字段与方法隐式属于 `B`。
- `B` 可重写(override) `A` 的某些方法，但参数类型与返回类型必须完全一致。
- 字段不能被重写。
- 预定义类 `Object`：无字段、无方法，是继承树的根。
- `B` 中每个方法都有一个隐式形参 `self`，类型为 `B`；`self` 不是保留字，只是每个方法中自动绑定的标识符。

创建对象与调用方法的表达式语法：

```
exp → new class-id
    → lvalue . id()
    → lvalue . id(exp{, exp})
```

- `new B` 创建 `B` 的实例；`b.x` 取字段；`b.f(x, y)` 调用方法，`b` 作为 `f` 的隐式 `self` 实参。

贯穿全章的示例程序：

```
let start := 10
  class Vehicle extends Object {
    var position := start
    method move(int x) = (position := position + x)
  }
  class Truck extends Vehicle {
    method move(int x) =                       // 重写 move
      if x <= 55 then position := position + x
  }
  class Car extends Vehicle {
    var passengers := 0
    method await(v: Vehicle) =
      if (v.position < position)
      then v.move(position - v.position)
      else self.move(10)
  }
  var t := new Truck
  var c := new Car
  var v : Vehicle := c
in
  c.passengers := 2;
  c.move(60);
  v.move(70);
  c.await(t)
end
```

- 注意：`v` 的静态类型是 `Vehicle`，运行时却指向 `Car`；`v.move(70)` 必须调用到运行时真实类的 `move`——这正是动态分派要解决的问题。

## 单继承的数据字段

### 取字段的难题

- 例：`v.position`，`v` 的静态类型为 `Vehicle`。编译器要生成代码，从 `v` 指向的对象(记录)中取出 `position` 字段。
- 朴素想法：从 `v` 的环境项拿到 `Vehicle` 的类描述符(class descriptor)，再从描述符查 `position` 的偏移量。
- 难点：运行时 `v` 可能指向 `Car` 或 `Truck` 对象，`position` 在它们中的位置是否一致？

### 前缀法(Prefixing)：字段布局

- 单继承语言：每个类只继承一个父类。
- 规则：`B extends A` 时，`B` 从 `A` 继承的字段按 `A` 中的原顺序排在 `B` 记录的最前面；`B` 新增字段排在其后。
- 示例：

```
class A extends Object { var a := 0 }
class B extends A { var b := 0  var c := 0 }
class C extends A { var d := 0 }
class D extends B { var e := 0 }
```

布局（方括号内为字段，下标为偏移量）：

$$A:[a_0] \qquad B:[a_0, b_1, c_2] \qquad C:[a_0, d_1] \qquad D:[a_0, b_1, c_2, e_3]$$

- 关键结论：字段 `a` 在 `A`、`B`、`C`、`D` 中偏移量都是 $0$。因此无论 `v` 实际指向哪个子类对象，`v.a` / `v.position` 都落在编译期已知的固定偏移处——单继承下字段偏移量编译期可定，取字段只需一条指令。

### 方法的编译

- 一个方法实例(method instance)像普通函数一样被编译，生成位于指令空间某地址的机器码。
- 例：`Truck_move` 方法实例的入口是机器码标号 `Truck_move`。
- 每个类描述符包含：指向父类的指针，以及方法实例列表。

### 静态方法(Static Methods)

- 部分 OO 语言允许方法声明为 static。
- 编译 `c.f()` 的查找过程：
  - (1) 求 `c` 的类，设为 `C`；(2) 在 `C` 中找方法 `f`，若未找到；(3) 找 `C` 的父类 `B`，依次上溯；(4) 若在祖先类 `A` 中找到 static 方法 `f`，则编译为对标号 `A_f` 的普通函数调用。
- 即 `c.f()` $\Rightarrow$ 直接 call `A_f`，目标地址编译期确定。

### 动态方法与分派向量(vtable)

- 若 `f` 是动态方法，能否把 `c.f()` 直接编成 `A_f`？不能：
  - `f` 可能在 `C` 的某个子类 `D` 中被重写；编译期无法判定 `c` 指向 `C`(应调 `A_f`)还是 `D`(应调 `D_f`)。
- 解法：类描述符中放一个分派向量(dispatch vector / virtual table / vtable)，每个(非静态)方法名对应一个方法实例指针。
  - 前缀法同样适用：`B` 继承 `A` 时，方法表先放 `A` 已知的所有方法名条目，再接 `B` 新声明的方法。
- 示例：

```
class A extends Object { var x := 0  method f() }
class B extends A { method g() }
class C extends B { method g() }              // 重写 g
class D extends C { var y := 0  method f() }  // 重写 f
```

各类 vtable（下标为方法偏移量）：

$$A:[f{=}A\_f] \quad B:[f{=}A\_f,\ g{=}B\_g] \quad C:[f{=}A\_f,\ g{=}C\_g] \quad D:[f{=}D\_f,\ g{=}C\_g]$$

- 关键：`f` 在所有描述符中偏移恒为 $0$，`g` 恒为 $1$。同名方法在所有类的 vtable 中偏移一致（前缀法保证）。

执行 `c.f()`（`f` 为动态方法）的三步：

- (1) 从对象 `c` 偏移 $0$ 处取类描述符 $d$；
- (2) 从 $d$ 的(常量)偏移 $f$ 处取方法实例指针 $p$；
- (3) 跳转到地址 $p$ 并保存返回地址（即 call $p$）。

## 多继承

- 若允许类 `D` 同时继承 `A`、`B`、`C`，字段偏移与方法定位变难：
  - 无法同时把 `A` 的字段都放在 `D` 开头、又把 `B` 的字段也都放在 `D` 开头。前缀法失效。

### 全局图着色：字段

- 思路：链接期一次性静态分析所有类(图着色算法)，为每个字段名找到一个在所有含该字段的记录中都通用的偏移量。
- 示例：

```
class A extends Object { var a := 0 }
class B extends Object { var b := 0  var c := 0 }
class C extends A { var d := 0 }
class D extends A,B,C { var e := 0 }
```

- 图着色建模：
  - 结点：一个不同的字段名；边：两个字段共存于同一个类；颜色：偏移量 $0, 1, 2, \dots$
  - `D` 同时含 $a, b, c, d, e$，故五者两两相邻，必须取五种不同颜色，例如 $a{:}0,\ b{:}1,\ c{:}2,\ d{:}3,\ e{:}4$。各类按此全局偏移布局（如 `B` 在偏移 $0$ 处留空，`C` 在偏移 $1, 2$ 处留空）。
- 缺点：对象中间出现空槽(内部碎片)。
- 改进(打包)：把对象字段紧凑排列，由类描述符记录每个字段的实际位置。
  - 此时描述符有空槽、对象无空槽；可接受，因为对象数 $\gg$ 描述符数。
  - 代价：每次取/存字段需三条指令而非一条：
    - (1) 从对象取描述符指针；(2) 从描述符取该字段的偏移值；(3) 在对象的该偏移处取/存数据。
  - 对比：单继承用前缀法，字段偏移编译期已知，一条指令即可。

### 全局图着色：方法查找

- 同一套图着色法对方法也适用：
  - 方法名与字段名混在一起，构成一张大干涉图(interference graph)的结点。
  - 描述符中字段条目给出对象内位置；方法条目给出方法实例的机器码地址。

### 图着色的问题：动态链接

- 全局着色只能在链接期(link-time)完成。
- 但许多 OO 系统支持把新类动态载入运行中的系统。
- 链接期图着色对支持动态增量链接(dynamic incremental linking)的系统造成诸多困难。

### 哈希法(Hashing)

- 在每个类描述符中放一张哈希表，把字段名映射到偏移、方法名映射到方法实例。
- 优点：与分离编译(separate compilation)和动态链接配合良好。
- 两张表：
  - Ftab(field-offset table)：存字段偏移与方法实例；
  - Ktab(key table)：存字段名指针（用于冲突检测）。
  - 若类含字段 $x$，则 Ftab 的槽 $\mathrm{hash}_x$ 存 $x$ 的偏移，Ktab 的槽 $\mathrm{hash}_x$ 存指针 $\mathrm{ptr}_x$。
- 取对象 `c` 的字段 $x$：
  - (1) 从 `c` 偏移 $0$ 取描述符 $d$；
  - (2) 从地址 $d + \mathrm{Ktab} + \mathrm{hash}_x$ 取字段名 $f$；
  - (3) 测试是否 $f = \mathrm{ptr}_x$（成立则无冲突）；
  - (4) 从 $d + \mathrm{Ftab} + \mathrm{hash}_x$ 取字段偏移 $k$；
  - (5) 从 $c + k$ 取字段内容。
- 动态方法实例查找用类似算法；任意哈希冲突解决技术皆可用。

## 测试类成员关系

部分 OO 语言允许运行时测试对象是否属于某类（表 14.6 类型测试与安全转型设施）：

| 功能 | Modula-3 | Java |
|---|---|---|
| 测试对象 $x$ 是否属于类 $C$ 或其任意子类 | `ISTYPE(x,C)` | `x instanceof C` |
| 设 $x$ 静态类型为 $C$、实际指向 $C$ 的子类 $D$ 的对象，得到一个编译期类型为 $D$ 的表达式 | `NARROW(x,D)` | `(D)x` |

### 简单循环法（无多继承）

实现 `x instanceof C`：沿父类链向上逐级比较。

```
      t1 ← x.descriptor
L1:   if t1 = C goto true
      t1 ← t1.super
      if t1 = nil goto false
      goto L1
```

- `t1.super` 是类 `t1` 的父类(超类)。缺点：可能慢（继承链越长越慢）。

### Display 法（O(1)）

- 更快：在描述符中放一个父类 display 数组。
- 假定类嵌套深度有上限(如 $20$)，每个描述符预留 $20$ 字的块。
- 设类 `D` 的嵌套深度为 $j$(编译期可知)，`D` 的描述符中：
  - $\mathrm{display}[j] = D$，$\mathrm{display}[j-1] = D.\mathrm{super}$，$\mathrm{display}[j-2] = D.\mathrm{super}.\mathrm{super}$，$\dots$，$\mathrm{display}[0] = \mathrm{Object}$；对 $k > j$ 有 $\mathrm{display}[k] = \mathrm{nil}$。
- 性质：`x` 是 `D` 或 `D` 的任意子类的实例 $\iff$ `x` 的描述符中 $\mathrm{display}[j] = D$；否则不成立。
- 故 `x instanceof D` 仅需：
  - (1) 取 `x` 偏移 $0$ 的描述符 $d$；(2) 取 $d$ 的第 $j$ 个类指针槽 $\mathrm{display}[j]$；(3) 与描述符 $D$ 比较。常数时间。

### 类型强制转换(Type Coercion)

- 设变量 `c` 的类型为 `C`：
  - 把 `c` 当作 `C` 的任意父类型使用：合法且安全。如 `var b : B := c`（`C extends B`）。向上转型(upcast)总安全。
  - 反之不然：`c ← b` 只有当 `b` 运行时确实是 `C` 的实例时才安全，否则——

```
b ← new B
c ← b
c.some_field_of_C_but_not_B   // 行为不可预测
```

- Modula-3、Java：从父类到子类的强制转换(downcast)伴随运行时类型检查，若运行时值不是该子类实例则抛异常（即除非 `b instanceof C`）。

```
Modula-3:                    Java:
IF ISTYPE(b,C)               if (b instanceof C)
  THEN f(NARROW(b,C))            f((C)b)
ELSE ...                     else ...
```

- C++ 的 static cast 无运行时检查，因而不安全。

### Typecase

- Modula-3 的 typecase 让“测试-再窄化(test-then-narrow)”惯用法更简洁高效：

```
TYPECASE expr
OF C1 (v1) => S1
 | C2 (v2) => S2
       .
       .
 | Cn (vn) => Sn
ELSE S0
END
```

- 若多个 $C_i$ 同时匹配(如其中一个是另一个的父类)，只取第一个匹配的子句；若都不匹配，则取 ELSE 子句。
- 可直接翻译为一串 else-if，每个 if 做：(1) 一次实例测试；(2) 一次窄化(narrowing)；(3) 一个局部变量声明。

## 私有字段与方法

- 真正的 OO 语言能保护对象字段，使其不被其他对象的方法直接操作。
  - 私有字段：不能被对象外部声明的任何函数或方法读取/更新。
  - 私有方法：不能从对象外部调用。
- 私有性由编译器的类型检查阶段强制执行。
- 实现：在类 `C` 的符号表中，每个字段偏移与方法偏移旁附一个布尔标志，标明该成员是否私有。

私有与保护的多种形式（不同语言各有取舍，一般由编译期类型检查静态实施）：

- 仅声明该成员的类可访问；
- 声明类及其任意子类可访问；
- 仅与声明类同一模块(包/命名空间)内可访问；
- 从声明类外部只读、但类自身的方法可写。

## 评述与要点提炼

- 前缀法是单继承的灵魂：把“同名成员在所有子类中保持相同偏移量”做成不变式，于是字段访问与动态分派都退化为“常数偏移取值”，无需运行时查找。这是单继承高效的根本原因，也是考试高频点。
- 一层间接换灵活：动态分派的代价是对象头部多一个描述符/vtable 指针，调用多一次间接(取描述符 $\to$ 取槽 $\to$ 跳转)。理解“为何不能在编译期定死 `A_f`”比记住三步更重要。
- 多继承的本质困难是“无法让多个父类同时占据记录开头”，由此分出两条路线：全局图着色(偏移全局一致、有内部碎片、需链接期全局信息、难配动态加载) 对 每类哈希(分离编译与动态链接友好、但每次访问要哈希加冲突检测)。这是“静态全局优化”与“动态局部灵活”的经典权衡。
- instanceof 的两种实现对应“时间换空间”与“空间换时间”：循环上溯省空间但耗时 $O(\text{继承深度})$；display 数组以每类固定 $20$ 字的空间换来 $O(1)$ 判定，其成立前提是继承深度有上界且 $j$ 编译期已知。
- 安全的类型系统把“向下转型”视为可能失败的运算：Java 与 Modula-3 用运行时检查兜底(instanceof 加异常)，C++ 的 static cast 把责任丢给程序员因而不安全；typecase 只是该模式的语法糖，可机械展开为 if-instanceof-narrow 链。
- 串联记忆：本章五节其实回答同一个问题——“给定一个静态类型不精确的对象引用，如何在运行时正确而高效地定位它的字段、方法与真实类型”，前缀法、vtable、图着色、哈希、display 都是这一问题在不同继承模型下的工程答案。
