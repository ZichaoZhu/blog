---
title: "Lec4: Value Iteration & Policy Iteration"
date: "2026-02-05"
description: "求解 Bellman 最优方程的两条经典路径:Value Iteration 直接迭代 Bellman 算子,Policy Iteration 在策略评估与改进之间交替,并讨论二者的等价性与收敛性。"
tags: ["强化学习","课程笔记","计算机科学"]
category: "强化学习"
author: "zhuzichao"
draft: false
---

## Value iteration algorithm

## Value iteration algorithm

​	这一节的数学基础其实就是上节课介绍过的公式：
$$
v_{k+1}=f(v_k)=\max_\pi(r_\pi+\gamma P_\pi v_k)
$$
​	对于这个公式的计算，我们可以将其分为两个步骤：首先我们要处理右边的关于策略 $\pi$ 的优化问题（policy update）；然后我们要处理左边的新一轮的 value 的计算（value update）。

> [!NOTE]
>
> $v_{k}$ 并不是 state value，因为 $v_{k+1}=\max_\pi(r_\pi+\gamma P_\pi v_k)$ 中左右两边的 $v$ 是不一样的。

### Policy update

​	这一步是为了求出最优的策略的：
$$
\pi_{k+1}=\arg \max_\pi(r_\pi+\gamma P_\pi v_k)
$$

