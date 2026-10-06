---
id: "machine-learning-lec3"
slug: "machine-learning-lec3"
title: "Lec3: 建模流程与评价方法"
description: "分类指标、决策阈值、数据划分与泄漏，以及特征工程和逻辑回归。"
contentKind: "note"
type: "course"
topics: ["machine-learning"]
visibility: "published"
author: "Goongmly"
course: {"id":"machine-learning","order":3}
tags: ["机器学习","课程笔记","计算机科学"]
category: "机器学习"
---



## 分类指标

先确定正类。以下混淆矩阵以真实类别为行、预测类别为列：

|  | 预测为正 | 预测为负 |
| --- | --- | --- |
| 真实为正 | TP | FN：漏报 |
| 真实为负 | FP：误报 | TN |

$$
\operatorname{Accuracy}=\frac{\mathrm{TP}+\mathrm{TN}}N.
$$

$$
\operatorname{Precision}=\frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FP}},
\qquad
\operatorname{Recall}=\frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FN}}.
$$

$$
\operatorname{FPR}=\frac{\mathrm{FP}}{\mathrm{FP}+\mathrm{TN}},
\qquad
F_1=\frac{2\mathrm{TP}}{2\mathrm{TP}+\mathrm{FP}+\mathrm{FN}}.
$$

Precision 衡量正类预测的可信程度，Recall 衡量正例覆盖程度。类别不平衡时，应与多数类基线比较，不能只看准确率。分母为零时需明确指标约定。

## 从分类概率到决策阈值

以产品检测为例，约定正类代表次品：$y=1$ 表示真实是次品，$\hat y=1$ 表示把它判为次品；$y=0$ 表示真实合格，$\hat y=0$ 表示判为合格。真实标签与预测结果需要区分。

给定产品信息 $x$，定义：

$$
p=P(Y=1\mid X=x),\qquad P(Y=0\mid X=x)=1-p.
$$

$p$ 是产品真实为次品的条件概率，实际由模型估计。模型给出概率后，还需要决定输出哪个标签；当两种错误后果不同时，可以选择使平均损失最小的标签。

设误报、漏报代价分别为正数 $c_{\mathrm{FP}},c_{\mathrm{FN}}$，正确判断代价为零。先固定一种预测，再按真实标签的概率计算平均代价：

$$
R(+\mid x)=\underbrace{p\cdot0}_{\text{正确}}
+\underbrace{(1-p)c_{\mathrm{FP}}}_{\text{误判合格品}}.
$$

$$
R(-\mid x)=\underbrace{p\,c_{\mathrm{FN}}}_{\text{放过次品}}
+\underbrace{(1-p)\cdot0}_{\text{正确}}.
$$

当判为次品的平均代价更小时，选择 $\hat y=1$：

$$
c_{\mathrm{FP}}(1-p)<c_{\mathrm{FN}}p.
$$

$$
c_{\mathrm{FP}}<(c_{\mathrm{FP}}+c_{\mathrm{FN}})p.
$$

$$
p>\frac{c_{\mathrm{FP}}}{c_{\mathrm{FP}}+c_{\mathrm{FN}}}.
$$

右边是两种选择平均代价相等时的概率阈值。比较 $p$ 与阈值，就是比较两种期望代价。约定相等时选择负类，可写为：

$$
\hat y=1\quad\Longleftrightarrow\quad
p>\frac{c_{\mathrm{FP}}}{c_{\mathrm{FP}}+c_{\mathrm{FN}}}.
$$

例如误判合格品损失 1 元，放过次品损失 9 元，当前次品概率为 $p=0.2$：

$$
R(+\mid x)=1\times0.8=0.8,\qquad R(-\mid x)=9\times0.2=1.8.
$$

阈值为 $1/(1+9)=0.1$，所以选择 $\hat y=1$。虽然产品更可能合格，但判为次品的平均损失更小，因为漏报更昂贵。

