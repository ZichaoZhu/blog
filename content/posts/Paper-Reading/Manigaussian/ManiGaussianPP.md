---
title: "ManiGaussian++ 论文笔记"
date: "2026-04-22"
description: "ManiGaussian 的双臂续作:分层高斯世界模型 + 领导者-跟随者范式,把任务导向的高斯泼溅推广到通用双臂操作。"
tags: ["论文阅读","机器人","高斯泼溅","双臂操作"]
category: "论文阅读"
author: "zhuzichao"
draft: false
---

> 论文标题:ManiGaussian++: General Robotic Bimanual Manipulation with Hierarchical Gaussian World Model
> 作者:Tengbo Yu, Guanxing Lu, Zaijia Yang 等(清华大学、海南大学、南洋理工)
> 预印本:arXiv:2506.19842 (2025)
> 关键词:双臂操作、分层高斯世界模型、任务导向高斯泼溅、领导者-跟随者
> 代码:https://github.com/April-Yz/ManiGaussian_Bimanual

---

## 一、研究背景与动机

### 1.1 从单臂到双臂的根本差异
- 任务：语言条件下的多任务 双臂 机器人操作（bimanual manipulation）。
- 挑战核心：双臂系统不是两个单臂的拼接，它涉及 多体时空动力学 (multi-body spatiotemporal dynamics)：
  - 一只臂必须 稳定 (stabilizing) 物体，另一只臂 执行 (acting) 任务（例如一手按住箱子、一手开盖）；
  - 两臂可并行执行多步动作，需要协调；
  - 两臂之间、两臂与目标之间的相互作用比单臂复杂得多。

### 1.2 已有方法的不足

| 方法 | 不足 |
|---|---|
| PerAct² (2024) | 仅强化了策略网络（多模态 Transformer），但 视觉表示 仍是瓶颈，不能挖掘多体动力学 |
| ManiGaussian (ECCV 2024) | 单臂场景下用未来场景重建编码场景动力学，但只编码"粗粒度场景动力学"，无法区分两个手臂的不同角色 |
| 直接迁移 ManiGaussian 到双臂 | 性能严重下降（从单臂的有效到双臂的混乱） |

### 1.3 论文要解决的关键问题
- 如何在视觉表示中区分两臂的角色（执行 vs. 稳定）？
- 如何对两臂的相互作用进行建模，而不是把它们混为一谈？

---

## 二、核心思想

ManiGaussian++ 是 ManiGaussian 在双臂设定下的扩展，核心创新有两点：

### 2.1 任务导向高斯泼溅（Task-Oriented Gaussian Splatting）
- 给每个高斯粒子加一个 实例级 logit $l_i \in \mathbb{R}^3$，表示它属于哪个任务相关实例（执行臂 / 稳定臂 / 目标物）；
- 真值由 GroundedSAM（开放词汇检测器）从人类指令关键词自动生成；
- 通过监督训练，使高斯场不仅恢复几何/外观，还携带 任务语义——哪只手在做什么。

### 2.2 分层高斯世界模型（Hierarchical Gaussian World Model）—— 领导者-跟随者架构
> 这是论文最核心的设计创新。

- 关键直觉：双臂操作中，稳定臂通常先动作（先抓住或固定物体），随后执行臂动作（导致主要变化）。两者的动力学有 因果先后。
- 如果一个统一的世界模型把 $\mathbf{a}_s, \mathbf{a}_a$ 平等对待，会把多体交互混淆。
- 因此设计 两级形变模型：
  1. Leader（领导者） $q_{s,\phi}$：仅条件于稳定动作 $\mathbf{a}_s$，预测中间高斯偏移 $\theta_r^{(t+1)}$（"如果稳定臂先动会怎样"）；
  2. Follower（跟随者） $q_{a,\phi}$：基于领导者的输出，进一步条件于执行动作 $\mathbf{a}_a$，得到最终未来高斯场 $\theta_a^{(t+1)}$（"再加上执行臂的动作，物理后果是什么"）。

> 一句话总结：把双臂动作的混合分解成"稳定先 → 执行后"的因果链条，让世界模型分两步预测，避免多体交互混淆。

---

## 三、方法详解

### 3.1 整体流程（Pipeline）

