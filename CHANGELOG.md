# Changelog

## [0.2.2](https://github.com/lpreterite/wx-newspic/compare/v0.2.0...v0.2.1) (2026-06-18)

## [0.2.1](https://github.com/lpreterite/wx-newspic/compare/v0.2.0...v0.2.1) (2026-06-18)


### Bug Fixes

* 移除 publish.yml 中多余的 NODE_AUTH_TOKEN 覆盖，避免 step 级空值覆盖 job 级认证 ([97a5377](https://github.com/lpreterite/wx-newspic/commit/97a53778edd3e5b6d5e045e2f4769a5be6b0afea))

## [0.2.1](https://github.com/lpreterite/wx-newspic/compare/v0.1.1...v0.2.0) (2026-06-18)


### Bug Fixes

* 移除 publish.yml 中多余的 NODE_AUTH_TOKEN 覆盖，避免 step 级空值覆盖 job 级认证 ([97a5377](https://github.com/lpreterite/wx-newspic/commit/97a53778edd3e5b6d5e045e2f4769a5be6b0afea))

# [0.2.0](https://github.com/lpreterite/wx-newspic/compare/v0.1.1...v0.2.0) (2026-06-18)


### Bug Fixes

* renderArticle() 容器添加 id="wenyan" 以正确应用主题样式 (Fixes [#41](https://github.com/lpreterite/wx-newspic/issues/41)) ([65b844f](https://github.com/lpreterite/wx-newspic/commit/65b844ff728260b760dc60c4de2f815800846847)), closes [#wenyan](https://github.com/lpreterite/wx-newspic/issues/wenyan)
* **server:** 补齐 [#20](https://github.com/lpreterite/wx-newspic/issues/20) 规范差异 — thumb_media_id 校验 + content_source_url 透传 ([9ee03cc](https://github.com/lpreterite/wx-newspic/commit/9ee03ccbf7d76f3d7a5690a14ffc5711ca6e828b))
* TokenManager 遇 40001 自动刷新重试 (BUG-001) ([eb4f9a3](https://github.com/lpreterite/wx-newspic/commit/eb4f9a399d1ff08f93376165619a7c3d5413ebe4)), closes [#12](https://github.com/lpreterite/wx-newspic/issues/12)
* 默认代码高亮主题改为 github-dark ([3d311d1](https://github.com/lpreterite/wx-newspic/commit/3d311d102c425b5b97cd6494ca69d792bec6ae31))


### Features

* .env 文件支持 SERVER/API_KEY 字段（Close [#13](https://github.com/lpreterite/wx-newspic/issues/13)） ([56d9911](https://github.com/lpreterite/wx-newspic/commit/56d9911eba331a8dfd765654813ec0e154b680ae))
* [#36](https://github.com/lpreterite/wx-newspic/issues/36) 自定义主题集成 + 预览体验打磨 ([c68156e](https://github.com/lpreterite/wx-newspic/commit/c68156e25132826a7c77f3ca3c4020f45fc8e021))
* **cli:** --theme-file + theme 子命令 — 自定义主题加载（Close [#30](https://github.com/lpreterite/wx-newspic/issues/30)） ([04ca6dd](https://github.com/lpreterite/wx-newspic/commit/04ca6ddee256bb86f598b6848f34d93078fa188d))
* **cli:** preview 预览服务 — CLI 命令 + HTTP 分屏骨架（[#33](https://github.com/lpreterite/wx-newspic/issues/33)） ([b279da7](https://github.com/lpreterite/wx-newspic/commit/b279da733cf339eb2589e8acfce9f0b6b315cbe9))
* **cli:** publish 命令支持 --type news 长文发布 ([#19](https://github.com/lpreterite/wx-newspic/issues/19)) ([6d595b9](https://github.com/lpreterite/wx-newspic/commit/6d595b97c9bc19d12b9db3e8a617851adad5b882)), closes [#24](https://github.com/lpreterite/wx-newspic/issues/24)
* **core:** 集成 @wenyan-md/core 渲染内核 ([#17](https://github.com/lpreterite/wx-newspic/issues/17)) ([0bdd6be](https://github.com/lpreterite/wx-newspic/commit/0bdd6bea0e76d8f42161d534cf59a995295c5287))
* extract-visual 输出 hljs 注释块，SKILL.md 补充完整 9 个 hljs 主题 ([033b164](https://github.com/lpreterite/wx-newspic/commit/033b1647d6cdee765e6925819589dc62f5b46844))
* preview 服务新增 hljs 主题选择器和 --hl-theme CLI 参数 (Refs [#44](https://github.com/lpreterite/wx-newspic/issues/44)) ([30d7ea4](https://github.com/lpreterite/wx-newspic/commit/30d7ea49c5efbcb6316bc91cf93c88fd70466555))
* publish CLI 新增 --hl-theme 参数，extract-visual 推断高亮主题建议 (Closes [#44](https://github.com/lpreterite/wx-newspic/issues/44)) ([8775ef5](https://github.com/lpreterite/wx-newspic/commit/8775ef56e407147a88fc8d65676c890bdd5f76fe))
* **render:** 渲染管线 — 主题管理、图片提取、render 命令 ([#18](https://github.com/lpreterite/wx-newspic/issues/18)) ([9d778ff](https://github.com/lpreterite/wx-newspic/commit/9d778fffbcc19e7e40a287b43f64482f19123c67)), closes [#23](https://github.com/lpreterite/wx-newspic/issues/23)
* **skill:** migrate skill/ to skills/wx-newspic for npx skill compatibility ([52e1133](https://github.com/lpreterite/wx-newspic/commit/52e11330590cab027d3deb7a763d3f8fddb2dbfd)), closes [#14](https://github.com/lpreterite/wx-newspic/issues/14)
* **skill:** 更新 SKILL.md 和 publish.sh 支持 news 模式 ([#21](https://github.com/lpreterite/wx-newspic/issues/21)) ([7149cb9](https://github.com/lpreterite/wx-newspic/commit/7149cb9e9a77750a762b12fb0a0f442a20e5875f))
* Step 2 POST /render + EasyMDE 编辑器集成 ([68c3d51](https://github.com/lpreterite/wx-newspic/commit/68c3d51a5316476be028ab1c7abddd3be777ddf2))
* 提取脚本新增行内强调色推断，修复 textstyle 误匹配 bug (Refs [#43](https://github.com/lpreterite/wx-newspic/issues/43)) ([2219b6c](https://github.com/lpreterite/wx-newspic/commit/2219b6c68fc48af857f98cf56747a80d48192ae1))

# [0.2.0](https://github.com/lpreterite/wx-newspic/compare/v0.1.1...v0.2.0) (2026-06-18)


### Bug Fixes

* renderArticle() 容器添加 id="wenyan" 以正确应用主题样式 (Fixes [#41](https://github.com/lpreterite/wx-newspic/issues/41)) ([65b844f](https://github.com/lpreterite/wx-newspic/commit/65b844ff728260b760dc60c4de2f815800846847)), closes [#wenyan](https://github.com/lpreterite/wx-newspic/issues/wenyan)
* **server:** 补齐 [#20](https://github.com/lpreterite/wx-newspic/issues/20) 规范差异 — thumb_media_id 校验 + content_source_url 透传 ([9ee03cc](https://github.com/lpreterite/wx-newspic/commit/9ee03ccbf7d76f3d7a5690a14ffc5711ca6e828b))
* TokenManager 遇 40001 自动刷新重试 (BUG-001) ([eb4f9a3](https://github.com/lpreterite/wx-newspic/commit/eb4f9a399d1ff08f93376165619a7c3d5413ebe4)), closes [#12](https://github.com/lpreterite/wx-newspic/issues/12)
* 默认代码高亮主题改为 github-dark ([3d311d1](https://github.com/lpreterite/wx-newspic/commit/3d311d102c425b5b97cd6494ca69d792bec6ae31))


### Features

* .env 文件支持 SERVER/API_KEY 字段（Close [#13](https://github.com/lpreterite/wx-newspic/issues/13)） ([56d9911](https://github.com/lpreterite/wx-newspic/commit/56d9911eba331a8dfd765654813ec0e154b680ae))
* [#36](https://github.com/lpreterite/wx-newspic/issues/36) 自定义主题集成 + 预览体验打磨 ([c68156e](https://github.com/lpreterite/wx-newspic/commit/c68156e25132826a7c77f3ca3c4020f45fc8e021))
* **cli:** --theme-file + theme 子命令 — 自定义主题加载（Close [#30](https://github.com/lpreterite/wx-newspic/issues/30)） ([04ca6dd](https://github.com/lpreterite/wx-newspic/commit/04ca6ddee256bb86f598b6848f34d93078fa188d))
* **cli:** preview 预览服务 — CLI 命令 + HTTP 分屏骨架（[#33](https://github.com/lpreterite/wx-newspic/issues/33)） ([b279da7](https://github.com/lpreterite/wx-newspic/commit/b279da733cf339eb2589e8acfce9f0b6b315cbe9))
* **cli:** publish 命令支持 --type news 长文发布 ([#19](https://github.com/lpreterite/wx-newspic/issues/19)) ([6d595b9](https://github.com/lpreterite/wx-newspic/commit/6d595b97c9bc19d12b9db3e8a617851adad5b882)), closes [#24](https://github.com/lpreterite/wx-newspic/issues/24)
* **core:** 集成 @wenyan-md/core 渲染内核 ([#17](https://github.com/lpreterite/wx-newspic/issues/17)) ([0bdd6be](https://github.com/lpreterite/wx-newspic/commit/0bdd6bea0e76d8f42161d534cf59a995295c5287))
* extract-visual 输出 hljs 注释块，SKILL.md 补充完整 9 个 hljs 主题 ([033b164](https://github.com/lpreterite/wx-newspic/commit/033b1647d6cdee765e6925819589dc62f5b46844))
* preview 服务新增 hljs 主题选择器和 --hl-theme CLI 参数 (Refs [#44](https://github.com/lpreterite/wx-newspic/issues/44)) ([30d7ea4](https://github.com/lpreterite/wx-newspic/commit/30d7ea49c5efbcb6316bc91cf93c88fd70466555))
* publish CLI 新增 --hl-theme 参数，extract-visual 推断高亮主题建议 (Closes [#44](https://github.com/lpreterite/wx-newspic/issues/44)) ([8775ef5](https://github.com/lpreterite/wx-newspic/commit/8775ef56e407147a88fc8d65676c890bdd5f76fe))
* **render:** 渲染管线 — 主题管理、图片提取、render 命令 ([#18](https://github.com/lpreterite/wx-newspic/issues/18)) ([9d778ff](https://github.com/lpreterite/wx-newspic/commit/9d778fffbcc19e7e40a287b43f64482f19123c67)), closes [#23](https://github.com/lpreterite/wx-newspic/issues/23)
* **skill:** migrate skill/ to skills/wx-newspic for npx skill compatibility ([52e1133](https://github.com/lpreterite/wx-newspic/commit/52e11330590cab027d3deb7a763d3f8fddb2dbfd)), closes [#14](https://github.com/lpreterite/wx-newspic/issues/14)
* **skill:** 更新 SKILL.md 和 publish.sh 支持 news 模式 ([#21](https://github.com/lpreterite/wx-newspic/issues/21)) ([7149cb9](https://github.com/lpreterite/wx-newspic/commit/7149cb9e9a77750a762b12fb0a0f442a20e5875f))
* Step 2 POST /render + EasyMDE 编辑器集成 ([68c3d51](https://github.com/lpreterite/wx-newspic/commit/68c3d51a5316476be028ab1c7abddd3be777ddf2))
* 提取脚本新增行内强调色推断，修复 textstyle 误匹配 bug (Refs [#43](https://github.com/lpreterite/wx-newspic/issues/43)) ([2219b6c](https://github.com/lpreterite/wx-newspic/commit/2219b6c68fc48af857f98cf56747a80d48192ae1))

## v0.1.3 (2026-06-12)

### Added

- Preview: `POST /render` API 调用 renderArticle() 渲染 Markdown 为微信内联样式 HTML
- Preview: EasyMDE 编辑器集成（CDN 加载，含完整 Markdown 工具栏）
- Preview: `GET /themes` 返回内置 + 自定义主题 JSON 列表
- Preview: 启动时扫描 `~/.wx-newspic/themes/*.css` 自动注册自定义主题
- Preview: `wx-newspic preview -f/--theme-file` 单次临时主题加载
- Preview: 编辑区 500ms 防抖自动触发渲染
- Preview: 渲染加载态（spinner + 按钮禁用 + iframe 过渡）
- Preview: 渲染失败保留上一次成功预览（不销毁内容）
- Preview: Cmd/Ctrl+S 快捷键触发渲染
- Preview: 手机屏幕响应式布局

### Fixed

- `renderer/index.ts` 导出 `registerThemeFromFile()` 供预览服务复用

## v0.1.2 (2026-06-12)

### Added

- CLI: `--theme-file` 支持 render/publish 临时加载自定义主题 CSS
- CLI: `theme add/remove/list` 子命令持久管理自定义主题
- CLI: `preview` 预览命令 + HTTP 服务骨架

### Fixed

- `theme.ts` homedir import 修复（`node:path` → `node:os`）

## v0.1.1 (2026-05-20)

### Changed

- 项目重命名：`wechat-newspic` → `wx-newspic`
- npm 包名改为 scoped 命名：`@packy-tang/wx-newspic`

### Added

- CI 自动发布工作流（OIDC Trusted Publishing）
- MIT 许可证文件
- npm 安装方式文档（Badge + 安装命令）

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

### Changed

- 完善 package.json 元信息（license、repository、bugs、homepage、keywords、files）
- 添加 npm publish 生命周期脚本 prepublishOnly

### Docs

- README：安装指南、命令参考、配置说明、使用示例、故障排查
- `.env.example`：环境变量模板
- `skill/SKILL.md`：修正安装命令为源码构建流程
- `docs/ai-engineering/issue-workflow.md`：Issue 工作流规范
- `.github/ISSUE_TEMPLATE/`：Bug 报告与功能请求模板
- `.github/PULL_REQUEST_TEMPLATE.md`：PR 模板
