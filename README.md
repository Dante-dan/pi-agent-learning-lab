# Pi Agent 学习实验室

一个面向 TypeScript 开发者的 Pi Agent 二次开发学习项目，覆盖 Extension、AgentSession SDK、Tools、Session JSONL、Providers、RPC、Pi Package 和生产安全边界。

> 本项目使用当前维护的 `@earendil-works/pi-*` 包。旧的 `@mariozechner/*` 教程已经过时，不要在新项目中混装两套包。

## 学习路线

1. 运行 `extensions/hello.ts`，理解 Extension factory 与事件注册。
2. 阅读 `docs/architecture.md`，选择 Extension、SDK 或 Package。
3. 运行 `sdk/minimal-session.ts`，消费 AgentSession 事件。
4. 完成 `exercises/README.md` 的六个练习。
5. 用 `docs/production-checklist.md` 评审安全与恢复策略。

## 网站

```bash
npm install
npm run dev
```

## 官方资料

- [Pi repository](https://github.com/earendil-works/pi)
- [Coding Agent](https://github.com/earendil-works/pi/tree/main/packages/coding-agent)
- [Extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)
- [SDK](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
- [Session format](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session.md)

