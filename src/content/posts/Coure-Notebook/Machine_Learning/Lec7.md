---
id: "machine-learning-lec7"
slug: "machine-learning-lec7"
title: "Lec7: 高斯混合优化与线性回归"
description: "高斯混合优化、K-means 的联系，以及线性回归、最小二乘与正规方程。"
contentKind: "note"
type: "course"
topics: ["machine-learning"]
visibility: "published"
author: "Goongmly"
course: {"id":"machine-learning","order":7}
tags: ["机器学习","课程笔记","计算机科学"]
category: "机器学习"
---



## GMM 的优化

最大化对数似然时用梯度上升，最小化负对数似然时用梯度下降。混合权重必须非负且归一化，协方差必须满足相应正定约束，不能直接任意更新。

EM 更新是对课件简述的补充。E 步用旧参数计算责任度 $r_{ik}$；M 步固定责任度，计算有效样本数并更新：

$$
N_k=\sum_i r_{ik},\qquad\pi_k^{\mathrm{new}}=\frac{N_k}{N}.
$$

$$
\mu_k^{\mathrm{new}}=\frac1{N_k}\sum_i r_{ik}x_i.
$$

$$
\Sigma_k^{\mathrm{new}}=\frac1{N_k}\sum_i r_{ik}
(x_i-\mu_k^{\mathrm{new}})(x_i-\mu_k^{\mathrm{new}})^{\mathsf T}.
$$

责任度把硬分组换成加权分组，$N_k$ 可以不是整数。非退化且精确完成相应步骤时，EM 不降低观测似然，但不保证全局最优或避免协方差塌缩。

## 与 K-means 的联系

限制所有分量具有相同的各向同性协方差：

$$
\Sigma_k=\varepsilon I,\qquad\varepsilon>0.
$$

此时责任度正比于：

$$
r_{ik}\propto\pi_k
\exp\left[-\frac{\|x_i-\mu_k\|_2^2}{2\varepsilon}\right].
$$

对固定正混合权重，若最近中心唯一，当 $\varepsilon\to0^+$ 时，其责任度趋于 $1$，其余趋于 $0$；均值更新变成簇内平均，即 K-means 更新。

一般完整协方差 GMM 的任意零噪声极限不一定对应普通 K-means；共享各向同性协方差、并列距离处理等条件不能省略。

## 回归与条件均值

回归预测连续标签。可以拟合联合分布后求条件分布，也可以直接建模 $p(y\mid x)$。

平方损失下，给定输入的最优点预测是条件均值：

$$
\mathbb E[(Y-a)^2\mid X=x]
=\operatorname{Var}(Y\mid X=x)+(\mathbb E[Y\mid X=x]-a)^2.
$$

$$
f^*(x)=\mathbb E[Y\mid X=x].
$$

这一结论只需相应二阶矩存在，不要求高斯分布。绝对损失则对应条件中位数。

## 线性是对参数而言

$$
f_w(x)=w^{\mathsf T}\phi(x).
$$

固定特征映射 $\phi$ 可以对原始输入非线性。例如一维二次基函数为：

$$
\phi(x)=\begin{bmatrix}1&x&x^2\end{bmatrix}^{\mathsf T}\in\mathbb R^3.
$$

二维完整二次展开包含交叉项：

$$
\phi(x)=\begin{bmatrix}1&x_1&x_2&x_1^2&x_1x_2&x_2^2\end{bmatrix}^{\mathsf T}.
$$

常数特征用于表示截距。多项式次数不等于展开后的特征维度；若基函数内部参数也参与训练，一般不再是关于全部参数的普通线性最小二乘。

## 高斯似然与最小二乘

假设：

$$
Y_i=w^{\mathsf T}\phi(x_i)+\epsilon_i,
\qquad\epsilon_i\overset{\mathrm{i.i.d.}}\sim\mathcal N(0,\sigma^2).
$$

对数似然为：

$$
\ell(w,\sigma^2)=-\frac N2\log(2\pi\sigma^2)
-\frac1{2\sigma^2}\sum_i(y_i-w^{\mathsf T}\phi(x_i))^2.
$$

固定正方差，最大化似然等价于最小化平方误差。该假设约束输出的条件分布，不要求输入本身高斯。

设基函数数量为 $m$，设计矩阵与损失为：

$$
A=\begin{bmatrix}\phi(x_1)^{\mathsf T}\\\vdots\\\phi(x_N)^{\mathsf T}\end{bmatrix}
\in\mathbb R^{N\times m},\qquad w\in\mathbb R^m,\quad y\in\mathbb R^N.
$$

$$
J(w)=\|y-Aw\|_2^2.
$$

## 正规方程

$$
\nabla_wJ=2A^{\mathsf T}(Aw-y)=0.
$$

$$
A^{\mathsf T}A\hat w=A^{\mathsf T}y.
$$

$A$ 列满秩时：

$$
\hat w=(A^{\mathsf T}A)^{-1}A^{\mathsf T}y.
$$

Hessian 为 $2A^{\mathsf T}A$，总是半正定；列满秩时正定，解唯一。这里的列独立是线性无关，不是统计独立。

若 $A$ 秩不足，最小范数解与全部解为：

$$
\hat w_{\min}=A^+y.
$$

$$
w=A^+y+v,\qquad v\in\operatorname{Null}(A).
$$

这些解的训练拟合值相同，新输入预测却可能不同。数值计算可直接使用 `np.linalg.lstsq`，无需显式求逆。

## 方差估计与泛化

最优残差平方和为正时：

$$
\hat\sigma^2_{\mathrm{MLE}}=\frac1N\|y-A\hat w\|_2^2.
$$

如果完全拟合且方差自由估计，似然可在方差趋零时无界；最小二乘参数解仍存在，但普通正方差模型的联合 MLE 不存在可达到的最大值。

增加固定基函数使最优训练误差不增，但可能过拟合。对任意标签都能插值需要设计矩阵行满秩，单凭 $m\geq N$ 不够。历史数据预测准确也不能保证分布变化后的表现，回归关联不自动具有因果含义。
