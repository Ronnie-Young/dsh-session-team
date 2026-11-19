# dsh-session-team

[![CI](https://github.com/Ronnie-Young/dsh-session-team/actions/workflows/ci.yml/badge.svg)](https://github.com/Ronnie-Young/dsh-session-team/actions/workflows/ci.yml)

**在 DeepSeek Harness 里按项目组织 agent 团队：一个 Lead 派活、成员各自在自己的会话里干活，汇报按阶段排队，只在 Lead 空闲时成批送达。**

DSH 自带的 `subagent` / Team 任务板是“当前会话的子代理”。这个插件做的是另一件事：
把**侧栏里独立存在的会话**组织成一支支项目团队，每个团队有自己的 Lead、成员、模型、派活台账和汇报队列，
并且允许插件**从零新建**这些会话——一条任务上的团队可以在面板里一次配好。

- **多项目团队**：`teams.json` 存多支团队；面板分「项目团队列表」→「团队详情」两层，像侧栏的工作区列表一样切换；
- **建队/加人**：从零新建团队（Lead/成员会话 + 模型 + 思考强度 + Agent 模式一次配好）、在已有团队里「＋ 添加角色」新建智能体角色（等价于新建 session），或把已有会话加入团队；
- **优先级可拖动排序**：成员列表支持拖动排序（也能 ↑/↓ 微调），排序结果写回「优先级」；
- **新会话自动归入项目分组**：插件创建/加入的会话会挂到团队目录对应的 workspace，不再落到「未分组」；
  已有成员可用团队详情的「归入项目分组」一次性补齐；
- **大任务下的长列表优化**：任务与汇报默认只看「未完成 / 未读」，可切换「全部」、分页展开、正文折叠、卡片折叠，
  列表限高滚动，长任务不再把页面撑得很长；
- **成员变动自动通知 Lead**：加人/移除/改角色/换 Lead 时，把最新名单（含每位成员的角色与优先级）自动发给 Lead，
  Lead 忙就先排队，空闲后自动送达；也可以点「立即投递」；
- **每个角色单独换模型**：读当前可路由的模型目录，选 provider / 模型 / 推理强度；只写该会话的 `model/selection`，不改全局默认，下一回合生效；
- **有顺序的汇报**：按「阶段 → 先后」排队，Lead 在跑时只排队，空闲时合并成一条摘要投递；Lead 也能主动 `team_collect`；
- **派活台账与中断恢复**：每次派活落盘；DSH 被强退/重启后，面板「任务与恢复」标出停在半道的任务，一键发「先汇报实际进度、再从断点继续」，`done` 汇报自动关单。

## 安装

需要先装好 DeepSeek Harness（桌面版或 CLI）。装完**刷新页面**，侧栏出现「项目团队」图标就成功了。

| 方式 | target | 说明 |
| --- | --- | --- |
| **插件市场**（发现页） | 先在「发现 → 管理索引源」添加 `https://ronnie-young.github.io/dsh-plugins-market/index.json`，再在市场里搜索 `session-team` 安装 | 收录在 [dsh-plugins-market](https://github.com/Ronnie-Young/dsh-plugins-market) |
| **GitHub 源**（免 clone） | `github:Ronnie-Young/dsh-session-team#v0.0.3` | pnpm 直接拉取 |
| **Release 压缩包** | `https://github.com/Ronnie-Young/dsh-session-team/releases/download/v0.0.3/dsh-session-team-0.0.3.tgz` | 从 GitHub Release 直链安装 |
| 本地目录（开发/排错） | `/你的路径/dsh-session-team` | 先 `git clone` |

> 安装会申请 danger-full-access 权限，按提示批准。版本号在面板底部显示（`dsh-session-team v0.0.3`）。

## 用法

1. 侧栏点「项目团队」图标 → **团队列表**；
2. 「新建项目团队」：填工作目录（绝对路径，输入框带工作区路径下拉提示）、团队名，逐行填成员名 / 角色 / 阶段 / 模型，勾一个 Lead → 创建；插件会新建会话、设模型、把标题改成 `团队名 · 成员名`；
3. 点进团队 → **团队详情**：成员状态/模型、改角色与模型、设 Lead、成员卡片左下「**＋ 添加角色**」新建智能体角色（=新建 session，可一次加多行、逐行选模型与 Agent 模式）、从已有会话加入、给成员派活、任务与恢复、汇报；
4. Lead 工具：`team_roster`（看全员状态）、`team_dispatch`（派活）、`team_collect`（读汇报）、`team_models`（列/换模型）、`team_recover`（恢复被中断的任务）；普通成员工具：`team_report`（汇报进度/结果/阻塞）。

工具按**调用者所在团队**解析：每支团队的 Lead 只看到本团队，成员的汇报只进本队队列。

## 数据文件

| 文件 | 内容 |
| --- | --- |
| `$DSH_HOME/session-team/teams.json` | 团队清单（名字、工作目录、Lead、成员）+ 当前选中的团队 |
| `$DSH_HOME/session-team/ledger.json` | 派活台账 + 未送达汇报（按 `teamId` 归属） |

旧版的单团队 `roster.json` / Config `members` 会在首次启动时迁移成一支 `team-legacy` 团队。

## 开发

```sh
npm install
npm test                 # node --test test/*.test.mjs（20 个用例，含多团队隔离/重启恢复）
node --check index.js
node --check client.js
```

CI：`.github/workflows/ci.yml`（push/PR 跑语法检查 + JSON 校验 + 测试）；
发版：推 `v*` 标签触发 `.github/workflows/release.yml`（校验 tag 与 package.json 版本一致、
打包 `npm pack`、创建 GitHub Release 并上传 tgz、可选通知市场同步）。

## 版本

当前 **0.0.3**。版本号由作者（用户）决定：**未经用户明确同意不要修改**。
变更记录见 [CHANGELOG.md](CHANGELOG.md)。

## License

MIT © Ronnie-Young
