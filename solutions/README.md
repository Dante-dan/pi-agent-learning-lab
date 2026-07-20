# 解题评审标准

- 是否选择了最小的扩展面，而不是直接 fork？
- Extension factory 是否只注册，资源初始化和清理是否落在正确生命周期？
- 工具 schema、业务权限、路径验证和取消信号是否完整？
- 非交互模式是否避免调用 UI 并默认拒绝高风险动作？
- AgentSession 事件订阅是否清理，session 是否 dispose？
- Session 与 telemetry 是否分层存储？
- Provider 是否准确声明模型能力与认证方式？
- Package 是否把 Pi 核心包列为 peerDependencies，而不是重复打包？

