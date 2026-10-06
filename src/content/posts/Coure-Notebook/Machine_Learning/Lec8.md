---
id: "machine-learning-lec8"
slug: "machine-learning-lec8"
title: "Lec8: 线性回归几何与正则化"
description: "最小二乘的几何解释、Ridge、MAP、高斯先验，以及 Lasso 和稀疏性。"
contentKind: "note"
type: "course"
topics: ["machine-learning"]
visibility: "published"
author: "Goongmly"
course: {"id":"machine-learning","order":8}
tags: ["机器学习","课程笔记","计算机科学"]
category: "机器学习"
---

课件封面标为 Lecture 7，此处按文件顺序记为 Lec8。

## 最小二乘的几何解释

设 $A\in\mathbb R^{N\times m}$、$w\in\mathbb R^m$、$y\in\mathbb R^N$。预测 $Aw$ 是设计矩阵各列的线性组合，因此位于列空间。

最小二乘将 $y$ 正交投影到 $\operatorname{Col}(A)$：

$$
\hat y=A\hat w,\qquad e=y-\hat y,\qquad A^{\mathsf T}e=0.
$$

列满秩时，投影矩阵为：

$$
H=A(A^{\mathsf T}A)^{-1}A^{\mathsf T},\qquad H^{\mathsf T}=H,\quad H^2=H.
$$

秩不足时用 $H=AA^+$。训练拟合值唯一，但参数可能不唯一：沿 $\operatorname{Null}(A)$ 改变参数不改变训练预测。

## 小范数的意义

对输入特征扰动 $\delta$：

$$
|f_w(x+\delta)-f_w(x)|=|w^{\mathsf T}\delta|
\leq\|w\|_2\|\delta\|_2.
$$

同一特征尺度下，小权重限制最坏情况的预测敏感度。范数依赖单位，因此正则化要与特征标准化共同考虑；小范数并不保证任意任务泛化更好。

## Ridge 回归

采用未归一化平方误差，先假设所有参数受惩罚：

$$
J_\lambda(w)=\|y-Aw\|_2^2+\lambda\|w\|_2^2.
$$

$$
\nabla_wJ_\lambda=2A^{\mathsf T}(Aw-y)+2\lambda w=0.
$$

$$
\hat w_\lambda=(A^{\mathsf T}A+\lambda I)^{-1}A^{\mathsf T}y.
$$

当 $\lambda>0$ 时，对任意非零 $v$：

$$
v^{\mathsf T}(A^{\mathsf T}A+\lambda I)v
=\|Av\|_2^2+\lambda\|v\|_2^2>0.
$$

因此目标严格凸，即使原矩阵秩不足也有唯一解。截距通常不受惩罚；若常数列位于第一列，可以将 $I$ 替换为 $\operatorname{diag}(0,1,\ldots,1)$。

Ridge 通过引入偏差抑制估计方差。其残差满足：

$$
A^{\mathsf T}(y-A\hat w_\lambda)=\lambda\hat w_\lambda,
$$

不再是普通最小二乘的正交残差。

## 奇异值视角

对紧致分解 $A=U_rS_rV_r^{\mathsf T}$，奇异值为 $s_j>0$：

$$
\hat w_{\mathrm{OLS}}=V_r\operatorname{diag}(1/s_j)U_r^{\mathsf T}y.
$$

$$
\hat w_\lambda=V_r\operatorname{diag}\left(\frac{s_j}{s_j^2+\lambda}\right)U_r^{\mathsf T}y.
$$

小奇异值会在 OLS 中放大扰动，Ridge 对这些方向施加更强的相对收缩。全参数惩罚时：

$$
\lambda\to0^+:\ \hat w_\lambda\to A^+y;
\qquad\lambda\to\infty:\ \hat w_\lambda\to0.
$$

若截距不受惩罚，强正则化下预测趋于训练标签均值。奇异方向上的收缩不意味着原始坐标中每个系数都随 $\lambda$ 单调缩小。

## MAP 与高斯先验

贝叶斯后验为：

$$
p(w\mid\mathcal D)\propto p(\mathcal D\mid w)p(w).
$$

MAP 最大化后验，等价于最小化负对数似然加负对数先验。若噪声方差为已知 $\sigma^2$，先验为：

$$
w\sim\mathcal N(0,\tau^2I),
$$

则 MAP 目标为：

$$
\frac1{2\sigma^2}\|y-Aw\|_2^2+\frac1{2\tau^2}\|w\|_2^2.
$$

对应 Ridge 的系数为：

$$
\lambda=\frac{\sigma^2}{\tau^2}.
$$

先验方差越小，正则化越强。先验方差与惩罚强度不是同一个量。

MAP 仍是点估计。完整贝叶斯预测要对参数后验积分：

$$
p(y_*\mid x_*,\mathcal D)
=\int p(y_*\mid x_*,w)p(w\mid\mathcal D)\,dw.
$$

高斯先验与高斯似然下，后验仍为高斯，其均值等于 MAP；完整预测还包含参数不确定性，不能只保留观测噪声。

## Lasso 与稀疏性

$$
J_{\mathrm{Lasso}}(w)=\|y-Aw\|_2^2+\lambda\|w\|_1,
\qquad\|w\|_1=\sum_j|w_j|.
$$

$L_1$ 目标凸但在零点不可微。二维约束集合是菱形，角点位于坐标轴，最优解较容易出现零系数；Ridge 通常连续收缩而不产生精确零值。

正交归一设计 $A^{\mathsf T}A=I$ 下，令 $z=A^{\mathsf T}y$，Lasso 逐坐标解为软阈值：

$$
\hat w_j=\operatorname{sign}(z_j)\max(|z_j|-\lambda/2,0).
$$

同样条件下 Ridge 为：

$$
\hat w_j^{\mathrm{Ridge}}=\frac{z_j}{1+\lambda}.
$$

软阈值会将弱信号直接压为零。这里的 $\lambda/2$ 来自 SSE 的系数约定，改变损失归一化后阈值也要改变。

独立 Laplace 先验对应 Lasso：

$$
p(w_j)=\frac1{2b}e^{-|w_j|/b}
\quad\Longrightarrow\quad\lambda=\frac{2\sigma^2}{b}.
$$

连续 Laplace 先验使 MAP 产生精确零值，不意味着后验在单个零点有正概率质量。

## 正则化方法比较

| 方法 | 惩罚 | 主要特点 |
| --- | --- | --- |
| Ridge | 平方 $L_2$ 范数 | 稳定相关特征方向，通常不稀疏 |
| Lasso | $L_1$ 范数 | 可以稀疏；相关特征下选择可能不稳定，解未必唯一 |
| Elastic Net | $L_1$ 与平方 $L_2$ 组合 | 同时考虑稀疏与稳定性 |

Lasso 的非零特征不自动是真实因果变量。不同库的损失归一化不同：scikit-learn 的 Ridge 使用 SSE，Lasso 使用 SSE 除以 $2N$，不能直接比较同数值的 `alpha`。

## 超参数选择

直接联合最小化 SSE 加 $\lambda$ 倍惩罚，会偏向 $\lambda=0$，不能据此选出泛化所需的强度。

1. 保留独立测试集。
2. 在开发数据内部进行验证或交叉验证。
3. 每个候选参数、每一折都重新拟合预处理和模型。
4. 用相同验证指标选择，例如 MSE。
5. 使用选定方案在全部开发数据上重训，再评价测试集。

验证 MSE 不应再加入各候选模型不同强度的训练惩罚。标准化、填补和特征选择必须放入每折训练流程；模型稳定、测试准确和因果解释是不同问题。
