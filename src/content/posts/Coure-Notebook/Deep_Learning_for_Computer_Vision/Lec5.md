---
id: "deep-learning-computer-vision-lec5"
slug: "deep-learning-computer-vision-lec5"
title: "Lec5: 用卷积神经网络做图像分类"
description: "卷积层、感受野、步长、填充与池化，以及图像分类中的平移等变性。"
contentKind: "note"
type: "course"
topics: ["computer-vision"]
visibility: "published"
author: "Goongmly"
course: {"id":"deep-learning-computer-vision","order":5}
tags: ["计算机视觉","深度学习","课程笔记","计算机科学"]
category: "计算机视觉"
---

# 图像特征 vs 卷积网络

传统视觉两阶段：人工设计特征提取（颜色直方图、HoG 等）+ 线性分类器，只训练分类层。卷积网络把特征提取也做成可学习参数，端到端训练。

![](assets/lec5_features_vs_convnets.png)

# 为什么需要卷积

全连接网络要求输入是向量，$32\times32\times3$ 图像须拉平成 $3072$ 维，空间结构被破坏。

![](assets/lec5_spatial_destroyed.png)

CNN 思路：卷积 + 池化在保留 2D 结构下提特征，末端 FC 做 MLP 输出得分，整体端到端反传训练。历史脉络：LeNet (1998) → AlexNet (2012) → ConvNets 主导视觉 (2012–2020) → Transformer/ViT (2021–)。

# 卷积层

保留输入为三维体，用滤波器在空间上滑动算局部点积。

- 滤波器尺寸如 $5\times5\times3$，深度始终等于输入通道数。
- 单个位置：$w^T x + b$（$5\cdot5\cdot3=75$ 维点积加偏置）。
- 滑过所有位置得一张激活图（activation map）。
- 滤波器个数 = 输出通道数；每个滤波器配一个偏置。

![](assets/lec5_conv_six_filters.png)

一般形式：输入 $N\times C_{in}\times H\times W$，权重 $C_{out}\times C_{in}\times K_H\times K_W$，输出 $N\times C_{out}\times H'\times W'$。

堆叠方式：Conv、ReLU、Conv、ReLU 交替。激活函数不可省，否则多层退化为单个线性卷积。

归纳偏置：局部连接、参数共享（同一滤波器在所有位置复用，参数少且平移等变）。第一层滤波器学到有向边与对比色，深层学到更大的语义结构。

# 输出尺寸、padding 与 stride

无填充步长 1：$W' = W - K + 1$，特征图每层缩小。

加填充 $P$：

$$
W' = W - K + 1 + 2P.
$$

same padding $P = (K-1)/2$ 使输出与输入同尺寸（$K=3$ 取 $P=1$）。

![](assets/lec5_padding.png)

加步长 $S$ 后通用公式：

$$
W' = \frac{W - K + 2P}{S} + 1.
$$

步长卷积同时实现提特征与下采样。

![](assets/lec5_strided_conv.png)

# 感受野

核尺寸 $K$ 时每个输出依赖输入一个 $K\times K$ 区域；堆叠 $L$ 层后感受野边长

$$
1 + L\,(K-1).
$$

大图需很多层才能覆盖全图，故在网络内下采样（步长卷积或池化）加速感受野扩张。

# 计算示例

输入 $3\times32\times32$，$10$ 个 $5\times5$ 滤波器，$S=1$，$P=2$。

- 输出：$10\times32\times32$，因 $(32-5+4)/1+1=32$。
- 参数：每个滤波器 $3\cdot5\cdot5+1=76$，共 $10\times76=760$。
- 乘加：$10\cdot32\cdot32=10240$ 个输出，每个 $75$ 维点积，合计 $768\text{K}$。

参数少源于参数共享。一般地，参数量 $C_{out}(C_{in}K_HK_W+1)$，乘加 $C_{out}H'W'(C_{in}K_HK_W)$。

# 卷积层总结

![](assets/lec5_conv_summary.png)

输出尺寸 $H'=(H-K+2P)/S+1$，$W'=(W-K+2P)/S+1$。常见设置：

- $K=3,P=1,S=1$：$3\times3$ 卷积，保持尺寸（最常用）。
- $K=1,P=0,S=1$：$1\times1$ 卷积，仅通道线性组合。
- $K=3,P=1,S=2$：下采样两倍。

PyTorch：`torch.nn.Conv2d(in_channels, out_channels, kernel_size, stride, padding)`，实际计算为互相关（cross-correlation）。卷积可推广到 1D（序列）、3D（视频/体数据）。

# 池化层

逐通道对每个 $H\times W$ 平面下采样，通道数不变，无可学习参数。

![](assets/lec5_max_pooling.png)

最大池化最常用，$K=2,S=2$ 实现两倍下采样，提供对小幅位移的不变性。输出尺寸 $W'=(W-K)/S+1$（通常无填充）。

下采样两条路：步长卷积（带参数，提特征 + 下采样）vs 池化（无参数，下采样 + 位移不变）。

# 平移等变性

$$
\mathrm{Conv}(\mathrm{Translate}(X)) = \mathrm{Translate}(\mathrm{Conv}(X)).
$$

输入物体平移，输出特征随之平移。源自参数共享。直觉：图像特征不依赖其在图中的位置。区分：卷积平移等变（跟着动），池化局部平移不变（不受影响）。

# 小结

![](assets/lec5_summary.png)

四大组件：全连接层、激活函数、卷积层、池化层。

- 卷积层：保留空间结构，局部连接 + 参数共享 + 平移等变，参数少；输出 $(W-K+2P)/S+1$。
- 池化层：逐通道下采样，无参数，提供位移不变性。

下一讲：CNN 架构（AlexNet、VGG、GoogLeNet、ResNet）。
