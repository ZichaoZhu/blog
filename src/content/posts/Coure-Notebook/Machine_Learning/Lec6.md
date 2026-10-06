---
id: "machine-learning-lec6"
slug: "machine-learning-lec6"
title: "Lec6: 多元高斯与高斯混合模型"
description: "均值、协方差、马氏距离，以及高斯混合的隐变量、边缘化和责任度。"
contentKind: "note"
type: "course"
topics: ["machine-learning"]
visibility: "published"
author: "Goongmly"
course: {"id":"machine-learning","order":6}
tags: ["机器学习","课程笔记","计算机科学"]
category: "机器学习"
---



## 均值与协方差

对随机向量 $X\in\mathbb R^d$：

$$
\mu=\mathbb E[X],\qquad
\Sigma=\mathbb E[(X-\mu)(X-\mu)^{\mathsf T}].
$$

$$
\Sigma_{jk}=\operatorname{Cov}(X_j,X_k)
=\mathbb E[X_jX_k]-\mathbb E[X_j]\mathbb E[X_k].
$$

对角元素为方差，非对角元素为协方差，矩阵对称。对任意向量 $a$：

$$
a^{\mathsf T}\Sigma a=\operatorname{Var}(a^{\mathsf T}X)\geq0.
$$

因此协方差矩阵半正定；所有非零方向方差均为正时才正定。两变量方差为正时，相关系数为：

$$
\rho_{XY}=\frac{\operatorname{Cov}(X,Y)}
{\sqrt{\operatorname{Var}(X)\operatorname{Var}(Y)}}\in[-1,1].
$$

期望的线性性不要求独立；线性组合的方差一般包含协方差项，不能无条件直接相加。

## 多元高斯密度

对正定协方差 $\Sigma$：

$$
p(x\mid\mu,\Sigma)=\frac1{(2\pi)^{d/2}|\Sigma|^{1/2}}
\exp\left[-\frac12(x-\mu)^{\mathsf T}\Sigma^{-1}(x-\mu)\right].
$$

$\mu$ 控制中心，$\Sigma$ 控制尺度和方向，$\Sigma^{-1}$ 称为精度矩阵。行列式项保证密度归一化。

一般协方差只需半正定，但以上含普通逆矩阵的全维密度公式要求正定；奇异协方差对应集中于低维子空间的退化高斯。

## 马氏距离与椭球主轴

平方马氏距离为：

$$
d_\Sigma^2(x,\mu)=(x-\mu)^{\mathsf T}\Sigma^{-1}(x-\mu).
$$

它按各方向的自然波动尺度衡量偏离。欧氏距离相同的两个点，在不同方向上的密度可能不同。

对协方差作特征分解：

$$
\Sigma=Q\Lambda Q^{\mathsf T},\qquad
\Lambda=\operatorname{diag}(\lambda_1,\ldots,\lambda_d).
$$

令 $u=Q^{\mathsf T}(x-\mu)$，等密度面满足：

$$
\sum_{j=1}^{d}\frac{u_j^2}{\lambda_j}=r^2.
$$

特征向量给出主轴方向，特征值给出该方向的方差，半轴长度为 $r\sqrt{\lambda_j}$。二维为椭圆，高维为椭球。

## 不相关与独立

有二阶矩时，独立推出零协方差，反向一般不成立。例：$X$ 在 $[-1,1]$ 上均匀分布，$Y=X^2$，二者协方差为零，却存在确定性依赖。

联合高斯的不同分量满足“零协方差等价于独立”；对角协方差使联合密度分解为各维高斯密度之积。

每个分量分别服从一元高斯，不足以证明整个向量联合高斯。

## 多元高斯 MLE

在非退化情形下：

$$
\hat\mu=\bar x=\frac1N\sum_{i=1}^{N}x_i.
$$

$$
\hat\Sigma=\frac1N\sum_{i=1}^{N}(x_i-\bar x)(x_i-\bar x)^{\mathsf T}.
$$

分母 $N$ 对应 MLE，$N-1$ 对应未知均值下的无偏样本协方差。中心化后：

$$
\operatorname{rank}(\hat\Sigma)\leq\min(d,N-1).
$$

$N\leq d$ 时必然奇异；样本更多也可能因线性相关而奇异。奇异结果不属于普通正定高斯密度族的内部，实际估计可限制协方差形式或加入正则化。

## 高斯混合的生成过程

高斯混合模型（GMM）为：

$$
p(x\mid\theta)=\sum_{k=1}^{K}\pi_k\mathcal N(x\mid\mu_k,\Sigma_k),
\qquad\pi_k\geq0,\quad\sum_k\pi_k=1.
$$

生成一个样本分两步：

$$
Z\sim\operatorname{Categorical}(\pi_1,\ldots,\pi_K).
$$

$$
X\mid Z=k\sim\mathcal N(\mu_k,\Sigma_k).
$$

即先选一个分量，再从该分量采样。它不是从所有分量各采一个向量后加权平均。

## 隐变量边缘化与似然

训练时不知道样本的分量归属，因此对隐变量求和：

$$
p(x_i\mid\theta)=\sum_kp(x_i,Z_i=k\mid\theta)
=\sum_k\pi_k\mathcal N(x_i\mid\mu_k,\Sigma_k).
$$

对数似然为：

$$
\ell(\theta)=\sum_{i=1}^{N}\log\left[
\sum_{k=1}^{K}\pi_k\mathcal N(x_i\mid\mu_k,\Sigma_k)\right].
$$

先对分量求和，再取对数；不能将和的对数改成对数之和。该结构耦合不同分量参数，一般没有联合闭式解。

## 责任度与软归属

$$
r_{ik}=P(Z_i=k\mid x_i,\theta)
=\frac{\pi_k\mathcal N(x_i\mid\mu_k,\Sigma_k)}
{\sum_j\pi_j\mathcal N(x_i\mid\mu_j,\Sigma_j)}.
$$

$$
0\leq r_{ik}\leq1,\qquad\sum_kr_{ik}=1.
$$

责任度表达一个样本来自各分量的后验概率；需要硬归属时再取最大者。分配同时考虑中心距离、协方差形状、体积和混合权重。

GMM 可用于聚类、密度估计与生成。它仍有初始化敏感、局部解和分量编号不可辨识等问题；某分量协方差收缩到单个样本还可能使似然无界。软归属和灵活协方差并未消除这些困难。
