# Changelog

## v0.1.0 (2026-05-19)

### Added

- 初始版本发布
- CLI 发布图片消息：`wx-newspic publish`
- 中转 HTTP 服务：`wx-newspic serve`
- 凭证管理命令：`wx-newspic credential`
- 微信 access_token 自动缓存与续期
- 图片自动上传为永久素材（最多 20 张）
- 草稿创建与返回 media_id
- 中转服务器解决 IP 白名单限制
- OpenClaw Skill 封装
- 完整的单元测试覆盖（78 个用例）
- 项目文档：PRD、技术设计、架构图

### Fixed

- `credential set` 写入 `.env` 使用 `APP_ID`/`APP_SECRET` 以匹配读取逻辑

### Docs

- README：安装指南、命令参考、配置说明、使用示例、故障排查
- `.env.example`：环境变量模板
- `skill/SKILL.md`：修正安装命令为源码构建流程
- `docs/ai-engineering/issue-workflow.md`：Issue 工作流规范
- `.github/ISSUE_TEMPLATE/`：Bug 报告与功能请求模板
- `.github/PULL_REQUEST_TEMPLATE.md`：PR 模板
