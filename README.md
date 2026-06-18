# wx-newspic

[![npm version](https://img.shields.io/npm/v/@packy-tang/wx-newspic.svg)](https://www.npmjs.com/package/@packy-tang/wx-newspic)
[![License](https://img.shields.io/npm/l/@packy-tang/wx-newspic.svg)](https://github.com/lpreterite/wx-newspic/blob/main/LICENSE)
[![Node](https://img.shields.io/node/v/@packy-tang/wx-newspic.svg)](https://nodejs.org/)

微信公众号「图片消息」（小绿书）自动化发布工具。支持多图上传、纯文本正文、Markdown 渲染为图文消息、中转服务器代理 IP 白名单。

## 安装

**环境：** Node.js >= 20

```bash
npm install -g @packy-tang/wx-newspic
```

验证：`wx-newspic --version`

## 快速开始

```bash
# 图片消息（小绿书）
wx-newspic publish \
  --title "今日推荐" \
  --content "正文内容" \
  --images "./photos/*.png"

# 图文消息（Markdown 渲染）
wx-newspic publish \
  --type news \
  --title "标题" \
  --md article.md \
  --theme orangeheart
```

## 配置

凭证优先级：CLI 参数 > 环境变量 > `.env` 文件。

```bash
# CLI 参数
wx-newspic publish --app-id "wx_xxx" --app-secret "secret_xxx"

# 环境变量
export WECHAT_APP_ID=your_app_id
export WECHAT_APP_SECRET=your_app_secret

# 持久化
wx-newspic credential set --app-id "wx_xxx" --app-secret "secret_xxx"

# 验证
wx-newspic credential check
```

中转服务器配置（可选）：

```bash
wx-newspic credential set --server "https://your-server.com" --api-key "sk-xxx"
```

## 文档

| 用途 | |
|------|---|
| 命令完整参考 | [Wiki →](https://github.com/lpreterite/wx-newspic/wiki) |
| publish 发布 | [参数说明 →](https://github.com/lpreterite/wx-newspic/wiki/Commands-Publish) |
| render 本地渲染 | [参数说明 →](https://github.com/lpreterite/wx-newspic/wiki/Commands-Render) |
| serve 中转服务 | [参数 + 持久化 →](https://github.com/lpreterite/wx-newspic/wiki/Commands-Serve) |
| credential 凭证 | [管理命令 →](https://github.com/lpreterite/wx-newspic/wiki/Commands-Credential) |
| theme 主题管理 | [自定义主题 →](https://github.com/lpreterite/wx-newspic/wiki/Commands-Theme) |
| preview 分屏预览 | [功能说明 →](https://github.com/lpreterite/wx-newspic/wiki/Commands-Preview) |
| 样式定制技能 | [提取→生成→验证→预览 →](https://github.com/lpreterite/wx-newspic/wiki/Skill-Style-Customizer) |
| 质量门禁 | [13 项检查 →](https://github.com/lpreterite/wx-newspic/wiki/Quality-Gate) |
| 中转服务器部署 | [systemd/pm2 →](https://github.com/lpreterite/wx-newspic/wiki/Deployment) |
| 故障排查 | [常见问题 →](https://github.com/lpreterite/wx-newspic/wiki/Troubleshooting) |

## 项目组成

| 组件 | 目录 | 说明 |
|------|------|------|
| 文档 | `docs/` | 需求、API 方案、架构设计、Skill 设计 |
| Skill | `skills/wx-newspic/` | Agent Skill，封装发布链路 |
| 样式定制 | `skills/style-customizer/` | 公众号文章样式定制技能 |
| CLI | `cli/` | 命令行工具 |
| 参考 | `reference/` | 现有 wechat-publisher Skill 与 wenyan-cli 参考 |
