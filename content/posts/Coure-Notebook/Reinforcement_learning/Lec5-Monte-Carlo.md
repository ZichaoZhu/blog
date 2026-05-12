---
title: "Lec5: Monte Carlo Learning"
date: "2026-02-12"
description: "从 Model-based 走向 Model-free:用蒙特卡洛采样估计动作价值,介绍 MC Basic、Exploring Starts 与 ε-Greedy 等同策略 MC 方法。"
tags: ["强化学习","课程笔记","计算机科学"]
category: "强化学习"
author: "zhuzichao"
draft: false
---

## Model based & Model free

## Model based & Model free

​	Model 通常指“环境的运行规律”，也就是我们前面经常提到的状态转移概率 $P(s' \mid s,a)$ 以及奖励函数 $R(s,a)$。

​	强化学习有两种，Model-based 和 Model-free。前者先构建出 $P$ 和 $R$，再进行学习；后者则是在真实环境中不断试错。大多数经典的深度强化学习的算法，比如 Q-Learning、DQN、DDPG、PPO 等，全都是 Model-free 的。

## Motivating example

​	举个例子，假如我们投掷硬币，结果记为随机变量 $X$。当硬币面朝上时，$X=+1$；当硬币面朝下时，$X=-1$。我们的目标是要计算 $\mathbb{E}[X]$。

### Model-based approach

​	使用 Model-based 的方法，我们首先需要知道各个动作发生的概率。我们假设：
$$
p\left(X=1\right)=0.5,\;p\left(X=-1\right)=0.5,\\
\therefore \mathbb{E}[X]=\sum_xxp(x)=0
$$
​	但是在实际中，我们不可能知道准确的概率 $p$。

### Model-free approach

​	Model-free 方法的思想是，当抛硬币的次数足够多后，就可以计算结果的平均。也就是：
$$
\mathbb{E}[X] \approx \bar{x}
= \frac{1}{N} \sum_{j=1}^{N} x_j
$$
​	在这里，$\{x_1,x_2,\dots,x_N\}$ 是随机样本。

![image-20260222122503962](./assets/image-20260222122503962.png)

​	结果如上所示。可以看到，当 $N$ 过小的时候，估计并不是很精确；随着 $N$ 变大，估计越来越精确。

### 大数定理

​	上面的结果可以用大数定理来证明：

> [!IMPORTANT]
>
> **Law of Large Numbers**
>
> 对于随机变量 $X$，假设 $\{x_j\}_{j=1}^N$ 是一些==独立同分布==的样本。让 $\bar x = \frac{1}{N}\sum_{j=1}^Nx_j$ 为这些样本的平均，则有：
> $$
> \mathbb{E}[\bar x]=\mathbb{E}[X] \\
> \operatorname{Var}[\bar x]=\frac{1}{N} \operatorname{Var}[X]
> $$
> 当 $N \rightarrow \infin$ 时，$\frac{1}{N} \operatorname{Var}[X] \rightarrow 0$，也就是 $\bar x$ 的偏差趋向于 0。

## MC Basic 算法

​	实际上，这个算法最本质的想法就是将 Policy iteration 中的一部分转换成  model-free。

​	在之前的课程中我们知道，policy iteration 中有一下两部分：

* Policy evaluation：$v_{\pi_k}=r_{\pi_k}+\gamma P_{\pi_k}v_{\pi_k}$
* Policy improvement：$\pi_{k+1}=\arg \max_\pi(r_\pi+\gamma P_\pi v_{\pi_k})$

​	针对 policy improvement，在之前的课程中，我们都是使用其 elementwise form，也就是：
$$
\begin{align}
\pi_{k+1}(s)
&= \arg\max_{\pi} \sum_{a} \pi(a \mid s)
\left[
\sum_{r} p(r \mid s,a)\, r
+ \gamma \sum_{s'} p(s' \mid s,a)\, v_{\pi_k}(s')
\right] \\
&= \arg\max_{\pi} \sum_{a} \pi(a \mid s)\, q_{\pi_k}(s,a),
\qquad s \in \mathcal{S}.
\end{align}
$$
​	在上面的公式中，关键是 $q_{\pi_k}(s,a)$ 的计算。

​	我们有两种方法计算 $q_{\pi_k}(s,a)$：

* $q_{\pi_k}(s,a)=\sum_{r}p(r \mid s,a)r+\gamma \sum_{s'}p(s' \mid s,a)v_{\pi_k}(s')$，显然这种方法是需要 model 的。
* $q_{\pi_k}(s,a)=\mathbb{E}[G_t \mid S_t=s,A_t=a]$，这个方法是不需要 model 的。

### The procedure of Monte Carlo estimation of action values

​	下面展示如何采样 action value：

1. 从状态 $(s,a)$ 出发，按照策略 $\pi_k$，生成一个 episode
2. 将 return 记为 $g(s,a)$，$g(s,a)$ 是 $G_t$ 的一个样本，其中 $G_t$ 满足：$q_{\pi_k}(s,a)=\mathbb{E}[G_t \mid S_t=s,A_t=a]$
3. 假设我们有一系列的 episode，就可以采样到一系列的 $\{g^{(j)}(s,a)\}$，于是有 $q_{\pi_k}=\mathbb{E}[G_t \mid S_t=s,A_t=a] \approx \frac{1}{N}\sum_{i=1}^N g^{(i)}(s,a)$

​	也就是这样的思想：当 model 不可获得的时候，我们就使用 data 来代替 model

### Pseudocode

![image-20260222143551214](./assets/image-20260222143551214.png)

### Episode length

​	我们通过一个例子观察 episode length 对于策略的影响。

> $5 \times 5$ grid world
>
> Reward setting：$r_{boundary}=-1,\;r_{forbidden}=-10,\;r_{target}=1,\; \gamma=0.9$
>
> ![image-20260222144446038](./assets/image-20260222144446038.png)

​	随着 episode length 的增长，policy 会发生如下变化：

![image-20260222144557637](./assets/image-20260222144557637.png)
![image-20260222144625124](./assets/image-20260222144625124.png)

* 可以看到，随着 episode length 变大，target 附近最佳的 policy 的范围变大。
* 每一个 $s$ 所对应的 return $g(s,a)$ 越来越趋近于真实的 state value。
* 在实际中，episode length 需要足够大，但不需要无限大。

## MC Exploring Starts

$$
s_1 \xrightarrow{a_2} s_2 
\xrightarrow{a_4} s_1 
\xrightarrow{a_2} s_2 
\xrightarrow{a_3} s_5 
\xrightarrow{a_1} \cdots
$$

​	每当有一个 state-action 对 $(s,a)$ 出现在这个 episode 中，我们就将其称为一个 visit。

​	在之前的算法中，我们都是采用这样一条 episode 去计算一个 return 并以此估计 $q_\pi(s_1,a_2)$，但显然这样数据利用效率太低。

​	我们可以采用下面的方式：
$$
\begin{array}{l l}
s_1 \xrightarrow{a_2} s_2 
\xrightarrow{a_4} s_1 
\xrightarrow{a_2} s_2 
\xrightarrow{a_3} s_5 
\xrightarrow{a_1} \cdots
& [\text{original episode}] \\[6pt]

s_2 \xrightarrow{a_4} s_1 
\xrightarrow{a_2} s_2 
\xrightarrow{a_3} s_5 
\xrightarrow{a_1} \cdots
& [\text{episode starting from } (s_2, a_4)] \\[6pt]

s_1 \xrightarrow{a_2} s_2 
\xrightarrow{a_3} s_5 
\xrightarrow{a_1} \cdots
& [\text{episode starting from } (s_1, a_2)] \\[6pt]

s_2 \xrightarrow{a_3} s_5 
\xrightarrow{a_1} \cdots
& [\text{episode starting from } (s_2, a_3)] \\[6pt]

s_5 \xrightarrow{a_1} \cdots
& [\text{episode starting from } (s_5, a_1)]
\end{array}
$$
​	通过这种方式，我们可以估计 $q_\pi(s_1,a_2),q_\pi(s_2,a_4),q_\pi(s_2,a_3),q_\pi(s_5,a_1),\dots$

* 一条 episode 上可能会有多个相同的 visit。有两种方案供采用：
  * first-visit method：只计算一次，下次碰到相同的 visit 不计算
  * every-visit method：计算多次，碰到相同的 visit 依旧计算
* 面对何时更新策略的问题，也有两种不同的方案：
  * 一种方案是收集所有的以当前 state-action pair 为起点的 episode 的return，计算平均值后更新。
  * 另一种方案是在找到一个符合要求的 episode 后，计算 return 并立刻更新，作为近似的 action value。

### Generalized policy iteration

​	简称为 GPI。It refers to the general idea or framework of switching between policy-evaluation and policy-improvement processes.

​	许多  model-based 和 model-free 算法都可以归到这个框架里。

### Pseudocode

![image-20260222161436417](./assets/image-20260222161436417.png)

* 需要注意的是，在这个算法中，是从后向前计算 return value 的。 

### Exploring starts

​	理论上，我们需要确保每一个 state-action 对都能被访问。

​	由于在一条 episode 上，不总是所有的 state-action 对都能被访问，因此总会存在多条 episode，它们的开头 state 不一样。

​	这点体现在实际上就是我们需要不断改变机器的起始位置，这点非常麻烦。下一个算法可以解决这个问题。

## MC Epsilon-Greedy

### Soft policy

​	我们称一个策略是 soft 的，若其采取任何 action 的可能性是大于 0 的。

​	有了 soft policy，我们就可以确保存在一条足够长的 episode，其可以访问到所有的 state-action 对。此时，可以移除 exploring starts。

### $\varepsilon$-greedy policy

$$
\pi(a \mid s)
=
\begin{cases}
1 - \dfrac{\varepsilon}{|\mathcal{A}(s)|} \left(|\mathcal{A}(s)| - 1\right),
& \text{for the greedy action}, \\[10pt]

\dfrac{\varepsilon}{|\mathcal{A}(s)|},
& \text{for the other } |\mathcal{A}(s)| - 1 \text{ actions}.
\end{cases}
$$

* 选择 greedy action 的概率总是比选择非 greedy action 的概率要大的。因为 $1-\frac{\varepsilon}{|\mathcal{A}(s)|}(|\mathcal{A}(s)|-1)=1-\varepsilon+\frac{\varepsilon}{|\mathcal{A}(s)|} \geq \frac{\varepsilon}{|\mathcal{A}(s)|}$

​	$\varepsilon$ 的选择体现了 exploitattion 和 exploration 之间的平衡：

* 当 $\varepsilon = 0$ 时，策略就变得贪婪。每一步都是选择 greedy action，探索性（exploration）变少但利用性（exploitataion）变多。
* 当 $\varepsilon=1$ 时，就变成平均分配了。探索性（exploration）变多但利用性（exploitataion）变少。

### How to embed $\varepsilon$-greedy into MC-based RL algorithms?

​	在 MC-based 和 MC Exploring Starts 算法中，policy improvement 阶段如下：
$$
\pi_{k+1}(s)
=
\arg\max_{\pi \in \Pi}
\sum_{a} \pi(a \mid s)\, q_{\pi_k}(s,a).
$$
​	其中 $\Pi$ 代表所有可能的策略。

​	根据之前的内容可知，最优策略就是：
$$
\pi_{k+1}(a \mid s)
=
\begin{cases}
1, & a = a_k^* \\
0, & a \ne a_k^*
\end{cases}
\\
\text{where } 
a_k^*
=
\arg\max_{a} q_{\pi_k}(s,a)
$$
​	我们对 policy improvement 阶段进行更改：
$$
\pi_{k+1}(s)
=
\arg\max_{\pi \in \Pi_{\varepsilon}}
\sum_{a} \pi(a \mid s)\, q_{\pi_k}(s,a)
$$
​	其中 $\Pi_\varepsilon$ 代表所有可能的 $\varepsilon$-greedy 策略。

​	最优策略为：
$$
\pi_{k+1}(a \mid s)
=
\begin{cases}
1 - \dfrac{|\mathcal{A}(s)| - 1}{|\mathcal{A}(s)|}\,\varepsilon,
& a = a_k^* \\[10pt]

\dfrac{\varepsilon}{|\mathcal{A}(s)|},
& a \ne a_k^*
\end{cases}
$$

### Pseudocode

![image-20260222181402773](./assets/image-20260222181402773.png)

### Advantages and Disadvantages

* $\varepsilon$-greedy policy 的优点在于，其探索能力很强，因此 exploration starts condition 就不再需要了。
* 缺点在于其得到的最优策略不一定是全局的最优策略了（因为其仅仅是$\varepsilon$-greedy policy 情况下的最优）。

​	实际中我们可以逐步控制 $\varepsilon$ 的大小

### Consistency

![image-20260222182552136](./assets/image-20260222182552136.png)

* 注意到当 $\varepsilon=0.1$ 时策略和 $\varepsilon=0$ 时的相同。我们称为 consistency。
* 可以看到，当 $\varepsilon$ 越大的时候，得出的最优策略实际上是越差的。因此在实际中，我们需要保持 $\varepsilon$ 在一个比较小的值。