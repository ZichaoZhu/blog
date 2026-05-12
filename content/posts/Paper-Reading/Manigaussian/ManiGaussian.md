---
title: "ManiGaussian 论文笔记"
date: "2026-04-15"
description: "ECCV 2024 论文 ManiGaussian:把动态高斯泼溅作为世界模型,用于多任务机器人操作的视觉表征与未来预测。"
tags: ["论文阅读","机器人","高斯泼溅","世界模型"]
category: "论文阅读"
author: "zhuzichao"
draft: false
---

> 论文标题:ManiGaussian: Dynamic Gaussian Splatting for Multi-task Robotic Manipulation
> 作者:Guanxing Lu, Shiyi Zhang, Ziwei Wang 等(清华大学、CMU、南洋理工)
> 会议:ECCV
> 关键词:多任务机器人操作、动态高斯泼溅、世界模型
> 项目主页:https://guanxinglu.github.io/ManiGaussian/

---

## 研究背景与动机

### 问题定位
- 任务：语言条件下的多任务机器人操作（language-conditioned multi-task robotic manipulation）。给定单视角 RGB-D 观测和自然语言指令，预测最优末端执行器位姿。
- 数据集：RLBench（10 个任务，166 个变体）。

### 已有方法的两条路线及其局限

| 类别 | 代表方法 | 局限 |
|---|---|---|
| 感知方法 (Perceptive) | PerAct、PolarNet、Act3D、Hiveformer | 严重依赖多相机覆盖工作台以解决遮挡，难以部署在非结构化环境 |
| 生成方法 (Generative) | GNFactor (基于可泛化 NeRF) | 只关注语义/几何表示，忽略时空动力学，无法理解操作过程中物体间的物理交互 |

### 核心动机
> 论文中给出的关键例子：指令"stack two rose blocks"，GNFactor 因不理解场景动力学而失败（去拿了固定的绿色基座），ManiGaussian 通过显式编码场景动力学完成任务。

论文的核心论断：仅有静态语义/几何还不够，机器人必须理解 场景级时空动力学——即物体之间在操作过程中如何因物理交互而发生变化。

---

## 核心思想

ManiGaussian 的核心是把 3D Gaussian Splatting 与 世界模型 (World Model) 结合起来，提出 动态高斯泼溅 (Dynamic Gaussian Splatting) 框架：

1. 将 3DGS 从静态场景重建扩展到动态场景预测：让高斯粒子的位置 $\mu$ 和旋转 $r$ 随时间步 $t$ 演化，编码物体间物理交互。
2. 用世界模型驱动 3DGS 的动态学习：根据当前观测 + 机器人动作，预测下一步的高斯参数 → 渲染未来场景 → 与真实未来观测比对，实现自监督。
3. 将动力学嵌入到供动作解码使用的视觉表示中：因为表示要能预测未来场景，所以它必然编码了场景的物理属性，从而帮助动作解码器输出更精确的动作。

> 一句话总结：ManiGaussian = 可微分的 4D 高斯表示 + 高斯空间的世界模型 + 动作解码器，三者联合训练。

---

## 方法详解

### 整体流程（Pipeline）

```
RGB-D (单前置相机, 128×128)
      │ lifting + voxelization
      ▼
体素表示 v ∈ ℝ^(100³×128)
      │ 表示网络 q_φ (3D UNet)
      ▼
高层视觉特征 v^(t)
      ├──► 高斯回归器 g_φ (multi-head MLP) ──► 高斯参数 θ^(t) = (μ,c,r,s,σ,f)
      │                                                │
      │                                                ├──► 渲染当前 ──► L_Geo, L_Sem
      │                                                │
      │                                          (+ a^(t), 形变预测器 p_φ)
      │                                                │
      │                                                ▼ Δμ, Δr (刚体假设)
      │                                            θ^(t+1)
      │                                                │
      │                                                ▼ 渲染未来
      │                                          预测 C^(t+1) ──► L_Dyna
      │
      └──► PerceiverIO 多模态 Transformer + 语言指令 ──► a^(t) (trans/rot/open/col) ──► L_Act
```

