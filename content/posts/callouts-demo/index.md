---
title: "Callout 语法速查"
date: "2026-04-09"
description: "Obsidian 风格提示块与折叠块的语法演示"
tags: ["语法", "Callout", "Typora"]
category: "示例"
author: "zhuzichao"
---

本文演示博客支持的 **Obsidian 风格 Callout** 语法。它基于标准 blockquote，生态兼容 Obsidian / GitHub / Typora。

## 基础语法

```markdown
> [!note] 标题
> 内容正文
```

> [!note] 这是一个 Note
> 这是默认类型，用于一般的补充说明。
>
> 支持 **粗体**、*斜体*、`行内代码`，甚至 $E = mc^2$ 公式。

## 12 种类型

> [!tip] Tip · 提示
> 可以放一些小技巧或最佳实践。

> [!info] Info · 信息
> 中性的信息展示。

> [!abstract] Abstract · 摘要
> 也可以写成 `[!summary]` 或 `[!tldr]`。

> [!success] Success · 成功
> 别名：`[!check]`、`[!done]`。

> [!question] Question · 问题
> 别名：`[!help]`、`[!faq]`。

> [!warning] Warning · 警告
> 别名：`[!attention]`、`[!caution]`。

> [!danger] Danger · 危险
> 别名：`[!error]`。

> [!bug] Bug
> 标记一个已知 bug 或坑点。

> [!example] Example · 例子
> 用于放置示例代码、示例数据。

> [!quote] Quote · 引用
> 别名：`[!cite]`。也可以用来放名言。

> [!todo] Todo · 待办
> 还没完成的事项。

## 折叠块

在类型后加 `-` 表示**默认收起**：

```markdown
> [!note]- FOIL 算法
> 内容在点击后展开
```

> [!note]- FOIL 算法
> - **算法内容**
>   - 输入：目标谓词 $P$，目标谓词 $P$ 的训练样例（正例集合 $E^+$ 和反例集合 $E^-$），以及其它背景知识样例
>   - 输出：可得到目标谓词这一结论的推理规则
>   - 过程：
>     1. 将目标谓词作为所学习推理规则的结论
>     2. 将其它谓词逐一作为**前提约束谓词**加入推理规则，计算所得到推理规则的 FOIL 信息增益值
>     3. 重复过程 2，直到所得到的推理规则不覆盖任何反例
>
> FOIL 信息增益的计算公式：
>
> $$
> \text{FOIL\_Gain} = \widehat{m_+} \cdot \left( \log_2 \frac{\widehat{m_+}}{\widehat{m_+} + \widehat{m_-}} - \log_2 \frac{m_+}{m_+ + m_-} \right)
> $$

加 `+` 表示**默认展开**：

> [!tip]+ 展开的提示
> 这个折叠块默认是打开的，可以点击收起。
>
> 里面也可以放代码：
>
> ```python
> def foil_gain(m_plus, m_minus, new_m_plus, new_m_minus):
>     import math
>     return new_m_plus * (
>         math.log2(new_m_plus / (new_m_plus + new_m_minus))
>         - math.log2(m_plus / (m_plus + m_minus))
>     )
> ```

## 无标题的 Callout

省略标题时会显示类型默认名称：

> [!warning]
> 没写标题，自动显示 "Warning"。

## 嵌套内容

Callout 里可以放几乎任何 Markdown 元素：

> [!example]+ 综合示例
> 列表：
>
> - 第一项
> - 第二项
>   - 嵌套子项
>
> 表格：
>
> | 列 A | 列 B |
> |------|------|
> | 1    | foo  |
> | 2    | bar  |
>
> 公式：$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$