```
RGB-D × 6 cameras (256×256)
     │ voxelization
     ▼
体素表示
     │ 3D 稀疏卷积 f_φ
     ▼
增强视觉表示 v^(t) ─────────────────────────────┐
     │                                         │
     ▼ Gaussian regressor g_φ                   │
高斯参数 θ^(t) = (μ,c,r,s,σ, l)                  │
     │                                         │
     ├─► 渲染当前 ──► L_Recon (RGB MSE)         │
     │           ──► L_Task (instance CE)      │
     │                                         │
     ├─► Leader  q_{s,φ}(θ^(t), a_s, v) → θ_r^(t+1)  │ (stabilizing arm)
     │                                         │
     ├─► Follower q_{a,φ}(θ_r, a_a, a_s, v) → θ_a^(t+1) │ (acting arm)
     │                                         │
     └─► 渲染未来 ──► L_Pred (RGB MSE)          │
                                               ▼
                       PerceiverIO Multi-modal Transformer
                       + 语言指令 + proprioception
                                  │
                                  ▼
                         (a_left, a_right) ──► L_BC
```

### 3.2 任务导向高斯泼溅（Task-Oriented GS）

每个高斯参数：

$$
\theta_i^{(t)} = \big(\mu_i^{(t)},\ c_i^{(t)},\ r_i^{(t)},\ s_i^{(t)},\ \sigma_i^{(t)},\ l_i^{(t)}\big)
$$

- 新增的 $l_i \in \mathbb{R}^3$ 是 instance logit。三类标签：执行臂、稳定臂、目标物。
- 渲染实例图（光栅化 + alpha-blend）：

$$
L(\mathbf{p}) = \sum_{i=1}^{N} \alpha_i\, l_i \prod_{j=1}^{i-1} (1 - \alpha_j)
$$

- 真值由 预训练 VLM (GroundedSAM) 在 2D 图上分割得到，自动获取，无需人工标注。

为什么需要任务标签？ 因为后面的世界模型要分别处理两臂的运动——必须先在表示中知道"哪个高斯属于哪只臂/物体"。

### 3.3 分层高斯世界模型（核心创新）

多体高斯运动方程：

$$
\big(\mu_i^{(t+1)},\ r_i^{(t+1)}\big) = \big(\mu_i^{(t)} + \Delta\mu_s^{(t)} + \Delta\mu_a^{(t)},\; r_i^{(t)} + \Delta r_s^{(t)} + \Delta r_a^{(t)}\big)
$$

形变 = 稳定臂引起的形变 + 执行臂引起的形变。

模块组成：

| 模块 | 输入 | 输出 | 角色 |
|---|---|---|---|
| 表示网 $f_\phi$ | 体素 $\mathbf{o}^{(t)}$ | $v^{(t)}$ | 编码视觉 |
| 高斯回归器 $g_\phi$ | $v^{(t)}$ | $\theta^{(t)}$ | 当前任务导向高斯场 |
| Leader $q_{s,\phi}$ | $\theta^{(t)},\ \mathbf{a}_s^{(t)},\ v^{(t)}$ | $\theta_r^{(t+1)}$ | 预测稳定臂引起的中间形变 |
| Follower $q_{a,\phi}$ | $\theta_r^{(t+1)},\ \mathbf{a}_s^{(t)},\ \mathbf{a}_a^{(t)},\ v^{(t)}$ | $\theta_a^{(t+1)}$ | 预测执行臂叠加后的最终形变 |
| 渲染器 $\mathcal{R}$ | $\theta^{(t+1)}$ | $C^{(t+1)},\ L^{(t+1)}$ | 输出未来 RGB + 实例图 |

整体地，这五步可以写成：

$$
\begin{cases}
v^{(t)} = f_\phi\!\big(\mathbf{o}^{(t)}\big), \\
\theta^{(t)} = g_\phi\!\big(v^{(t)}\big), \\
\theta_r^{(t+1)} = q_{s,\phi}\!\big(\theta^{(t)},\ \mathbf{a}_s^{(t)},\ v^{(t)}\big), \\
\theta_a^{(t+1)} = q_{a,\phi}\!\big(\theta_r^{(t+1)},\ \mathbf{a}_s^{(t)},\ \mathbf{a}_a^{(t)},\ v^{(t)}\big), \\
C^{(t+1)},\ L^{(t+1)} = \mathcal{R}\!\big(\theta^{(t+1)}\big).
\end{cases}
$$

