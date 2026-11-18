# Changelog

## 0.0.1 — 2026-11-18

首个公开版本：

- 多项目团队：`teams.json` 管理多支团队（名字、工作目录、Lead、成员），面板分「项目团队列表」与「团队详情」两层；
- 两种建队方式：从零新建 Lead/成员会话（可一并选模型、自动改会话标题），或把已有会话加入团队；
- 每个角色单独换模型（读当前可路由目录，只写该会话 `model/selection`，不改全局默认，下一回合生效）；
- Lead 工具（`team_roster` / `team_dispatch` / `team_collect` / `team_models` / `team_recover`）与成员工具 `team_report`，按调用者所在团队隔离；
- 汇报按「阶段 → 先后」排队，只在 Lead 空闲时成批投递；Lead 可主动 `team_collect`；
- 派活台账持久化（`ledger.json`）：DSH 重启后未送达汇报补投；「待恢复」判定支持排队输入豁免与 5 分钟阈值；一键发送「先汇报再继续」恢复提示，`done` 汇报自动关单。
