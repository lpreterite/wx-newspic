# 质量门禁详细说明（步骤「质量门禁验证」时加载）

## 12 项检查明细

### 维度 A：微信兼容性（5 项）

| ID | 检查项 | 脚本判定 | 原因 |
|----|--------|---------|------|
| A1 | 无 `<style><script><iframe>` 标签 | grep 标签语法 | 微信过滤这些标签，破坏布局 |
| A2 | 无 `position: absolute/fixed/relative` | grep 属性值 | 微信移除 position 属性 |
| A3 | 无 `@media` 或 `@keyframes` | grep @ 规则 | 微信不支持 CSS @ 规则 |
| A4 | 选择器含 `#wenyan` | grep 选择器 | 缺少前缀则样式不命中 |

### 维度 B：可读性基准（7 项）

| ID | 检查项 | 期望值 | 备注 |
|----|--------|--------|------|
| B1 | 根 line-height | `1.75` | 中文阅读黄金行距 |
| B2 | 根 font-size | `16px` | 移动端最小舒适字号 |
| B3 | 图片 max-width | `100%` | 防止图片溢出屏幕 |
| B4 | 表格 border-collapse | `collapse` | 表格线对齐 |
| B5 | blockquote 左边框 | `border-left: ...` | 引用块视觉标识 |
| B6 | p code 底色 | `background: ...` | 行内代码与正文区分 |
| B7 | 标题层级区分 | h1、h2 各自独立定义 | 至少 font-size 不同 |

### 维度 C：移动端中文阅读（1 项）

| ID | 检查项 | 建议值 | 原因 |
|----|--------|--------|------|
| C1 | 正文避免纯黑 | `#3f3f3f` | 纯黑 #000 在 OLED 屏刺眼 |

## 命令

```bash
# 单次验证
bash skills/style-customizer/scripts/validate-theme.sh <path/to/theme.css>

# 存盘 + 验证
bash skills/style-customizer/scripts/save-theme.sh <主题名称> <path/to/theme.css>

# 修正循环（最多 3 轮）
node skills/style-customizer/scripts/apply-correction.mjs <主题名称> <path/to/css>
```

## 修正协议

1. 验证不通过 → 读取 `failDetails` 中的 `name`/`detail`/`suggestion`
2. 逐项修正 CSS 选择器和属性
3. 重新运行验证（覆盖原文件）
4. 最多重试 3 轮
5. 3 轮仍不通过 → 向用户展示失败项清单，询问是否接受或放弃
