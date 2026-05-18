# wechat-newspic 项目状态

> 最后更新：2026-05-18
> 项目总览：[README.md](../README.md)

---

## 当前阶段

**执行阶段** — M5 实战发布待启动

---

## 任务完成状态

### M1: 微信集成层 ✅ 完成

| 任务 | 状态 | 测试 | 说明 |
|------|------|------|------|
| T1.1 项目初始化 | ✅ 完成 | — | package.json, tsconfig, 目录结构 |
| T1.2 client.ts HTTP 客户端 | ✅ 完成 | 17/17 | 重试机制 + 错误码映射 |
| T1.3 token.ts access_token 管理 | ✅ 完成 | 9/9 | 缓存 + 自动续期 + 并发锁 |
| T1.4 material.ts 素材上传 | ✅ 完成 | 9/9 | 格式/大小/存在性校验 |
| T1.5 draft.ts 草稿创建 | ✅ 完成 | 6/6 | 返回 media_id + created_at |
| T1.6 config 配置文件 | ✅ 完成 | — | 凭证读取 + 服务端配置 |

### M2: 中转服务 ✅ 完成

| 任务 | 状态 | 测试 | 说明 |
|------|------|------|------|
| T2.1 Fastify 服务启动 | ✅ 完成 | — | 路由注册 + 优雅关闭 |
| T2.2 中间件 (auth/error) | ✅ 完成 | 9/9 | Bearer 认证 + 统一错误处理 |
| T2.3 API 路由 (4 个) | ✅ 完成 | 11/11 | token/upload/draft/drafts |
| T2.4 集成测试 | ✅ 完成 | 11/11 | 全路由覆盖 |

### M3: CLI 命令 ✅ 完成

| 任务 | 状态 | 测试 | 说明 |
|------|------|------|------|
| T3.1 bin/wx-newspic 入口 | ✅ 完成 | — | shebang + bin 配置 |
| T3.2 publish 命令 | ✅ 完成 | — | 参数校验 + 上传 → 草稿 |
| T3.3 serve 命令 | ✅ 完成 | — | 动态导入 Fastify |
| T3.4 credential 命令 | ✅ 完成 | — | show/set/check |
| T3.5 CLI 路由 | ✅ 完成 | — | Commander 集成 |
| T3.6 单元测试 | ✅ 完成 | 17/17 | 参数校验全覆盖 |

### M4: Skill 封装 ✅ 完成

| 任务 | 状态 | 说明 |
|------|------|------|
| T4.1 SKILL.md | ✅ 完成 | 输入/输出格式完整 |
| T4.2 publish.sh 脚本 | ✅ 完成 | 可执行，支持 glob + JSON 输出 |

### M5: 实战发布 ⏳ 待启动

| 任务 | 状态 | 前置条件 |
|------|------|---------|
| T5.1 配置中转服务器 | ⏳ 待启动 | 需要 VPS/云服务器（固定 IP） |
| T5.2 发布 HyperFrames 短文 | ⏳ 待启动 | 需要微信凭证 + 服务器 |

---

## 测试总览

| 测试文件 | 用例数 | 状态 |
|---------|--------|------|
| wechat/client.test.ts | 17 | ✅ |
| wechat/token.test.ts | 9 | ✅ |
| wechat/material.test.ts | 9 | ✅ |
| wechat/draft.test.ts | 6 | ✅ |
| server/middleware/auth.test.ts | 4 | ✅ |
| server/middleware/error.test.ts | 5 | ✅ |
| server/integration/server.test.ts | 11 | ✅ |
| cli/publish.test.ts | 17 | ✅ |
| **总计** | **78** | **✅ 全部通过** |

---

## 阻塞项

无

## 风险项

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 中转服务器需要固定 IP 的 VPS | 中 | 暂不可绕行 |
| 微信凭证配置需用户手动设置 | 低 | 有清晰的 CLI 引导 |