### 动态高斯泼溅（Dynamic Gaussian Splatting）

每个高斯粒子的参数为：

$$
\theta_i^{(t)} = \big(\mu_i^{(t)},\ c_i,\ r_i^{(t)},\ s_i,\ \sigma_i,\ f_i\big)
$$

关键假设——刚体假设：物体在操作过程中视为刚体，因此颜色 $c$、尺度 $s$、不透明度 $\sigma$、语义特征 $f$ 是 时间无关 的；只有位置 $\mu$ 和旋转 $r$ 随时间变化：

$$
\big(\mu_i^{(t+1)},\ r_i^{(t+1)}\big) = \big(\mu_i^{(t)} + \Delta\mu_i^{(t)},\ r_i^{(t)} + \Delta r_i^{(t)}\big)
$$

语义特征 $f$：从 Stable Diffusion 视觉编码器 蒸馏出的高层语义（用于继承基础模型的开放世界知识）。

渲染：保持原版 3DGS 的 alpha-blend 公式：

$$
C(\mathbf{p}) = \sum_{i=1}^{N} \alpha_i\, c_i \prod_{j=1}^{i-1} (1 - \alpha_j),\quad \alpha_i = \sigma_i\, e^{-\frac{1}{2}(\mathbf{p}-\mu_i)^\top \Sigma_i^{-1} (\mathbf{p}-\mu_i)}
$$

### 高斯世界模型（Gaussian World Model）

四个模块：

| 模块 | 公式 | 作用 |
|---|---|---|
| 表示模型 $q_\phi$ | $\mathbf{v}^{(t)} = q_\phi(o^{(t)})$ | 浅层 3D UNet，提取体素级高层特征 |
| 高斯回归器 $g_\phi$ | $\theta^{(t)} = g_\phi(\mathbf{v}^{(t)})$ | 6 个 head 分别预测 position offset $\in\mathbb{R}^3$、color SH $\in\mathbb{R}^{12}$、rotation quaternion $\in\mathbb{R}^4$、scale $\in\mathbb{R}^3$、opacity $\in\mathbb{R}^1$、semantic feature $\in\mathbb{R}^3$ |
| 形变预测器 $p_\phi$ | $\Delta\theta^{(t)} = p_\phi(\theta^{(t)}, a^{(t)})$ | 全连接残差网络，根据动作预测 $\mu, r$ 的变化 |
| 高斯渲染器 $\mathcal{R}$ | $o^{(t+1)} = \mathcal{R}(\theta^{(t+1)}, w)$ | 标准 3DGS 光栅化 |

> 本质：把 Hafner 等人的 Dreamer 类世界模型从隐式潜空间搬到了 显式的 3D 高斯空间。前向预测变成了高斯参数的演化 + 可微渲染。

### 学习目标（4 项损失加权和）

$$
\mathcal{L} = \mathcal{L}_{\text{Act}} + \lambda_{\text{Geo}}\,\mathcal{L}_{\text{Geo}} + \lambda_{\text{Sem}}\,\mathcal{L}_{\text{Sem}} + \lambda_{\text{Dyna}}\,\mathcal{L}_{\text{Dyna}}
$$

| 损失 | 含义 | 公式要点 |
|---|---|---|
| $\mathcal{L}_{\text{Act}}$（行为克隆） | 多模态 Transformer 输出动作的交叉熵 | $\mathcal{L}_{\text{Act}} = CE(p_{\text{trans}}, p_{\text{rot}}, p_{\text{open}}, p_{\text{col}})$ |
| $\mathcal{L}_{\text{Geo}}$（当前场景几何一致性） | RGB 渲染与多视角真值 MSE | $\mathcal{L}_{\text{Geo}} = \lVert \mathbf{C}^{(t)} - \hat{\mathbf{C}}^{(t)} \rVert_2^2$ |
| $\mathcal{L}_{\text{Sem}}$（语义一致性） | 与 Stable Diffusion 特征图的余弦距离 | $\mathcal{L}_{\text{Sem}} = 1 - \sigma_{\cos}(\mathbf{F}^{(t)}, \hat{\mathbf{F}}^{(t)})$ |
| $\mathcal{L}_{\text{Dyna}}$（未来场景一致性，本文核心） | 预测未来 RGB 与真实未来 RGB MSE | $\mathcal{L}_{\text{Dyna}} = \lVert \hat{\mathbf{C}}^{(t+1)}(a^{(t)}, o^{(t)}) - \mathbf{C}^{(t+1)} \rVert_2^2$ |

