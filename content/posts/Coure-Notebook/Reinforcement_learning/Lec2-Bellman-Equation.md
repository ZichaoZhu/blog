---
title: "Lec2: Bellman Equation"
date: "2026-01-22"
description: "从回报的递推性出发推导 Bellman 方程:状态价值函数的定义、矩阵形式的封闭解,以及策略评估在 MDP 上的意义。"
tags: ["强化学习","课程笔记","计算机科学"]
category: "强化学习"
author: "zhuzichao"
draft: false
---

## Why return is important

​	在上一节中我们介绍过了 return，return 之所以很重要，是因为 return 可以帮助我们直观地确定哪一种策略更好。

![image-20260119121219498](./assets/image-20260119121219498.png)

​	对于上面的例子，我们可以计算出各个 return 如下：
$$
return_1 = 0+\gamma1+\gamma^21+\gamma^31+\dots=\frac{\gamma}{1-\gamma} \\
return_2=1+\gamma1+\gamma^21+\gamma^31+\dots=1+\frac{\gamma}{1-\gamma} \\
return_3 = 0.5 \times return_1 + 0.5 \times return_2=0.5+\frac{\gamma}{1-\gamma} \\
return_2 > return_3 > return_1
$$
​	得到第一种策略优于第三种策略优于第二种策略。

## How to calculate return

​	下面我们来看一种情况，计算各个 return：

![image-20260119121849051](./assets/image-20260119121849051.png)

​	让 $v_i$ 代表从 $s_i$ 开始得到的 return，计算结果如下：
$$
v_1 = r_1+\gamma r_2+\gamma^2 r_3+\dots \\
v_2 = r_2+\gamma r_3+\gamma^2 r_4+\dots \\
v_3=r_3+\gamma r_4 + \gamma^2 r_1 + \dots \\
v_4 = r_4 + \gamma r_1 + \gamma^2 r_2 + \dots
$$
​	这种方法非常直观，但实际上，我们还有另外一种计算方法：
$$
v_1 = r_1+\gamma v_2 \\
v_2 = r_2+\gamma v_3 \\
v_3 = r_3 +\gamma v_4 \\
v_4 = r_4 + \gamma v_1
$$
​	这告诉我们，一个状态的 return 实际上是依赖于别的状态的 return 的。在强化学习中我们称之为 ==Bootstrapping==。

​	上面的公式还可以写成矩阵形式：
$$
\underbrace{\begin{bmatrix} v_1 \\ v_2 \\ v_3 \\ v_4 \end{bmatrix}}_{\mathbf{v}}
=
\begin{bmatrix} r_1 \\ r_2 \\ r_3 \\ r_4 \end{bmatrix}
+
\begin{bmatrix} \gamma v_2 \\ \gamma v_3 \\ \gamma v_4 \\ \gamma v_1 \end{bmatrix}
=
\underbrace{\begin{bmatrix} r_1 \\ r_2 \\ r_3 \\ r_4 \end{bmatrix}}_{\mathbf{r}}
+ \gamma
\underbrace{\begin{bmatrix} 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \\ 1 & 0 & 0 & 0 \end{bmatrix}}_{\mathbf{P}}
\underbrace{\begin{bmatrix} v_1 \\ v_2 \\ v_3 \\ v_4 \end{bmatrix}}_{\mathbf{v}}
$$
​	也就是：
$$
\mathbf{v} = \mathbf{r} + \gamma \mathbf{P} \mathbf{v}
$$
​	其中，$\mathbf{P}$ 是一个关于策略以及 state transition 等东西的矩阵，之后会详细介绍。

​	这就是针对 specific deterministic problem 的 Bellman

### Another Example

![image-20260119123304806](./assets/image-20260119123304806.png)

## State value

