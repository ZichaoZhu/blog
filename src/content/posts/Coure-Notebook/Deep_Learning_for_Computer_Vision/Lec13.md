---
id: "deep-learning-computer-vision-lec13"
slug: "deep-learning-computer-vision-lec13"
title: "Lec13: 生成模型（一）"
description: "生成与判别建模、最大似然、自回归模型、Autoencoder 与 VAE。"
contentKind: "note"
type: "course"
topics: ["computer-vision"]
visibility: "published"
author: "Goongmly"
course: {"id":"deep-learning-computer-vision","order":13}
tags: ["计算机视觉","深度学习","课程笔记","计算机科学"]
category: "计算机视觉"
---

# 生成与判别

- 判别模型：学习 $p(y\mid x)$，主要用于分类等映射任务。
- 生成模型：学习 $p(x)$；条件生成模型学习 $p(x\mid y)$，处理“一种条件对应多种合理输出”的歧义。

密度满足 $\int p(x)dx=1$，不同样本竞争概率质量；这使生成模型能对异常输入赋予低密度。Bayes 公式：

$$
p(y\mid x)=\frac{p(x\mid y)p(y)}{p(x)}.
$$

# 生成模型图谱

![](assets/lec13_generative_taxonomy.png)

- 显式、可精确求密度：自回归。
- 显式、近似求密度：VAE。
- 隐式、直接采样：GAN。
- 隐式、迭代采样：扩散。

# 最大似然与自回归

$$
\theta^*=\arg\max_\theta\prod_i p_\theta(x^{(i)})
=\arg\max_\theta\sum_i\log p_\theta(x^{(i)}).
$$

对序列：

$$
p_\theta(x)=\prod_{t=1}^{T}p_\theta(x_t\mid x_{<t}).
$$

RNN / 因果 Transformer 参数化每项。训练可并行计算所有 next-token 损失，采样必须自回归串行。图像按 RGB 子像素建模会极长，现代方法常先转为更短的离散 latent token。

# Autoencoder 与 VAE

普通 AE：$z=e_\phi(x)$、$\hat x=d_\theta(z)$，最小化 $\lVert x-\hat x\rVert_2^2$。它能学习表示，但任意采样 $z$ 不一定合理。

VAE 指定 $p(z)=\mathcal{N}(0,I)$ 与 decoder $p_\theta(x\mid z)$。生成：采样 $z$ 后解码。因

$$
p_\theta(x)=\int p_\theta(x\mid z)p(z)dz
$$

难算，引入近似后验 $q_\phi(z\mid x)$。

![](assets/lec13_vae.png)

ELBO：

$$
\log p_\theta(x)\ge
\mathbb{E}_{q_\phi(z\mid x)}[\log p_\theta(x\mid z)]
-D_{\mathrm{KL}}(q_\phi(z\mid x)\|p(z)).
$$

第一项是重建，第二项让编码分布匹配可采样先验。两项互相拉扯：重建希望每样本编码唯一，KL 希望编码接近同一标准高斯。

对角高斯 encoder：

$$
q_\phi(z\mid x)=\mathcal{N}(\mu_\phi(x),\operatorname{diag}(\sigma_\phi^2(x))).
$$

重参数化使采样可反传：

$$
\epsilon\sim\mathcal{N}(0,I),\qquad z=\mu_\phi(x)+\sigma_\phi(x)\odot\epsilon.
$$
