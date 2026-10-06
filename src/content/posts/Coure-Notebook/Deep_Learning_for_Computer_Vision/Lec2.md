---
id: "deep-learning-computer-vision-lec2"
slug: "deep-learning-computer-vision-lec2"
title: "Lec2: 图像分类与线性分类器"
description: "从图像分类任务、最近邻与 KNN，到线性分类器、损失函数和 Softmax。"
contentKind: "note"
type: "course"
topics: ["computer-vision"]
visibility: "published"
author: "Goongmly"
course: {"id":"deep-learning-computer-vision","order":2}
tags: ["计算机视觉","深度学习","课程笔记","计算机科学"]
category: "计算机视觉"
---

# 图像分类任务

从有限标签集 $\mathcal{Y} = \{\text{dog}, \text{cat}, \dots\}$ 中为输入图像选出一个标签，学习

$$
f : \mathcal{X} \rightarrow \mathcal{Y}.
$$

图像在计算机中存为整数张量，例如 $800 \times 600 \times 3$，与语义之间存在 semantic gap。

主要挑战：

- viewpoint
- illumination
- background clutter
- occlusion
- deformation
- intraclass variation
- context

# 数据驱动方法

1. 收集带标签数据集
2. 训练分类器
3. 在新数据上评估

```python
def train(images, labels): return model
def predict(model, X): return labels
```

# 最近邻 / KNN

训练：记下全部数据；预测：找最近的 $K$ 个邻居多数投票。

L1 距离：

$$
d_1(I_1, I_2) = \sum_p |I_1^p - I_2^p|
$$

L2 距离：

$$
d_2(I_1, I_2) = \sqrt{\sum_p (I_1^p - I_2^p)^2}
$$

L1 依赖坐标系（单位球为菱形），L2 不依赖（单位球为圆）。

复杂度：训练 $O(1)$，预测 $O(N)$，与实际部署需求相反。

$K$ 越大决策边界越平滑，对噪声更鲁棒。

像素空间的距离不反映语义相似性（遮挡 / 平移 / 着色可构造出 L2 距离相同但视觉差异巨大的图像），故 KNN + 像素距离几乎不用于真实图像分类。

# 超参数选择

超参数（$K$、距离度量等）需要通过验证集选择。

正确做法：train / validation / test 三分；或在小数据集上做 $k$-fold 交叉验证。深度学习中通常只做一次划分。

测试集只在所有模型选择完成后用一次。

# 线性分类器

参数化形式：

$$
f(x, W) = W x + b,
$$

其中 $W \in \mathbb{R}^{C \times D}$，$b \in \mathbb{R}^{C}$，$x \in \mathbb{R}^{D}$。

对 CIFAR-10：$D = 3072$，$C = 10$，$W$ 为 $10 \times 3072$ 矩阵。

三种视角：

1. 代数视角：$Wx + b$ 直接计算分数
2. 可视视角：$W$ 的每一行 reshape 后是该类的模板；模型本质是模板匹配，每类只能一个模板（解释"双头马"现象）
3. 几何视角：每类对应一个超平面 $w_c^\top x + b_c = 0$，分数沿法向量单调变化

无法处理的情形：

- 异或式分布
- 环形分布
- 多峰分布

原因：决策边界必须是超平面。

# 损失函数引入

数据集 $\{(x_i, y_i)\}_{i=1}^{N}$，整体损失为单样本损失的平均：

$$
L = \frac{1}{N} \sum_i L_i(f(x_i, W), y_i).
$$

# Softmax 分类器

把分数 $s = f(x_i; W)$ 视作 logits，用 Softmax 转为概率：

$$
P(Y = k \mid X = x_i) = \frac{e^{s_k}}{\sum_j e^{s_j}}.
$$

交叉熵损失（即多项逻辑回归 / 负对数似然 / MLE）：

$$
L_i = -\log\!\left( \frac{e^{s_{y_i}}}{\sum_j e^{s_j}} \right).
$$

取值范围：$L_i \in [0, +\infty)$。

初始化健全性检查：参数小随机初始化时各类分数近似相等，故

$$
L_i \approx -\log \frac{1}{C} = \log C.
$$

CIFAR-10 中 $\log 10 \approx 2.30$，训练起点应接近此值。