​	考虑以下单步过程：
$$
S_t \xrightarrow{A_t}R_{t+1},S_{t+1}
$$
​	这个单步的过程是被以下概率所约束的：
$$
S_t \rightarrow A_t:\pi(A_t = a \mid S_t=s)\\
S_t,A_t \rightarrow R_{t+1}:p(R_{t+1}=r \mid S_t=s,A_t=a)\\
S_t,A_t \rightarrow S_{t+1}:p(S_{t+1}=s' \mid S_t=s,A_t=a)
$$
​	对于以上单步过程，我们可以推广到多步过程：
$$
S_t \xrightarrow{A_t}R_{t+1},S_{t+1} \xrightarrow{A_{t+1}}R_{t+2},S_{t+2} \xrightarrow{A_{t+2}}R_{t+3},\dots
$$
​	我们记这个多步 trajectory 的 discount return 为：
$$
\begin{gather*}
\begin{aligned}
G_t &= R_{t+1} + \gamma R_{t+2} + \gamma^2 R_{t+3} + \dots \\
    &= R_{t+1} + \gamma G_{t+1}
\end{aligned} \\
\gamma \in [0, 1)
\end{gather*}
$$

> [!NOTE]
>
> 像 $G_t$、$R_t$、$S_t$ 这一类的符号，都是 random variable（随机变量），也就是说，可以使用概率学公式对它们进行计算分析。

​	在前面介绍这么多以后，我们来介绍 state value。

​	实际上，state value 被定义为 $G_t$ 的期望：
$$
\begin{align*}
v_{\pi}(s) &= \mathbb{E}[G_t \mid S_t = s] \\
&=\mathbb{E}[R_{t+1}+\gamma G_{t+1} \mid S_t = s] \\
&=\mathbb{E}[R_{t+1}\mid S_t = s] + \mathbb{E}[\gamma G_{t+1} \mid S_t = s] \\
&=\mathbb{E}[R_{t+1}\mid S_t = s] + \gamma \mathbb{E}[G_{t+1} \mid S_t = s]
\end{align*}
$$
​	需要注意以下几点：

* 状态从 s 开始
* 基于 policy $\pi$
* state value 越高，说明策略越好

> [!NOTE]
>
> Return value 和 state value 是什么关系？
>
> * The state value is the mean of all possible returns that can be obtained starting from a state. 
> * 若所有 - $\pi(a|s)$, $p(r|s, a)$, $p(s'|s, a)$ - 是确定的，那么 state value 就和 return 一样

## Bellman equation

​	推导过程如下所示：
$$
\begin{align*}
\mathbb{E}[G_{t+1} | S_t = s] &= \sum_{s'} \mathbb{E}[G_{t+1} | S_t = s, S_{t+1} = s'] p(s'|s) \\
&= \sum_{s'} \mathbb{E}[G_{t+1} | S_{t+1} = s'] p(s'|s) \\
&= \sum_{s'} v_{\pi}(s') p(s'|s) \\
&= \sum_{s'} v_{\pi}(s') \sum_{a} p(s'|s, a) \pi(a|s)
\end{align*}
$$
​	结合上面的公式，可以推导出：
$$
\begin{align*}
\textcolor{red}{v_{\pi}(s)} &= \mathbb{E}[R_{t+1} \mid S_t = s] + \gamma \mathbb{E}[G_{t+1} \mid S_t = s], \\
&= \textcolor{blue}{\underbrace{\color{black}\sum_{a} \pi(a|s) \sum_{r} p(r|s, a)r}_{\text{mean of immediate rewards}}} + \textcolor{blue}{\underbrace{\color{black}\gamma \sum_{a} \pi(a|s) \sum_{s'} p(s'|s, a) \textcolor{red}{v_{\pi}(s')}}_{\text{mean of future rewards}}}, \\
&= \textcolor{blue}{\sum_{a} \pi(a|s) \left[ \sum_{r} p(r|s, a)r + \gamma \sum_{s'} p(s'|s, a) \textcolor{red}{v_{\pi}(s')} \right]}, \quad \forall s \in \mathcal{S}.
\end{align*}
$$

> [!NOTE]
>
> 看似这里只有一条式子，且 $v_{\pi}(s)$ 的计算是依赖于 $v_{\pi}(s)$ 的。但实际上，我们可以对 $\forall s \in S$，都得到这一条式子，因此可以得到多条方程，从而计算出结果。这也就是 Bpptstrapping。

* $\pi(a \mid s)$ 是一个给定的策略。解决这个方程的过程叫做 ==policy evaluation==。
* $p(r \mid s,a)$ 和 $p(s' \mid s,a)$ 代表着动态的模型。

### Example 1

![image-20260119155152049](./assets/image-20260119155152049.png)

![image-20260119155225648](./assets/image-20260119155225648.png)

![image-20260119155247456](./assets/image-20260119155247456.png)

![image-20260119155359699](./assets/image-20260119155359699.png)

### Example 2

![image-20260119155544784](./assets/image-20260119155544784.png)

![image-20260119155606891](./assets/image-20260119155606891.png)

## Matrix-vector form

$$
v_{\pi}(s)= {\sum_{a} \pi(a|s) \left[ \sum_{r} p(r|s, a)r + \gamma \sum_{s'} p(s'|s, a){v_{\pi}(s')} \right]}, \quad \forall s \in \mathcal{S}.
$$

​	对于上面的贝尔曼表达式，我们可以进行一些处理：
$$
r_{\pi}(s) \doteq \sum_{a \in \mathcal{A}} \pi(a|s) \sum_{r \in \mathcal{R}} p(r|s, a)r \\
p_{\pi}(s'|s) \doteq \sum_{a \in \mathcal{A}} \pi(a|s) p(s'|s, a) \\
v_{\pi}(s)=r_{\pi}(s)+\gamma \sum_{s'}p_{\pi}(s' \mid s)v_{\pi}(s')
$$

​	其中，$r_{\pi}(s)$ 代表的是当前 $s$ 情况下所可以获得的平均奖励；而 $p_{\pi}(s' \mid s)$ 则代表从状态 $s$ 到达状态 $s'$ 的概率。

​	详细解释$r_{\pi}(s)$。实际上 $\sum_{r \in \mathcal{R}} p(r|s, a)r$ 代表在当前状态 $s$ 下，选择动作 $a$ 的平均可获得奖励。

​	我们对每一个状态 states 标号为 $s_i \; (i=1,\dots,n)$，于是对于上面的贝尔曼公式，我们可以写成下面的格式：
$$
v_{\pi}(s_i)=r_{\pi}(s_i)+\gamma \sum_{s_j}p_{\pi}(s_j \mid s_i)v_{\pi}(s_j)
$$
​	将所有的这些公式放在一起，并写成向量形式：
$$
v_{\pi}=r_{\pi}+\gamma P_{\pi}v_{\pi} \\
v_{\pi} = [v_{\pi}(s_1), \ldots, v_{\pi}(s_n)]^T \in \mathbb{R}^n \\
r_{\pi} = [r_{\pi}(s_1), \ldots, r_{\pi}(s_n)]^T \in \mathbb{R}^n \\
P_{\pi} \in \mathbb{R}^{n \times n},[P_{\pi}]_{ij} = p_{\pi}(s_j|s_i),
$$
​	其中，$P_{\pi}$ 代表的是状态转移矩阵。例子如下：

![image-20260201185224003](./assets/image-20260201185224003.png)

## Solve state values

​	给定一个 policy，找到一个对应的 state value 的过程被称为 ==policy evaluation==。

​	我们可以根据公式直接计算得到（closed-form solution）：
$$
v_{\pi}=(I-\gamma P_{\pi})^{-1}r_{\pi}
$$
​	但实际上，我们并不会使用这个公式，因为这个公式需要求一个矩阵的逆，这很费时。

​	实际上，可以使用==迭代法==来进行计算：
$$
v_{k+1}=r_{\pi}+\gamma P_{\pi}v_{k}
$$
​	刚开始时，我们随便代入一个变量 $v_0$，并一直计算，就可以得到一个近似解。其数学上的保证如下：
$$
v_k \rightarrow v_{\pi}=(I-\gamma P_{\pi})^{-1}r_{\pi}, \; k \rightarrow \infin
$$

> [!NOTE]
>
> 上面相关的证明如下：
>
> ![image-20260201191114658](./assets/image-20260201191114658.png)

## Action value

​	Action value 指的是 ==the average return the agent can get starting from a state and taking an action==，也就是：
$$
q_{\pi}(s,a)=\mathbb{E}_{\pi}[G_{t} \mid S_t=s,A_t=a]
$$
​	其与 state value 有如下关系：
$$
v_{\pi}(s)=\sum_{a \in \mathcal{A}}\pi(a \mid s) \cdot q_{\pi}(s,a)
$$
​	结合之前贝尔曼公式的形式，我们可以得到：
$$
q_{\pi}(s,a)=\sum_{r} p(r \mid s, a)r + \gamma \sum_{s'} p(s'\mid s, a){v_{\pi}(s')}
$$
​	根据上面的两个公式，我们可以知道：

* 若我们知道所有的 $v_{\pi}(s)$，则我们可以计算出所有的 Action value $q_{\pi}(s,a)$
* 若我们知道所有的 Action value $q_{\pi}(s,a)$，则我们可以计算出所有的 state value $v_{\pi}(s)$