超参：$\lambda_{\text{Geo}} = 0.01,\ \lambda_{\text{Sem}} = 0.0001,\ \lambda_{\text{Dyna}} = 0.001$（由消融选定）。

训练技巧：前 3k 步 warm-up，冻结形变预测器，只训表示模型与高斯回归器；之后联合训练所有模块和动作解码器。

---

## 实验关键结果

### 主结果（10 RLBench 任务平均成功率）

| 方法 | 输入 | 平均成功率 |
|---|---|---|
| PerAct (1 cam) | 体素 | 20.4% |
| PerAct (4 cam) | 体素 | 22.7% |
| GNFactor (NeRF) | 单视角 RGB-D | 31.7% |
| ManiGaussian (Ours) | 单视角 RGB-D | 44.8% |

- 比第二名 GNFactor 相对提升 41.3%（绝对 +13.1pp）。
- 仅使用 一个前置相机 就超过了 PerAct 用 4 个相机的版本。

### 消融研究（关键）
按 6 类任务分组（Planning / Long / Tools / Motion / Screw / Occlusion）：

| Geo | Sem | Dyna | Avg |
|---|---|---|---|
| - | - | - | 23.6 (基线) |
| Y | - | - | 39.2 (+15.6) — 高斯回归器贡献最大 |
| Y | Y | - | 41.6 (+2.4) — 语义蒸馏 |
| Y | - | Y | 43.6 |
| Y | Y | Y | 44.8 — 完整 ManiGaussian |

- 几何（高斯回归器） 贡献最大（+15.6pp），尤其对 Occlusion / Tools / Screw 等需几何推理任务。
- 动力学损失 $\mathcal{L}_{\text{Dyna}}$ 对长程任务（Long: put in drawer / stack blocks）提升尤为显著，6 类中 4 类受益。

### 效率对比
- 相比 GNFactor：$1.18\times$ 性能 + $2.29\times$ 训练加速。
- 体现了 显式 3DGS 比隐式 NeRF 在机器人任务中更优。

### 定性分析亮点
- slide block to yellow：GNFactor 模仿专家"向后拉"导致失败；ManiGaussian 因理解接触动力学，成功推动方块。
- turn left tap：GNFactor 误解"left"语义；ManiGaussian 既懂语义又能精确执行。
- 新视角合成：ManiGaussian 能渲染 future scene 中方块被夹爪推动后的位置。

---

## 贡献总结（Why It Matters）

1. 首次将 4D（动态）高斯泼溅引入机器人操作，把 3DGS 从静态场景重建扩展为可预测物体交互的动态表示。
2. 构建了高斯空间的世界模型：与 Dreamer 系列在隐式潜空间预测不同，ManiGaussian 在显式高斯参数空间做未来预测，预测结果可被人理解为可视场景。
3. 未来场景一致性损失 $\mathcal{L}_{\text{Dyna}}$ 是免费监督：来自 RLBench 的多视角 + 后续帧，无需额外标注，却把"物理属性"编码进了表示。
4. 以更少计算 + 单相机超越 SOTA：在 RLBench 10 任务上以 44.8% 显著超越 GNFactor 的 31.7%，且训练快 $2.29\times$。

---

## 局限与未解决问题

1. 依赖标定的多视角监督：训练时仍需 20 个虚拟相机视角做监督，限制了真实部署。
2. 刚体假设：物体颜色/尺度/不透明度时间无关——对柔性物体（布料、绳索、流体）不适用。
3. 关键帧动作而非连续控制：将操作问题简化为关键帧分类，依赖 RRT-Connect 等运动规划器。
4. 单臂场景：未涉及双臂协同（这正是后续 ManiGaussian++ 的工作）。
5. 未来预测仅一步：没有递归地多步展开预测，长时序动力学建模潜力未充分挖掘。