刚体假设（同 ManiGaussian）：固定 $c, s, \sigma, l$，仅按 $\mathrm{SE}(3)$ 预测 $\mu, r$ 的变化。

> 理论支撑：将多体运动建模为 Newton-Euler 方程下的 $\mathrm{SE}(3)$ 变换；通过领导者-跟随者，把不可换的多智能体交互转化为有序的两阶段更新。

### 3.4 学习目标

$$
\mathcal{L} = \mathcal{L}_{\text{BC}} + \lambda_{\text{Recon}}\,\mathcal{L}_{\text{Recon}} + \lambda_{\text{Task}}\,\mathcal{L}_{\text{Task}} + \lambda_{\text{Pred}}\,\mathcal{L}_{\text{Pred}}
$$

| 损失 | 含义 | 公式 |
|---|---|---|
| $\mathcal{L}_{\text{BC}}$（行为克隆，主目标） | 左右臂动作交叉熵之和 | $\mathcal{L}_{\text{BC}} = CE(\mathbf{a}_{\text{left}}, \hat{\mathbf{a}}_{\text{left}}) + CE(\mathbf{a}_{\text{right}}, \hat{\mathbf{a}}_{\text{right}})$ |
| $\mathcal{L}_{\text{Recon}}$（当前重建） | 当前 RGB 多视角 MSE | $\mathcal{L}_{\text{Recon}} = \sum_{\mathbf{p}} \lVert C^{(t)}(\mathbf{p}) - \hat{C}^{(t)}(\mathbf{p}) \rVert_2^2$ |
| $\mathcal{L}_{\text{Task}}$（任务实例分类，新增） | 渲染实例图与 VLM 真值的逐像素交叉熵 | $\mathcal{L}_{\text{Task}} = -\sum_{\mathbf{p}} \sum_l \hat{B}^l(\mathbf{p}) \log B^l(\mathbf{p})$ |
| $\mathcal{L}_{\text{Pred}}$（未来场景预测） | 未来 RGB 多视角 MSE | $\mathcal{L}_{\text{Pred}} = \lVert \hat{C}^{(t+1)} - C^{(t+1)} \rVert_2^2$ |

---

## 四、实验关键结果

### 4.1 仿真主结果（RLBench² 10 个双臂任务，平均成功率 %）

| 方法 | 平均成功率 | 平均排名 |
|---|---|---|
| PerAct² | 15.4 | 2.5 |
| ManiGaussian (修改成双臂) | 18.8 | 2.2 |
| ManiGaussian++ (Ours) | 35.6 | 1.1 |

- 相对前作 ManiGaussian 提升 89.4%（18.8 → 35.6）。
- 相对前 SOTA PerAct² 相对提升 131.17%。
- 在所有 10 个任务上几乎包揽第一。

### 4.2 消融研究（Table II 中 3 个代表任务平均）

| 行 | 高斯泼溅 | 任务导向 GS | 分层 GWM | sweep to dustpan | handover item | push box | Avg |
|---|---|---|---|---|---|---|---|
| 1 | - | - | - | 0 | 11 | 6 | 5.67 |
| 2 | Y | - | - | 24 | 12 | 24 | 20.00 (+14.33) |
| 3 | Y | Y | - | 32 | 16 | 32 | 26.67 (+6.67) |
| 4 | Y | Y | Y | 92 | 20 | 48 | 60.00 (+33.33) |

关键发现：
- 高斯泼溅本身贡献 +14.33pp（同单臂结果）。
- 任务导向 GS（区分手臂角色）贡献 +6.67pp。
- 分层高斯世界模型贡献最大 +33.33pp——证明显式建模多体交互动力学是关键。
- 在 sweep to dustpan 任务上从 32 → 92，提升幅度极大，说明分层 GWM 对需要严格协作的任务效果显著。

### 4.3 真实机器人实验（9 任务，UR5e $\times$ 2 + Realsense）
- 训练演示：30 个真人遥操作演示／任务（不到 100）。
- 推理：仅用 1 个相机（多视角只用于训练时监督）。

| 方法 | 9 个真实任务平均成功率 |
|---|---|
| PerAct² | 31.11% |
| ManiGaussian | 45.56% |
| ManiGaussian++ | 62.22% |