​	也就是：
$$
\pi_{k+1}(s) = \arg \max_{\pi} \sum_{a} \pi(a|s) \underbrace{\left( \sum_{r} p(r|s, a)r + \gamma \sum_{s'} p(s'|s, a)v_{k}(s') \right)}_{q_k(s,a)}, \quad s \in \mathcal{S}
$$

​	根据之前的经验，我们知道，想要到达最好的策略的话，就要：

$$
\pi_{k+1}(a|s) = \begin{cases} 
   1 & a = a_k^*(s) \\ 
   0 & a \neq a_k^*(s) 
\end{cases}
$$

​	此时：
$$
a_k^*(s) = \arg \max_{a} q_k(a, s)
$$
​	我们称 $\pi_{k+1}$ 为 greedy policy，因为此时选择的都是最好的 q-value。

### Value update

​	这一步是为了求出 state value：
$$
v_{k+1}=r_{\pi_{k+1}}+\gamma P_{\pi_{k+1}} v_k
$$

​	 需要注意的是，上面 value update 中的 $v_k$ 代表的并不是 state value，而是一个估计值。

​	展开公式，得到：
$$
v_{k+1}(s) = \sum_{a} \pi_{k+1}(a|s) \underbrace{\left( \sum_{r} p(r|s, a)r + \gamma \sum_{s'} p(s'|s, a)v_{k}(s') \right)}_{q_k(s,a)}, \quad s \in \mathcal{S} \\
v_{k+1}(s)=\sum_a \pi_{k+1}(a \mid s)q_k(s,a)
$$
​	根据上面的最优策略的选择，我们知道：
$$
v_{k+1}(s) = \max_{a} q_k(a, s)
$$
​	Value iteration algorithm 算法如下所示：

![image-20260203141539420](./assets/image-20260203141539420.png)

## Policy interation algorithm

​	正如名称所示，在这个方法中，我们更关注 policy 的衡量与优化，分为两个阶段：policy evaluation(PE)、policy improvement(PI)。

### Policy evaluation

​	在这一步中，我们需要去衡量（计算）当前策略的 state value 有多好：
$$
v_{\pi_k} = r_{\pi_k} + \gamma P_{\pi_k} v_{\pi_k}
$$
​	$v_{\pi_k}$ 是 state value function。

​	我们可以使用 Iteration solution 的方法来计算 $v_{\pi_k}$：
$$
v_{\pi_k}^{(j+1)} = r_{\pi_k} + \gamma P_{\pi_k} v_{\pi_k}^{(j)}, \quad j = 0, 1, 2, \dots \\
v_{\pi_k}^{(j+1)}(s) = \sum_a \pi_k(a|s) \left( \sum_r p(r|s, a)r + \gamma \sum_{s'} p(s'|s, a) v_{\pi_k}^{(j)}(s') \right), \quad s \in \mathcal{S}
$$
​	当 $j \rightarrow \infin$ 或者 $j$ 已经足够大了或者 $||v_{\pi_k}^{(j+1)}-v_{\pi_k}^{(j)}||$ 足够小的时候停止。

### Policy improvement

​	计算出 state value 后，就可以根据其值对策略进行优化：
$$
\pi_{k+1} = \arg\max_{\pi} (r_\pi + \gamma P_\pi v_{\pi_k})
\\
\pi_{k+1}(s) = \arg\max_{\pi} \sum_a \pi(a|s) \underbrace{\left( \sum_r p(r|s, a)r + \gamma \sum_{s'} p(s'|s, a)v_{\pi_k}(s') \right)}_{q_{\pi_k}(s, a)}, \quad s \in \mathcal{S}
$$
​	要想获得最优的策略，需要让 action 的奖励最大，也就是对应的 $q$ 最大：
$$
a_k^*(s)=\arg \max_aq_{\pi_k}(a,s)
$$
​	对应的策略为：
$$
\pi_{k+1}(a|s) = \begin{cases} 1 & a = a_k^*(s) \\ 0 & a \neq a_k^*(s) \end{cases}
$$

### Summary & algorithm

​	整个算法的流程如下所示：
$$
\pi_0 \xrightarrow{PE} v_{\pi_0} \xrightarrow{PI} \pi_1 \xrightarrow{PE} v_{\pi_1} \xrightarrow{PI} \pi_2 \xrightarrow{PE} v_{\pi_2} \xrightarrow{PI} \dots
$$
​	在这里，我们有四个问题：

> [!IMPORTANT] 
>
> Q1：在 PE 阶段，如何通过贝尔曼公式计算 state value $v_{\pi_k}$。
>
> Ans：
>
> 实际上我们就是要解决这个方程：
> $$
> v_{\pi_k} = r_{\pi_k} + \gamma P_{\pi_k} v_{\pi_k}
> $$
> 有两种方法，实际上我们在之前的课程中都学习过：
>
> 1. Closed-form solution：$v_{\pi_k} = (I - \gamma P_{\pi_k})^{-1} r_{\pi_k}$
> 2. Iterative solution：$v_{\pi_k}^{(j+1)} = r_{\pi_k} + \gamma P_{\pi_k} v_{\pi_k}^{(j)}, \quad j = 0, 1, 2, \dots$

> [!IMPORTANT]
>
> Q2：在 PI 阶段，为什么新策略 $\pi_{k+1}$ 会比 $\pi_k$ 好？
>
> Ans：
>
> 证明如下：
>
> ![image-20260221152633971](./assets/image-20260221152633971.png)
> ![image-20260221152646051](./assets/image-20260221152646051.png)

> [!IMPORTANT]
>
> Q3：为什么这样的一个算法可以最终到达最优策略？
>
> Ans：
>
> 首先，我们知道：$v_{\pi_0} \leq v_{\pi_1} \leq v_{\pi_2} \leq \dots \leq v_{\pi_k} \leq \dots \leq v^*$。接下来就是证明这个上界是可以取到的。
>
> 证明如下：
>
> ![image-20260221154550762](./assets/image-20260221154550762.png)

> [!IMPORTANT]
>
> Q4：policy iteration 和 value iteration 有什么关系？
>
> Ans：
>
> 它们两者其实是一个更普遍的算法 ==truncated policy iteration== 的两个极端。

​	算法如下：

![image-20260221161139642](./assets/image-20260221161139642.png)

### 例子

![image-20260221161521504](./assets/image-20260221161521504.png)

​	我们可以发现一个现象：靠近目标区域的策略会先达到最优。

## Truncated policy iteration algorithm

​	我们首先对上面讲过的两种迭代方式进行一个对比：

* Policy iteration：$$\pi_0 \xrightarrow{PE} v_{\pi_0} \xrightarrow{PI} \pi_1 \xrightarrow{PE} v_{\pi_1} \xrightarrow{PI} \pi_2 \xrightarrow{PE} v_{\pi_2} \xrightarrow{PI} \dots$$
* Value iteration：$$v_0 \xrightarrow{PU} \pi_1' \xrightarrow{VU} v_1 \xrightarrow{PU} \pi_2' \xrightarrow{VU} v_2 \xrightarrow{PU} \dots$$

​	具体对比如下：

|            | Policy iteration algorithm                                   | Value iteration algorithm                                | Comments                                            |
| ---------- | ------------------------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------- |
| 1) Policy: | $\pi_0$                                                      | N/A                                                      |                                                     |
| 2) Value:  | $v_{\pi_0} = r_{\pi_0} + \gamma P_{\pi_0} v_{\pi_0}$         | $v_0 := v_{\pi_0}$                                       |                                                     |
| 3) Policy: | $\pi_1 = \arg\max_{\pi} (r_{\pi} + \gamma P_{\pi} v_{\pi_0})$ | $\pi_1 = \arg\max_{\pi} (r_{\pi} + \gamma P_{\pi} v_0)$  | The two policies are the same                       |
| 4) Value:  | $v_{\pi_1} = r_{\pi_1} + \gamma P_{\pi_1} v_{\pi_1}$         | $v_1 = r_{\pi_1} + \gamma P_{\pi_1} v_0$                 | $v_{\pi_1} \ge v_1$ since $v_{\pi_1} \ge v_{\pi_0}$ |
| 5) Policy: | $\pi_2 = \arg\max_{\pi} (r_{\pi} + \gamma P_{\pi} v_{\pi_1})$ | $\pi_2' = \arg\max_{\pi} (r_{\pi} + \gamma P_{\pi} v_1)$ |                                                     |
| $\vdots$   | $\vdots$                                                     | $\vdots$                                                 | $\vdots$                                            |

​	我们考虑 `4)Value` 这一步，也就是解决 $v_{\pi_1} = r_{\pi_1} + \gamma P_{\pi_1} v_{\pi_1}$ 这一步：
$$
\begin{align*}
& \color{red}{v_{\pi_1}^{(0)}} = v_0 \\
\text{value iteration} \leftarrow \color{red}{v_1} \leftarrow \quad & v_{\pi_1}^{(1)} = r_{\pi_1} + \gamma P_{\pi_1} v_{\pi_1}^{(0)} \\
& v_{\pi_1}^{(2)} = r_{\pi_1} + \gamma P_{\pi_1} v_{\pi_1}^{(1)} \\
& \vdots \\
\color{red}{\rightarrow \text{truncated policy iteration}} \leftarrow \color{red}{\bar{v}_1} \leftarrow \quad & v_{\pi_1}^{(j)} = r_{\pi_1} + \gamma P_{\pi_1} v_{\pi_1}^{(j-1)} \\
& \vdots \\
\rightarrow \text{policy iteration} \leftarrow \color{red}{v_{\pi_1}} \leftarrow \quad & v_{\pi_1}^{(\infty)} = r_{\pi_1} + \gamma P_{\pi_1} v_{\pi_1}^{(\infty)}
\end{align*}
$$
​	中间的 truncated policy iteration 是一般情况。value iteration 和 policy iteration 可看作是 truncated policy iteration 在 $j=1$ 以及 $j \rightarrow \infin$ 的特殊情况。

​	其伪代码如下所示：

![image-20260221171442824](./assets/image-20260221171442824.png)

​	这三种算法的性能如下： 

![image-20260221171524906](./assets/image-20260221171524906.png)