---

## 与相关工作的关系

- vs. GNFactor (CoRL 2023)：GNFactor 用可泛化 NeRF 重建当前场景，ManiGaussian 用 3DGS 重建当前 + 未来 场景；后者训练更快、性能更好。
- vs. PerAct (CoRL 2022)：PerAct 直接在体素上做 PerceiverIO 分类，无世界模型；ManiGaussian 的体素 + 高斯回归 + PerceiverIO 是其改进版。
- vs. Dreamer 系列：Dreamer 在隐式潜空间预测未来；ManiGaussian 在显式高斯空间预测，可视化更友好。
- vs. 动态 NeRF / 4D-GS：传统 4D 重建做插值；ManiGaussian 做 条件化外推（given action → predict future）。

---

## 可能的改进方向

- 去除多视角依赖：探索单视角自监督（如 splat image / SparseGS）以适应真实部署。
- 柔性 / 关节物体建模：放松刚体假设，引入物理参数或学习形变流场。
- 多步 rollout：在世界模型中递归展开，做 Dreamer 风格的隐式想象规划。
- 真机迁移：在真实双臂或单臂上验证（这部分由 ManiGaussian++ 完成）。
- 语义特征源选择：探索 DINOv2 / SAM / CLIP 等代替 Stable Diffusion 编码器是否更高效。

---

## 九、关键公式深入解读

### 9.1 公式 (1) 渲染方程：alpha-blend 到底在做什么

$$
C(\mathbf{p}) = \sum_{i=1}^{N} \alpha_i\, c_i \prod_{j=1}^{i-1}(1 - \alpha_j),\quad \alpha_i = \sigma_i\, \exp\!\Big(\!-\tfrac{1}{2}(\mathbf{p}-\mu_i)^\top \Sigma_i^{-1}(\mathbf{p}-\mu_i)\Big)
$$

直觉理解：把每个高斯想象成一片 半透明的彩色雾气，从前往后叠在一起。

3 个零件分别管什么：

| 零件 | 含义 |
|---|---|
| $\alpha_i$（公式后半段） | 这片雾在像素 $\mathbf{p}$ 处的"浓度"——离高斯中心越近浓度越大；本质是 2D 高斯概率密度 |
| $c_i$ | 这片雾的颜色 |
| $\prod_{j=1}^{i-1}(1-\alpha_j)$ | 前 $i-1$ 片雾还剩多少光没挡住——核心是这一项让 alpha 合成"按顺序"生效 |

符号说明：
- $i$ 是高斯编号（1 到 $N$，按深度从近到远排序）
- $j$ 是"在 $i$ 前面那些"的编号
- 实际渲染时不会真的把全场 $N$ 个高斯都算，只算覆盖到当前像素的那批

举例验证：3 个高斯依次 (红/0.5)、(绿/0.8)、(蓝/1.0) 排列：
- 第 1 个贡献：$0.5 \times \text{红} \times 1 = 50\%\text{ 红}$
- 第 2 个贡献：$0.8 \times \text{绿} \times 0.5 = 40\%\text{ 绿}$
- 第 3 个贡献：$1.0 \times \text{蓝} \times 0.5 \times 0.2 = 10\%\text{ 蓝}$
- 像素颜色 = 50% 红 + 40% 绿 + 10% 蓝（光被精确分完）

### 9.2 $\mathcal{L}_{\text{Geo}}$ vs $\mathcal{L}_{\text{Dyna}}$ 的本质区别

两者都是 RGB 上的 MSE，唯一可见区别是上标 $t$ vs $t+1$，但教模型的能力完全不同：

