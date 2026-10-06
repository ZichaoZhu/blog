---
id: "machine-learning-lec5"
slug: "machine-learning-lec5"
title: "Lec5: 最大似然估计"
description: "区分概率、密度与似然，推导高斯和类别分布的最大似然估计。"
contentKind: "note"
type: "course"
topics: ["machine-learning"]
visibility: "published"
author: "Goongmly"
course: {"id":"machine-learning","order":5}
tags: ["机器学习","课程笔记","计算机科学"]
category: "机器学习"
---



## 概率、密度与似然

离散概率质量求和为 $1$，连续概率密度积分为 $1$。连续密度可以大于 $1$；单点密度值不是该点的概率。

概率模型固定参数，研究数据的分布；似然固定观测数据，把参数视为自变量：

$$
L(\theta;\mathcal D)=p(\mathcal D\mid\theta).
$$

似然通常不是关于参数的概率分布，也不等于后验。

最大似然估计（MLE）为：

$$
\hat\theta_{\mathrm{MLE}}\in\arg\max_{\theta\in\Theta}p(\mathcal D\mid\theta).
$$

模型族、估计准则与优化算法是不同层面；MLE 是估计准则。

## 对数似然与训练损失

对给定参数后独立同分布的样本：

$$
L(\theta)=\prod_{i=1}^{N}p(x_i\mid\theta).
$$

$$
\ell(\theta)=\log L(\theta)=\sum_{i=1}^{N}\log p(x_i\mid\theta).
$$

对数单调递增，因此最优参数不变；乘积变求和也便于计算和求导。使用最小化优化器时，目标应为负对数似然：

$$
J(\theta)=-\ell(\theta).
$$

只能省略与当前优化变量无关的项。高斯归一化常数在估计均值时可以省略，在估计方差时不能省略。

## 一元高斯 MLE

设：

$$
X_i\overset{\mathrm{i.i.d.}}\sim\mathcal N(\mu,\sigma^2),\qquad v=\sigma^2>0.
$$

对数似然为：

$$
\ell(\mu,v)=-\frac N2\log(2\pi)-\frac N2\log v
-\frac1{2v}\sum_{i=1}^{N}(x_i-\mu)^2.
$$

对均值求导并令其为零：

$$
\frac{\partial\ell}{\partial\mu}=\frac1v\sum_i(x_i-\mu)=0
\quad\Longrightarrow\quad
\hat\mu=\bar x=\frac1N\sum_i x_i.
$$

对方差求导：

$$
\frac{\partial\ell}{\partial v}=-\frac N{2v}
+\frac1{2v^2}\sum_i(x_i-\mu)^2=0.
$$

得到：

$$
\hat\sigma^2_{\mathrm{MLE}}=\frac1N\sum_i(x_i-\bar x)^2.
$$

若离差平方和为正，这是有限最大点；若所有样本相同，方差趋于零可使似然无界，普通正方差高斯族中没有可达到的最大值。

## 方差分母：N 与 N−1

未知均值时，方差 MLE 有偏：

$$
\mathbb E[\hat\sigma^2_{\mathrm{MLE}}]=\frac{N-1}{N}\sigma^2.
$$

无偏样本方差为：

$$
s^2=\frac1{N-1}\sum_i(x_i-\bar x)^2.
$$

区别来自使用同一批样本估计均值。MLE 最大化似然，无偏估计约束期望，目标不同。若真实均值已知，围绕真实均值计算时分母 $N$ 可以无偏。

## 类别分布 MLE

一次试验的类别服从 Categorical；多次试验的类别计数服从 Multinomial。设类别数为 $K$，第 $k$ 类出现 $n_k$ 次：

$$
\theta_k\geq0,\qquad\sum_k\theta_k=1,\qquad\sum_kn_k=N.
$$

忽略与参数无关的组合系数：

$$
\ell(\theta)=\sum_{k=1}^{K}n_k\log\theta_k.
$$

对内部解，引入拉格朗日乘子：

$$
\mathcal L(\theta,\nu)=\sum_kn_k\log\theta_k
+\nu\left(1-\sum_k\theta_k\right).
$$

$$
\frac{n_k}{\theta_k}-\nu=0,\qquad\sum_k\theta_k=1
\quad\Longrightarrow\quad\nu=N.
$$

于是：

$$
\hat\theta_k=\frac{n_k}N.
$$

未观察到的类别对应边界解 $\hat\theta_k=0$，不能假定所有最优参数都在内部。Bernoulli 是二类别特例，成功概率的 MLE 等于成功频率。

零频数不证明真实概率为零。先验或平滑可以避免未观察类别被赋予零概率。

## 点估计与适用条件

MLE 返回一个参数值，不直接给出参数后验。观测噪声与参数估计不确定性不同，例如：

$$
\operatorname{Var}(\hat\mu)=\frac{\sigma^2}{N}.
$$

数据噪声不变时，增加样本仍可使均值估计更稳定。

MLE 的一致性、渐近效率需要模型正确设定、可辨识性与相应正则条件；不能推出任意有限样本中都无偏、方差最小。模型错设时，估计不应被称为恢复真实参数。

对一一对应的重参数化 $\eta=g(\theta)$：

$$
\hat\eta_{\mathrm{MLE}}=g(\hat\theta_{\mathrm{MLE}}).
$$

MLE 可能不唯一、位于边界，甚至不存在可达到的最大值。复杂模型一般需要数值优化，而非仅靠令导数为零得到闭式解。
