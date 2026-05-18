# wechat-newspic

微信公众号「图片消息」（小绿书）自动化发布工具。

## 项目组成

| 组件 | 目录 | 说明 |
|------|------|------|
| 文档 | `docs/` | 需求、API 方案、架构设计、Skill 设计（合并为一份文档） |
| Skill | `skill/` | OpenClaw Skill，封装发布链路 |
| CLI | `cli/` | 命令行工具（命令发布 + 中转服务） |
| 参考 | `reference/` | 现有 wechat-publisher Skill 与 wenyan-cli 命令结构参考 |

## 与现有项目的关系

| 现有项目 | 复用 | 不复用 |
|---------|------|--------|
| wechat-publisher（wenyan-cli） | 凭证管理方式、serve 模式思路 | 发布逻辑（article_type 不同） |
| wechat-short-ppt | 短文内容结构 | — |
| html-ppt | 截图产出 | — |

## CLI 核心功能

1. **命令发布**：`newspic publish --title "..." --content "..." --images slide-1.png slide-2.png`
2. **中转服务**：`newspic serve --port 3000`（固定 IP 代理，解决微信 IP 白名单限制）

## 完整链路

```
html-ppt 截图 → newspic CLI → 中转服务器（固定IP） → 微信公众号 API → 小绿书草稿
```