| 维度 | $\mathcal{L}_{\text{Geo}}$ | $\mathcal{L}_{\text{Dyna}}$ |
|---|---|---|
| 时间 | 当前帧 $t$ | 未来帧 $t+1$ |
| 输入 | 仅观测 $o^{(t)}$ | 观测 + 动作 $a^{(t)}$ ⭐ |
| 走过的模块 | $q_\phi \to g_\phi \to \mathcal{R}$ | $q_\phi \to g_\phi \to \boxed{p_\phi} \to \mathcal{R}$ |
| 训练谁 | $q_\phi, g_\phi$（重建任务） | $\boxed{p_\phi}$（条件预测任务） |
| 教什么能力 | 临摹（看清+画对当前） | 预言（懂物理因果） |
| 学到的知识 | 几何 + 外观 | 物理动力学 |

核心区分点：动作 $a^{(t)}$ 是否参与。

- 不参与 → 重建任务 → 学几何
- 参与 → 条件预测任务 → 学物理因果

为什么两者都需要：
- 没 $\mathcal{L}_{\text{Geo}}$：模型可以"作弊"——瞎画当前 $\theta^{(t)}$，硬记未来 RGB，学不到真正的物理。
- 没 $\mathcal{L}_{\text{Dyna}}$：退化成静态 3DGS，形变预测器 $p_\phi$ 没人监督就废了。

---

## 十、训练 vs 推理的差异（容易忽视但重要）

### 10.1 训练阶段

完整 5 个步骤都跑 → 计算 4 个损失 → 反传梯度

```
体素化 → q_φ → g_φ → 渲染当前 → L_Geo / L_Sem
                  ↘
                    p_φ + 动作 → θ^(t+1) → 渲染未来 → L_Dyna
                  ↘
                    PerceiverIO + 语言 → 动作 → L_Act
```

热身技巧：前 3k 步冻结 $p_\phi$，让 $q_\phi, g_\phi$ 先把"画对当前场景"练扎实，再联合训练。

### 10.2 推理阶段（关键）

形变预测器 $p_\phi$ 和高斯渲染器 $\mathcal{R}$ 都被砍掉了！

```
体素化 → q_φ → PerceiverIO + 语言 → 动作
            └──────► 不再走 g_φ / p_φ / 渲染
```

为什么能砍：训练时辅助损失 $\mathcal{L}_{\text{Geo}}, \mathcal{L}_{\text{Sem}}, \mathcal{L}_{\text{Dyna}}$ 是为了 训表示网 $q_\phi$。一旦 $q_\phi$ 已经把"几何 + 语义 + 物理直觉"全部蒸馏进了它的权重里，推理就不需要再走渲染那条线了。

实践意义：ManiGaussian 推理速度和 PerAct 几乎一样，没有因为引入 3DGS 而变慢——3DGS 只在训练时"打工"，推理时下班。

---

## 十一、核心表示 $\mathbf{v}^{(t)}$ 是如何"变懂物理"的

整篇论文最关键的一个机制：所有辅助损失最终都是为了让中间特征 $\mathbf{v}^{(t)}$ 变得更"懂"场景。

```
                ┌──── L_Geo: 强迫 v^(t) 含有正确的几何信息（位置/形状/颜色）
                │
   v^(t) ───────┼──── L_Sem: 强迫 v^(t) 含有开放世界语义（这是水龙头/抽屉/方块）
 (核心表示)     │
                └──── L_Dyna: 强迫 v^(t) 含有物理动力学（推一下会怎样）

         ⬇⬇⬇

   v^(t) 同时编码了 几何 + 语义 + 物理

         ⬇⬇⬇

   PerceiverIO 基于这种"懂场景"的表示选动作
   → 比只懂几何的 PerAct (23.6%) 强得多
   → 比只懂几何+语义的 GNFactor (31.7%) 也强得多
   → 最终 44.8%
```

这个视角的重要性：理解 ManiGaussian 不是"用高斯做动作"，而是 "用高斯渲染当作辅助任务，把物理理解蒸馏到核心表示里"。所有架构选择都为这个目标服务。

---

## 十二、白话版方法摘要（用于快速回忆）

