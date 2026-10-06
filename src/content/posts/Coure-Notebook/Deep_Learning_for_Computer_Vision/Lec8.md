---
id: "deep-learning-computer-vision-lec8"
slug: "deep-learning-computer-vision-lec8"
title: "Lec8: 注意力与 Transformer"
description: "从序列注意力到多头自注意力、Transformer Block 和 Vision Transformer。"
contentKind: "note"
type: "course"
topics: ["computer-vision"]
visibility: "published"
author: "Goongmly"
course: {"id":"deep-learning-computer-vision","order":8}
tags: ["计算机视觉","深度学习","课程笔记","计算机科学"]
category: "计算机视觉"
---

注意力是作用在「向量集合」上的新原语；Transformer 是处处使用注意力的架构。

# RNN seq2seq 的瓶颈

编码器 RNN 把输入压成隐藏状态，从 $h_T$ 派生解码器初始状态 $s_0$ 和上下文向量 $c$（通常 $c = h_T$），解码器 $s_t = g_U(y_{t-1}, s_{t-1}, c)$ 自回归生成。

问题：整段输入挤过固定大小的 $c$，长序列（$T=1000$）装不下。解决：解码每一步动态回看整个输入。

# 带注意力的 seq2seq

每个解码步重新计算一个上下文向量，聚焦输入相关部分：

$$
e_{t,i} = f_{att}(s_{t-1}, h_i), \quad a_{t,i} = \mathrm{softmax}_i(e_{t,i}), \quad c_t = \sum_i a_{t,i} h_i.
$$

![](assets/lec8_attn_full.png)

完全可微，对注意力权重无监督，靠翻译损失自己学会对齐。

![](assets/lec8_attn_weights_vis.png)

英译法可视化：大致对角（顺序对应），形容词语序相反处出现反对角块，模型自动调换关注顺序。

# 通用算子：Attention Layer

把 RNN 注意力抽象出来，做三个改动：

1. 缩放点积相似度 $e_i = q \cdot X_i / \sqrt{D_X}$。除 $\sqrt{D_X}$ 是因为点积量级随维度增长，过大会使 softmax 饱和、梯度消失。
2. 多个查询：$Q$（$N_Q \times D_X$）。
3. 分离 key/value：$K = X W_K$，$V = X W_V$。

$$
E = \frac{Q K^\top}{\sqrt{D_Q}}, \quad A = \mathrm{softmax}(E, \text{dim}=1), \quad Y = A V.
$$

![](assets/lec8_attention_layer.png)

每个查询注意到全部数据向量，输出是值向量按注意力权重的线性组合。

- Cross-attention：$Q$ 与 $K,V$ 来自不同来源（如解码器查询、编码器数据）。
- Self-attention：$Q,K,V$ 都来自同一组输入。

# Self-Attention

输入 $X$（$N \times D_{in}$）经 $W_Q, W_K, W_V$ 得 $Q, K, V$：

$$
E = \frac{Q K^\top}{\sqrt{D_Q}} \in \mathbb{R}^{N\times N}, \quad A = \mathrm{softmax}(E,\text{dim}=1), \quad Y = AV.
$$

![](assets/lec8_self_attention.png)

序列内任意位置一层内直接交互，通常 $D_Q = D_V = D_{out}$。

排列等变（permutation equivariant）：$F(\sigma(X)) = \sigma(F(X))$，本质作用在向量集合上、不知顺序。

![](assets/lec8_permutation_equivariant.png)

- 位置编码：给每个输入加位置向量 $E(i)$ 以感知顺序。RoPE 旋转 Q/K，使点积只依赖相对位置 $\phi_j - \theta_i$。
- 掩码自注意力：softmax 前把未来位置的 $E_{ij}$ 置 $-\infty$，权重变 $0$，用于语言建模（因果掩码）。

# 多头自注意力

并行跑 $H$ 个独立的头，各有 $W_Q, W_K, W_V$；拼接后用 $W_O$ 融合。通常 $D_H = D/H$。

![](assets/lec8_multihead.png)

自注意力 = 四次矩阵乘法（QKV 投影、QK 相似度、V 加权、输出投影），高度并行。复杂度随 $N$：计算 $O(N^2)$、内存 $O(N^2)$。FlashAttention 不存完整注意力矩阵，内存降到 $O(N)$。

# 三种序列处理方式

![](assets/lec8_three_ways.png)

- RNN：一维有序序列，$O(N)$，但串行不可并行。
- 卷积：N 维网格，可并行，但长序列需堆很多层。
- Self-attention：向量集合，每个输出直接依赖所有输入、高度并行，但 $O(N^2)$ 计算。

结论：Attention is All You Need（Vaswani et al., 2017）。

# Transformer Block

![](assets/lec8_transformer_block.png)

自下而上：多头自注意力 → 残差 → LayerNorm → 逐向量 MLP（$D\to 4D\to D$）→ 残差 → LayerNorm。

自注意力是唯一的跨向量交互；LayerNorm 和 MLP 逐向量独立。主要计算 6 次矩阵乘法（4 自注意力 + 2 MLP）。Transformer = 堆叠相同 block，架构自 2017 基本未变，只是越做越大（原版 213M → GPT-3 175B）。

语言建模：开头嵌入矩阵（$V \times D$ 查表），block 内用掩码注意力，结尾投影矩阵（$D \times V$）出词表得分，softmax + 交叉熵预测下一 token。

# Vision Transformer（ViT）

![](assets/lec8_vit.png)

图像切块（如 $16\times16\times3$）→ 展平线性投影成 $D$ 维向量（等价于 $16\times16$ 步长 $16$ 卷积）→ 加二维位置编码 → 送入 Transformer（无掩码，patch 互看）→ 平均池化 + 线性层预测类别。把图像组织成向量集合即可复用 Transformer。

# 常见改动

![](assets/lec8_tweaks.png)

- Pre-Norm：LayerNorm 移到残差连接内部（自注意力/MLP 之前），训练更稳定。
- QK-Norm：相似度前归一化 Q、K（常用 RMSNorm），防梯度尖峰。
- SwiGLU MLP：$Y = (\sigma(XW_1) \odot XW_2) W_3$，门控形式，$H=8D/3$ 保持参数量。
- MoE：每 block 学 $E$ 套 MLP（专家），每 token 只路由到 $A < E$ 个激活。参数增 $E$ 倍、计算只增 $A$ 倍。