两种错误同价时阈值为 $0.5$；固定误报代价，增加漏报代价会降低阈值，通常以更多误报换取更少漏报。概率由模型估计，最终标签由概率和错误代价共同决定；该规则能否降低实际损失，取决于概率与代价是否可靠。

## 数据划分与泄漏

| 数据部分 | 用途 |
| --- | --- |
| 训练集 | 拟合参数与预处理状态 |
| 验证集 | 选择模型、特征方案、超参数与阈值 |
| 测试集 | 方案确定后评价最终表现 |

反复根据测试结果修改模型，会使测试集参与模型选择，评价趋于乐观。

- 近似独立的同分布样本：可以随机划分。
- 同一实体产生多条相关记录：按实体分组划分。
- 预测未来：按时间划分。
- 类别不平衡：可考虑分层抽样，但它不能消除实体或时间泄漏。

预测时无法获得的字段、跨集合的重复样本，以及用全量数据拟合预处理，都是常见泄漏来源。

## 特征工程

预测模型可拆为表示与预测两部分：

$$
f_w(x)=g_w(\phi(x)).
$$

| 特征类型 | 常见表示 | 关键注意点 |
| --- | --- | --- |
| 无序类别 | 独热编码 | 避免整数编码暗含顺序；处理未知类别 |
| 非负长尾数值 | 对数变换 | 压缩大值，同时改变模型假设 |
| 不同尺度数值 | 标准化 | 统计量只从训练集估计 |
| 文本 | 词袋、向量表示 | 词袋丢失词序 |
| 图像 | 像素展平、手工或学习特征 | 展平不自动赋予平移不变性 |

对第 $j$ 个特征，训练集标准化为：

$$
\mu_j=\frac1{N_{\mathrm{train}}}\sum_{i\in\mathcal I_{\mathrm{train}}}x_{ij},
\qquad
s_j^2=\frac1{N_{\mathrm{train}}}\sum_{i\in\mathcal I_{\mathrm{train}}}(x_{ij}-\mu_j)^2.
$$

$$
z_j=\frac{x_j-\mu_j}{s_j},\qquad s_j>0.
$$

验证集与测试集沿用训练统计量，不必具有零均值和单位方差。常数列需单独处理。独热列标准化可能放大罕见类别，是否采用取决于距离和正则化的含义。

## 预处理接口

| 接口 | 含义 |
| --- | --- |
| `fit` | 学习均值、词表、类别集合或模型参数 |
| `transform` | 使用已有状态转换输入 |
| `fit_transform` | 先学习状态，再转换当前数据 |
| `predict` | 输出点预测或类别 |
| `predict_proba` | 支持概率输出的分类器返回各类别概率 |

训练数据可以 `fit_transform`；验证和测试数据只 `transform`。使用 `Pipeline` 将预处理纳入每次训练和交叉验证，避免先在全量数据上拟合。

## 模型复杂度与正则化

归纳偏置是用于从有限样本推广的假设。参数模型在固定特征维度下参数数量固定；非参数方法的有效复杂度可以随数据增长，“非参数”不等于没有超参数。

欠拟合表示模型或训练过程无法捕捉主要关系；过拟合表示对训练数据的进一步适应没有转化为新数据改善。

$$
\hat w\in\arg\min_w
\left[\frac1N\sum_{i=1}^{N}\ell(f_w(x_i),y_i)+\lambda\Omega(w)\right].
$$

参数由训练拟合，超参数如正则化强度、树深度、学习率由验证表现选择。优化成功不等于泛化良好。

## 逻辑回归

$$
P(Y=1\mid x)=\sigma(w^{\mathsf T}x+b),
\qquad\sigma(t)=\frac1{1+e^{-t}}.
$$

使用 $0.5$ 阈值时，决策边界为：

$$
w^{\mathsf T}x+b=0.
$$

sigmoid 非线性，但该模型具有线性决策边界。scikit-learn 的 `C` 是正则化强度的倒数，越小惩罚越强。