- 比 PerAct² 提升 100%，比 ManiGaussian 提升 36.6%。
- 能完成 Play ping pong、Fold Clothes 等需要复杂协作的任务。
- 对光照变化等干扰具备鲁棒性。

### 4.4 新视角合成（定性）
- ManiGaussian++ 能在仅前视监督下，从新视角清晰还原 被遮挡的夹爪和按钮；
- 可预测 sweep to dustpan 中 扫帚被夹爪推动后 的未来位置——证明已学习到多体交互动力学。

---

## 五、贡献总结（Why It Matters）

1. 首次将分层世界模型引入双臂操作：通过 Leader-Follower 的因果分解，把不可换的多臂交互转化为可学习的两阶段预测。
2. 任务导向高斯场（Task-Oriented GS）：用 VLM (GroundedSAM) 自动获取实例标签，让 3DGS 不仅有外观/几何，还携带任务级身份。
3. 从单臂到双臂的跨越：在双臂基准 RLBench² 上把 SOTA 从 ~15% 拉到 35.6%；在真机上达 62.22%，能处理乒乓、叠衣等复杂协作。
4. 少演示 + 单相机部署：30 条演示训练，仅一个相机推理就能跑 9 个真实任务，工程价值高。

---

## 六、与 ManiGaussian 的对比

| 维度 | ManiGaussian (ECCV 2024) | ManiGaussian++ (2025) |
|---|---|---|
| 任务类别 | 单臂多任务 | 双臂多任务 |
| 高斯场 | 几何 + 外观 + 语义特征 (从 SD 蒸馏) | 几何 + 外观 + 实例 logit (从 VLM 蒸馏) |
| 世界模型 | 单一形变预测器 $p_\phi$ | 领导者-跟随者两级 ($q_{s,\phi}, q_{a,\phi}$) |
| 形变方程 | $\mu + \Delta\mu,\ r + \Delta r$ | $\mu + \Delta\mu_s + \Delta\mu_a,\ r + \Delta r_s + \Delta r_a$ |
| 监督源 | RGB / Stable Diffusion 特征 | RGB / GroundedSAM 实例分割 |
| 损失 | $\mathcal{L}_{\text{Act}} + \mathcal{L}_{\text{Geo}} + \mathcal{L}_{\text{Sem}} + \mathcal{L}_{\text{Dyna}}$ | $\mathcal{L}_{\text{BC}} + \mathcal{L}_{\text{Recon}} + \mathcal{L}_{\text{Task}} + \mathcal{L}_{\text{Pred}}$ |
| 真机验证 | 否（仅仿真） | 是（9 真实任务） |

> 简言之：ManiGaussian++ 把"场景动力学"细化为"多体动力学"，把"一个动作 → 一次预测"细化为"先稳后动 → 两次预测"。

---

## 七、局限与未来方向

### 论文承认的局限
- 训练监督仍依赖 标定的多视角相机，部署成本较高（虽然推理时只需单视角）。
- 依然采用 关键帧分类 而非连续控制，依赖底层运动规划器。

### 潜在改进方向
- 去除标定多视角依赖：如何从单视角自监督，进一步降低部署门槛。
- 更细粒度的角色分配：当前 3 类 logit（acting / stabilizing / target）较粗；可扩展到更复杂的多物体场景。
- 多步因果展开：当前 Leader-Follower 仅展开一步；可递归用于长程想象规划（Dreamer 风格）。
- 柔性物体：刚体假设对叠衣 / Fold Clothes 任务仍有限，需要可形变体的高斯建模。
- 领导-跟随的角色自适应：当前需要预先指定哪只手是稳定、哪只是执行；未来可让模型自动判断。

---

## 八、关键启示

1. 架构归纳偏置很重要：双臂任务的因果先后（稳定先于执行）是天然的归纳偏置，分层架构把它显式编码进了世界模型。
2. VLM 作为标签生成器是低成本可扩展的：用 GroundedSAM 替代手工标注，使任务标签的获取近乎免费。
3. 未来场景预测仍是最强的自监督：作为对动力学建模的强约束，比单纯的当前重建提供了更丰富的物理监督。
4. 3DGS 在机器人领域的潜力远未饱和：从静态重建 → 动态预测 → 多体协作，每一步都带来显著性能提升。
