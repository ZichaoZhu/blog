---
id: "deep-learning-computer-vision-lec15"
slug: "deep-learning-computer-vision-lec15"
title: "Lec15: 三维视觉"
description: "深度与法线、体素、点云、网格、隐式场，以及 NeRF 与 3D Gaussian Splatting。"
contentKind: "note"
type: "course"
topics: ["computer-vision"]
visibility: "published"
author: "Goongmly"
course: {"id":"deep-learning-computer-vision","order":15}
tags: ["计算机视觉","深度学习","课程笔记","计算机科学"]
category: "计算机视觉"
---

单张图像存在尺度/深度歧义：小而近与大而远可有相同投影。三维表示决定模型、损失和适用任务。

# 表示

| 表示 | 优点 | 局限 |
| --- | --- | --- |
| 深度 / 法线图 | 与像素网格对齐，2D CNN 直接可用 | 仅可见表面，视角相关 |
| 体素 | 规则 3D 网格，易用 3D CNN | 内存 $O(V^3)$ |
| 点云 | 稀疏、灵活 | 无显式表面/拓扑 |
| 网格 | 图形学标准、显式且自适应细节 | 拓扑预测与网络处理复杂 |
| 隐式场 | 连续、分辨率无关 | 查询、训练、渲染较慢 |

![](assets/lec15_representations.png)

# 深度与法线

单目深度常用 FCN 逐像素回归。相对深度更可靠，可用 scale-invariant 对数损失：

$$
\mathcal{L}_{\mathrm{si}}=
\frac1n\sum_i d_i^2-\frac1{n^2}\left(\sum_i d_i\right)^2,
\qquad d_i=\log\hat D_i-\log D_i.
$$

法线用余弦相似度监督：

$$
\mathcal{L}_{\mathrm{normal}}=1-\frac{\hat n\cdot n}{\lVert\hat n\rVert_2\lVert n\rVert_2}.
$$

# 体素、点云与网格

体素用 $V\times V\times V$ occupancy，直观但 1024^3 个 float32 已要约 4 GB；octree 以非均匀分辨率节省空间。

PointNet：共享 MLP 后对点做对称聚合，保证置换不变：

$$
h_{\mathrm{global}}=\max_i\phi(p_i).
$$

点云预测常用双向 Chamfer distance：

$$
d_{\mathrm{CD}}(S_1,S_2)=
\sum_{x\in S_1}\min_{y\in S_2}\lVert x-y\rVert_2^2+
\sum_{y\in S_2}\min_{x\in S_1}\lVert x-y\rVert_2^2.
$$

网格由顶点和三角面构成，显式表面且可自适应细节。Pixel2Mesh 从模板网格变形，拓扑固定；Mesh R-CNN 先预测体素初始化网格，再细化。

# 隐式场、NeRF 与 3DGS

occupancy / SDF 用连续函数表示表面等值集。NeRF 学习

$$
F_\theta(x,d)=(c,\sigma),
$$

沿相机光线体渲染颜色，实现新视角合成。缺点是逐光线采样并查询 MLP，单场景训练和渲染慢。

3D Gaussian Splatting 改用显式 3D 高斯集合并投影 alpha blend，通常数分钟拟合、实时渲染。

![](assets/lec15_nerf_vs_gs.png)

核心取舍：连续隐式表示质量高但慢；显式 Gaussian 更快；点云和网格更适合几何资产与操作。
