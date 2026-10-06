---
id: "machine-learning-lec2"
slug: "machine-learning-lec2"
title: "Lec2: 数据工具与可视化"
description: "使用 pandas 检查、筛选和整理数据，处理缺失值、聚合、连接与可视化。"
contentKind: "note"
type: "course"
topics: ["machine-learning"]
visibility: "published"
author: "Goongmly"
course: {"id":"machine-learning","order":2}
tags: ["机器学习","课程笔记","计算机科学"]
category: "机器学习"
---



## pandas 数据结构

| 对象 | 含义 |
| --- | --- |
| `Series` | 带索引的一维数据 |
| `DataFrame` | 带行索引、列标签的二维表格，各列类型可以不同 |
| `Index` | 用于标识和对齐的数据标签 |

一行对应一个样本，一列对应一种特征。索引标签不等于行位置；排序和筛选通常保留原索引。

`Series` 运算与赋值通常按标签对齐，普通列表赋值按位置对应。将特征和标签分别排序，可能破坏样本对应关系。

## 数据检查速查

| 操作 | 用途 |
| --- | --- |
| `df.head()`、`df.tail(3)` | 查看首尾样本 |
| `df.shape`、`df.size` | 行列数、单元格总数 |
| `df.info()` | 类型和非缺失数量 |
| `df.describe()` | 默认查看数值列统计 |
| `df.sample(n=3, random_state=42)` | 可复现的随机抽查 |
| `df["Type"].value_counts(dropna=False)` | 类别频数，包含缺失 |
| `df["Type"].unique()`、`.nunique()` | 不同取值、不同非缺失值数量 |
| `df.isna().sum()`、`df.isna().mean()` | 各列缺失数量、缺失比例 |

`shape` 和 `size` 是属性，不加括号。随机抽样有助于检查，但不能保证数据具有代表性。

## 索引、筛选与修改

| 写法 | 含义 |
| --- | --- |
| `df.iloc[0:3, 0:2]` | 按位置取前三行、前两列，右端不包含 |
| `df.loc[0:2, ["Height"]]` | 按标签取行列，有效标签切片包含两端 |
| `df["Height"]` | 返回一维 `Series` |
| `df[["Height"]]` | 返回二维单列 `DataFrame` |
| `df.loc[df["Height"] > 50]` | 按布尔条件筛选行 |
| `df.loc[mask, "Height"] = value` | 明确修改满足条件的位置 |
| `df.sort_values("Height", ascending=False)` | 按高度降序排列 |
| `df.drop(columns=["Height"])` | 返回删除指定列后的表 |

多个条件逐元素组合时使用 `&`、`\|`、`~`，每个比较条件加括号，例如 `(df["Height"] > 50) & (df["Type"] == "Tower")`。不要直接使用 Python 的 `and`、`or`。

`loc[2]` 取标签为 `2` 的行，`iloc[2]` 取第三行。多数转换返回结果对象，需要赋值才能保留结果；修改部分数据时优先使用一次 `.loc` 赋值，避免链式索引。

## 缺失值

| 操作 | 含义 |
| --- | --- |
| `df.dropna(subset=["Height"])` | 删除高度缺失的行 |
| `df["Height"].fillna(value)` | 使用给定值填补 |
| `df["Height"].isna().astype(int)` | 构造缺失指示特征 |

删除样本可能改变群体分布，填补值也不一定具有真实语义。先判断缺失来自未采集、失败还是字段不适用，再决定处理方法。

预测任务中，先划分数据，再只用训练集计算中位数等填补统计量；验证和测试数据沿用同一变换。

## 聚合与透视表

`groupby` 的过程是按键拆分、组内计算、合并结果。

| 操作 | 含义 |
| --- | --- |
| `df["Height"].mean()` | 高度均值 |
| `df["Height"].max()` | 最大高度 |
| `df["Height"].idxmax()` | 最大高度所在的索引标签 |
| `df.groupby("Type")["Height"].agg(["mean", "max"])` | 按类型聚合高度 |
| `df.groupby("Type").size()` | 每组总行数 |
| `df.groupby("Type")["Height"].count()` | 每组高度非缺失数量 |

透视表用 `index` 指定行分组键，`columns` 指定列分组键，`values` 指定数值列，`aggfunc` 指定聚合方式。同一行列组合对应多个样本时，必须明确如何聚合。

## 表连接

`merge` 按指定键连接表；`join` 常用于涉及索引的连接。

| 方式 | 保留范围 |
| --- | --- |
| `inner` | 两侧均匹配的记录 |
| `left` | 左表全部记录及匹配结果 |
| `right` | 右表全部记录及匹配结果 |
| `outer` | 两侧全部记录，未匹配字段为缺失 |

同一个键在左、右表分别出现 $m,n$ 次，匹配结果可能产生：

$$
m\times n
$$

行。左连接不保证结果行数等于左表行数。可用 `validate="many_to_one"` 等约束检查预期关系，连接后检查行数、缺失和样本标识唯一性。

## 可视化选择

| 图形 | 主要观察内容 |
| --- | --- |
| 散点图 | 两个数值变量的关系、分组、离群点 |
| 折线图 | 时间或其他有序坐标上的变化 |
| 直方图 | 连续变量的分布、偏斜、多峰 |
| 柱状图 | 类别数量或分组统计量 |
| 箱线图 | 中位数、分散程度、潜在离群点 |
| 热力图 | 相关矩阵等矩阵结构 |

Matplotlib 适合静态输出，Plotly 便于交互探索。读图时检查单位、坐标范围、分箱方式和未显示的缺失样本；相关性不能直接解释为因果。