> "ManiGaussian 让机器人学会了'物理直觉'。
>
> 它的做法是：把场景表示成一堆 3D 高斯小光斑，每个光斑会随机器人动作而位移。然后强迫模型预测'如果我这样动一下，下一帧场景会是什么样'——这个预测任务的真值就是数据集里的下一帧 RGB，不需要任何额外标注。
>
> 为了让这个预测任务有意义，模型必须真的搞懂 '夹爪推方块 → 方块会被推走' 这种物理因果。一旦学会了，这种'物理懂'就被自动编码到了视觉表示里。
>
> 推理时，把高斯渲染部分扔掉，只用学到的视觉表示选动作——比之前的方法（只懂语义不懂物理）强了 13 个百分点。"

---

## 十三、常见困惑 / 自问自答（FAQ）

### Q1：3DGS 在这篇论文里到底是不是为了"渲染好看的图"？
A：不是。3DGS 在这里是 场景的显式表示载体——选它是因为它"显式、可微、好编辑、训练快"。渲染只是"把高斯参数变成图"的中间手段，最终目标是让 $q_\phi$ 学到好表示。

### Q2：为什么"刚体假设"成立？
A：因为 RLBench 里的物体（方块、抽屉、水龙头）确实是刚体——颜色、大小、不透明度不会变，只有位置和朝向会变。刚体假设大幅简化了形变预测的搜索空间。
会失效的场景：布料（折叠会变形）、流体、可压缩物体——所以 ManiGaussian++ 在 Fold Clothes 上仍有挑战。

### Q3：未来预测只预测 1 步会不会太短？
A：是这篇论文的局限之一。没有递归地多步展开（Dreamer 那种"想象规划"）。但即使只预测 1 步，已经让性能大幅提升——说明"物理直觉"的初步信号就够强。

### Q4：$\mathcal{L}_{\text{Sem}}$ 的权重 $\lambda_{\text{Sem}} = 0.0001$ 为什么这么小？
A：两个原因：
1. SD 特征本身值域大、梯度强，权重小是为了平衡。
2. 消融实验显示 $\mathcal{L}_{\text{Sem}}$ 只贡献 +2.4pp，本身重要性不算最高，主菜是 $\mathcal{L}_{\text{Geo}}$（+15.6pp）和 $\mathcal{L}_{\text{Dyna}}$（+4.4pp）。

### Q5：和 GNFactor 比，为什么训练能快 $2.29\times$？
A：核心原因——3DGS 渲染比 NeRF 渲染快得多。NeRF 要逐像素积分采样，3DGS 是基于光栅化的瓦片渲染。当训练循环每一步都涉及大量渲染时，这个速度差异被放大。

### Q6：模型为什么用 Stable Diffusion 蒸馏语义而不是 CLIP？
A：论文没明确解释，但推测：
- SD 的视觉编码器输出的 spatial feature map（带空间结构），比 CLIP 的全局 embedding 更适合做像素级监督。
- SD 在生成任务上预训练，特征里隐含了"物体形状/纹理"等更细粒度信息，对操作任务更有用。
- 这也是后续 ManiGaussian++ 改用 GroundedSAM（更直接的实例分割）的原因——任务监督比语义监督更精确。

### Q7：论文反复强调"用了 3D 高斯"是不是有点啰嗦？
A：是的，这是顶会论文的写作惯例——审稿人可能只读摘要 + 引言，核心创新必须重复 5 次以上才能保证看到。读到第二次"Gaussian Splatting"出现时，可以条件反射地跳过。

---

## 十四、读论文回顾 / 自检清单

读完整篇论文后，能默写出以下答案才算真正读懂：

- [ ] 1 句话说出 ManiGaussian 解决什么问题（不是"做动作"，是"让机器人懂物理"）
- [ ] 不看论文画出 pipeline 的 5 个步骤
- [ ] 解释 $\mathcal{L}_{\text{Geo}}$ 和 $\mathcal{L}_{\text{Dyna}}$ 的本质区别（动作是否参与）
- [ ] 说出推理时哪些模块被砍了，为什么能砍
- [ ] 用消融数据（23.6 → 39.2 → 41.6 → 44.8）解释每个损失的贡献
- [ ] 说清"刚体假设"在哪里用、什么场景会失效
- [ ] 比较 ManiGaussian 和 GNFactor 的核心差异（动力学 + 显式 GS）

如果其中有 ≥ 2 项答不出来，说明那部分还需要回看。
