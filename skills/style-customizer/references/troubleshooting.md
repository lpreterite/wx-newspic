# 故障排查（需要回退时加载）

## 问题与处理

| 问题 | 处理方案 |
|------|---------|
| fetch 文章失败（非 200 / 超时） | 文章可能是付费内容或已删除，降级为"模式 A：逐步问答" |
| 视觉提取为空（无 inline style） | 文章可能用 `<style>` 块而非内联样式。AI 根据元素顺序和语义推断视觉层级，跳过颜色/字号分析，使用默认值 |
| extract 结果中 `suggestedHlTheme` 为 null | 未检测到 bodyColor，无法推断背景明暗。手动指定 `--hl-theme` 或使用 `atom-one-light`（默认） |
| 门禁反复不通过同一项 | 展示具体失败的 check + 微信限制说明，询问用户是否跳过该项 |
| save-theme.sh 写入失败 | 检查 `~/.wx-newspic/themes/` 目录是否可写和存在 |
| wx-newspic CLI 找不到 | 确保已全局安装：`npm install -g @packy-tang/wx-newspic` |
| 渲染后主题未生效（仍是默认样式） | `--theme-file` 必须与 `--theme <名称>` 同时使用，例：`wx-newspic render --theme-file ~/.wx-newspic/themes/foo.css --theme foo --md article.md` |
| 用户不满意渲染效果 | 回到"模式 A：逐步问答"重新收集偏好，重新生成 |

## 回退策略

- **爬取失败** → 降级到问答模式
- **CSS 3 轮不过** → 展示失败项，让用户决定跳过
- **用户不满意** → 回到问答模式重新调整参数
