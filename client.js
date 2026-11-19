// dsh-session-team — BROWSER half（浏览器端插件）。
//
// 两层界面：
//   1. 团队列表：像侧栏的「工作区」列表一样，列出所有项目团队（人数、Lead、运行数、未完成任务），
//      顶部可以「新建项目团队」；
//   2. 团队详情：选中某个团队后，看成员状态、改模型、派活、看任务与恢复、读汇报。
//
// 数据来自 Host 的 `GET /session-team/state` 与 `POST /session-team/action`；
// 浏览器 loader 按 npm 包名期待注册，所以下面 id 必须等于包名。
window.__ModuleLoader__.load({
  id: 'dsh-session-team',
  factory: (require) => {
    const React = require('react')
    const { useEffect, useRef, useState } = React
    const h = React.createElement

    const NS = 'session-team'
    const ROUTE = '/session-team'
    const VIEW_KEY = 'session-team:view'
    const PANEL_KEY = 'session-team'

    const zh = {
      panelLabel: '项目团队',
      title: '项目团队',
      subtitle: '按项目组织会话团队：一个 Lead，多名成员，ordered 汇报',
      noTeams: '还没有团队。新建一个项目团队开始：填工作目录、Lead 与成员。',
      newTeam: '新建项目团队',
      teams: '团队',
      members: '成员',
      lead: 'Lead',
      openTeam: '打开',
      back: '返回团队列表',
      refresh: '刷新',
      flush: '投递汇报',
      briefing: 'Lead 团队说明',
      pending: '待读汇报',
      noticesPending: '待通知',
      viewChat: '对话',
      railTitle: '角色',
      chatPlaceholder: '给这个角色发消息…（Enter 发送，Shift+Enter 换行）',
      chatEmpty: '还没有对话内容，给它发第一条消息吧',
      sendQueue: '发送',
      sendSteer: '插话发送',
      interrupt: '中断',
      liveRunning: '正在生成…',
      liveTools: '调用工具',
      reply: '回复',
      noticeTab: '通知',
      noNotices: '没有待送达的通知',
      dispatchAll: '派给全部',
      dispatchTab: '派活',
      modeMessage: '消息',
      menuMore: '更多操作',
      chatMenu: '会话操作',
      panelCollapse: '收起',
      panelExpand: '任务与汇报',
      msgSystem: '系统上下文',
      composeHint: 'Enter 发送 · Shift+Enter 换行 · 「派活」会记入任务台账',
      enterText: '先输入内容',
      sessionRename: '重命名会话',
      sessionArchive: '归档会话',
      chatRefresh: '刷新对话',
      pendingInput: '等待你处理',
      tipBack: '回到团队列表页（不会删除任何数据）',
      tipRefresh: '重新读取成员状态、任务和汇报',
      tipFlush: '把暂存的汇报和成员变动通知立刻投递给 Lead（Lead 正忙时也会排队）',
      tipBrief: '给 Lead 发一条团队说明（成员、角色、优先级、当前任务），让它快速进入状态',
      tipGroup: '把这个团队的会话挂到当前目录对应的项目分组，侧边栏就不会再显示「未分组」',
      tipAdd: '从侧栏已有会话里挑人加入团队，不会新建会话',
      tipDelete: '删除这条团队登记；会话本身和它们的聊天记录都会保留',
      tipMembers: '团队成员数量（含 Lead）',
      tipOpenTasks: '还没收到 done/blocked 汇报的派活数量',
      tipPending: '已收到、但还没送达 Lead 的汇报数量',
      tipNotices: '还没送达 Lead 的成员变动通知数量',
      tipLead: '团队协调角色：汇总汇报、派活都由它承接',
      tipDefault: '新建会话默认使用的模型',
      user: '用户',
      tools: '工具',
      drawerTitle: '角色对话',
      drawerStatus: '状态',
      drawerRunning: '运行中',
      drawerIdle: '空闲',
      drawerOff: '未激活',
      drawerEmpty: '还没有对话内容',
      drawerLoading: '读取中…',
      drawerFailed: '读取对话失败：{msg}',
      drawerOpenChat: '打开正式会话',
      drawerRefresh: '刷新',
      leadTarget: 'Lead（管理）',
      groupWorkspace: '会话归入分组',
      groupedDone: '已归入项目分组：{n} 个会话',
      groupedNone: '会话已经在项目分组里了',
      tabOpen: '未完成',
      tabAll: '全部',
      tabUnread: '未读',
      showMore: '显示更多（还剩 {n} 条）',
      noUnreadReports: '没有未读汇报，点「全部」看历史',
      noOpenTasks: '没有未完成的任务，点「全部」看历史',
      olderNotLoaded: '更早的记录未加载（共 {n} 条）',
      expand: '展开',
      collapseBody: '收起',
      openTasks: '未完成任务',
      addMember: '加入已有会话',
      cancel: '收起',
      search: '搜索标题 / 目录 / session id',
      addSelected: '加入团队',
      manualAdd: '或粘贴 session id',
      manualPlaceholder: 'session-xxxx',
      add: '加入',
      remove: '移除',
      open: '打开',
      role: '角色/模型',
      setLead: '设为 Lead',
      roleLabel: '角色',
      stage: '优先级',
      rolePlaceholder: '例如 backend',
      save: '保存',
      statusRunning: '运行中',
      statusIdle: '空闲',
      statusInput: '等待你处理',
      statusOff: '未激活',
      unread: '未读',
      taskTitle: '给成员派活',
      target: '对象',
      all: '所有非 Lead 成员',
      taskPlaceholder: '写清任务目标、验收标准和落盘位置…',
      dragHint: '拖动排序',
      priorityHint: '数字越小越先处理',
      mode: '投递方式',
      modeQueue: '排队（等当前回合结束）',
      modeSteer: '插入（并入当前回合）',
      send: '发送',
      sending: '发送中…',
      reports: '汇报',
      noReports: '还没有汇报。',
      delivered: '已送达',
      queued: '排队中',
      readonly: '',
      model: '模型',
      modelDefault: '默认模型',
      modelDefaultLabel: '默认：{name}',
      modelSaveFailed: '切换模型失败',
      modelSaved: '已切换 {name} → {label}（下一回合生效）',
      effort: '推理强度',
      effortDefault: '默认强度',
      defaultModel: '默认模型 {name}',
      tasks: '任务与恢复',
      tasksOpen: '{n} 项未完成',
      noTasks: '还没有派发记录。',
      taskRunning: '进行中',
      taskStale: '待恢复',
      taskDone: '已完成',
      taskBlocked: '已阻塞',
      recover: '恢复',
      recoverAll: '恢复未完成',
      recovered: '已给 {name} 发送恢复提示',
      recoveredNone: '没有需要恢复的任务',
      taskDispatchedAt: '{time} 派发',
      taskResumed: '已恢复 {n} 次',
      createTitle: '新建项目团队',
      createHint: '为这个项目新建 Lead 和成员会话；模型在这里一并选好，之后还能改。',
      createExpand: '展开',
      createCollapse: '收起',
      cwd: '工作目录',
      cwdHint: '绝对路径；新建的会话都属于这个目录',
      teamNameInput: '团队名',
      memberName: '名称',
      addRow: '添加一行',
      removeRow: '删除',
      createBtn: '创建团队',
      creating: '创建中…',
      created: '已创建 {n} 个会话',
      createFailed: '创建团队失败',
      openExisting: '从已有会话加入',
      noModelCatalog: '没读到模型目录，先按默认模型创建',
      deleteTeam: '删除团队',
      deleteConfirm: '删除这个团队？只会移除名单，不会删除会话。',
      rename: '重命名',
      injected: '已加入 {n} 人',
      addAgentTitle: '新建智能体角色',
      addAgentEntry: '＋ 添加角色',
      rowsEmpty: '至少需要一行，点「添加一行」新增',
      addAgentHint: '等价于新建 session：建好后直接加入本团队，模型可在这里选。',
      addAgentBtn: '创建并加入',
      addAgentCreated: '已新建 {n} 个会话并加入团队'
    }

    const en = {
      panelLabel: 'Project teams',
      title: 'Project teams',
      subtitle: 'Organize sessions into per-project teams: one Lead, several members, ordered reports',
      noTeams: 'No teams yet. Create one: pick a working directory, a Lead and members.',
      newTeam: 'New project team',
      teams: 'Teams',
      members: 'Members',
      lead: 'Lead',
      openTeam: 'Open',
      back: 'Back to teams',
      refresh: 'Refresh',
      flush: 'Deliver reports',
      briefing: 'Lead team brief',
      pending: 'Unread reports',
      noticesPending: 'notices pending',
      viewChat: 'Chat',
      railTitle: 'Roles',
      chatPlaceholder: 'Message this role… (Enter sends, Shift+Enter newline)',
      chatEmpty: 'No messages yet — send the first one',
      sendQueue: 'Send',
      sendSteer: 'Steer',
      interrupt: 'Interrupt',
      liveRunning: 'Generating…',
      liveTools: 'Tools',
      reply: 'Reply',
      noticeTab: 'Notices',
      noNotices: 'No pending notices',
      dispatchAll: 'Dispatch to all',
      dispatchTab: 'Dispatch',
      modeMessage: 'Message',
      menuMore: 'More',
      chatMenu: 'Session',
      panelCollapse: 'Hide',
      panelExpand: 'Tasks & reports',
      msgSystem: 'System context',
      composeHint: 'Enter sends · Shift+Enter newline · Dispatch is recorded as a task',
      enterText: 'Type something first',
      sessionRename: 'Rename session',
      sessionArchive: 'Archive session',
      chatRefresh: 'Refresh chat',
      pendingInput: 'Waiting for you',
      tipBack: 'Back to the team list; nothing is deleted',
      tipRefresh: 'Re-read member state, tasks and reports',
      tipFlush: 'Deliver queued reports and member-change notices to the Lead now (queued if the Lead is busy)',
      tipBrief: 'Send the Lead a team brief (members, roles, priorities, open tasks)',
      tipGroup: 'Attach this team sessions to the project workspace so the sidebar stops showing "Ungrouped"',
      tipAdd: 'Pick existing sessions to join the team; creates nothing',
      tipDelete: 'Remove this team registration; sessions and their history are kept',
      tipMembers: 'Member count including the Lead',
      tipOpenTasks: 'Tasks without a done/blocked report yet',
      tipPending: 'Reports received but not yet delivered to the Lead',
      tipNotices: 'Member-change notices not yet delivered to the Lead',
      tipLead: 'Coordinator: collects reports and dispatches work',
      tipDefault: 'Default model for new sessions',
      user: 'User',
      tools: 'Tools',
      drawerTitle: 'Role conversation',
      drawerStatus: 'Status',
      drawerRunning: 'Running',
      drawerIdle: 'Idle',
      drawerOff: 'Inactive',
      drawerEmpty: 'No messages yet',
      drawerLoading: 'Loading…',
      drawerFailed: 'Failed to read conversation: {msg}',
      drawerOpenChat: 'Open chat',
      drawerRefresh: 'Refresh',
      leadTarget: 'Lead (management)',
      groupWorkspace: 'Group into workspace',
      groupedDone: 'Grouped into the project workspace: {n} sessions',
      groupedNone: 'Sessions are already grouped',
      tabOpen: 'Open',
      tabAll: 'All',
      tabUnread: 'Unread',
      showMore: 'Show more ({n} left)',
      noUnreadReports: 'No unread reports; use "All" for history',
      noOpenTasks: 'No open tasks; use "All" for history',
      olderNotLoaded: 'Older entries are not loaded ({n} total)',
      expand: 'Expand',
      collapseBody: 'Collapse',
      openTasks: 'Open tasks',
      addMember: 'Add existing sessions',
      cancel: 'Close',
      search: 'Search title / cwd / session id',
      addSelected: 'Add to team',
      manualAdd: 'Or paste a session id',
      manualPlaceholder: 'session-xxxx',
      add: 'Add',
      remove: 'Remove',
      open: 'Open',
      role: 'Role / model',
      setLead: 'Set lead',
      roleLabel: 'Role',
      stage: 'Priority',
      rolePlaceholder: 'e.g. backend',
      save: 'Save',
      statusRunning: 'Running',
      statusIdle: 'Idle',
      statusInput: 'Needs you',
      statusOff: 'Inactive',
      unread: 'unread',
      taskTitle: 'Assign work',
      target: 'Target',
      all: 'All non-Lead members',
      taskPlaceholder: 'Goal, acceptance criteria, where results go…',
      dragHint: 'Drag to reorder',
      priorityHint: 'Smaller number is handled first',
      mode: 'Delivery',
      modeQueue: 'Queue (after the current turn)',
      modeSteer: 'Steer (join the current turn)',
      send: 'Send',
      sending: 'Sending…',
      reports: 'Reports',
      noReports: 'No reports yet.',
      delivered: 'delivered',
      queued: 'queued',
      readonly: '',
      model: 'Model',
      modelDefault: 'Default model',
      modelDefaultLabel: 'Default: {name}',
      modelSaveFailed: 'Model switch failed',
      modelSaved: 'Switched {name} → {label} (from its next turn)',
      effort: 'Reasoning',
      effortDefault: 'Default effort',
      defaultModel: 'Default model {name}',
      tasks: 'Assignments & recovery',
      tasksOpen: '{n} open',
      noTasks: 'No assignments yet.',
      taskRunning: 'Running',
      taskStale: 'Needs recovery',
      taskDone: 'Done',
      taskBlocked: 'Blocked',
      recover: 'Recover',
      recoverAll: 'Recover open',
      recovered: 'Recovery prompt sent to {name}',
      recoveredNone: 'Nothing to recover',
      taskDispatchedAt: 'dispatched {time}',
      taskResumed: 'resumed {n}×',
      createTitle: 'New project team',
      createHint: 'Create fresh Lead and member sessions for this project, with models chosen here (editable later).',
      createExpand: 'Expand',
      createCollapse: 'Collapse',
      cwd: 'Working directory',
      cwdHint: 'Absolute path; the new sessions belong to it',
      teamNameInput: 'Team name',
      memberName: 'Name',
      addRow: 'Add row',
      removeRow: 'Remove',
      createBtn: 'Create team',
      creating: 'Creating…',
      created: 'Created {n} sessions',
      createFailed: 'Create team failed',
      openExisting: 'Add existing sessions',
      noModelCatalog: 'No model catalog; using the default model',
      deleteTeam: 'Delete team',
      deleteConfirm: 'Delete this team? Roster only — sessions are not deleted.',
      rename: 'Rename',
      injected: 'Added {n} members',
      addAgentTitle: 'New agent role',
      addAgentEntry: '+ Add role',
      rowsEmpty: 'At least one row is needed; use "Add row".',
      addAgentHint: 'Creates a new session and adds it to this team; pick its model here.',
      addAgentBtn: 'Create and add',
      addAgentCreated: 'Created {n} sessions and added them to the team'
    }

    let boundT = null
    let boundLocale = null
    function t(key, params) {
      let text = typeof boundT === 'function' ? boundT(key) : key
      if (typeof text !== 'string') text = key
      if (params) {
        for (const [name, value] of Object.entries(params)) text = text.split(`{${name}}`).join(String(value))
      }
      return text
    }

    const CSS = `
.stm-page{height:100%;overflow:auto;padding:24px 30px 48px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);box-sizing:border-box}
.stm-wrap{max-width:920px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
.stm-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.stm-title{margin:0;font-size:20px;font-weight:600;line-height:1.3}
.stm-sub{margin:6px 0 0;font-size:13px;color:var(--dsw-alias-label-secondary)}
.stm-actions{display:flex;flex-wrap:wrap;gap:8px;flex:none}
.stm-btn{height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.stm-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l2)}
.stm-btn:disabled{opacity:.55;cursor:default}
.stm-btn-primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base)}
.stm-btn-ghost{height:26px;padding:0 8px;font-size:12px;background:transparent}
.stm-card{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px;padding:16px 18px}
.stm-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.stm-row:last-child{border-bottom:0}
.stm-row-click{cursor:pointer}
.stm-row-click:hover .stm-name{color:var(--dsw-alias-brand-primary)}
.stm-drag{cursor:grab;color:var(--dsw-alias-label-secondary);font-size:12px;letter-spacing:-1px;user-select:none;padding:0 2px}
.stm-row-drag{opacity:.5}
.stm-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}
.stm-dot-running{background:var(--dsw-alias-state-success-primary)}
.stm-dot-input{background:var(--dsw-alias-state-warn-primary)}
.stm-dot-off{background:var(--dsw-alias-border-l2)}
.stm-name{font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stm-chip{font-size:11px;font-weight:400;padding:2px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.stm-chip-lead{border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary)}
.stm-chip-warn{border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.stm-meta{font-size:12px;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.stm-grow{flex:1;min-width:0}
.stm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);cursor:pointer;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stm-section-title{margin:0 0 10px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.stm-input, .stm-select, .stm-textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;font-size:13px;padding:8px 10px;font-family:inherit}
.stm-textarea{min-height:88px;resize:vertical;line-height:1.6}
.stm-inline{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.stm-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.stm-notice{font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary);padding:8px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.stm-notice-error{color:var(--dsw-alias-state-error-primary)}
.stm-report{border-bottom:1px solid var(--dsw-alias-border-l1);padding:8px 0;font-size:12px;line-height:1.6}
.stm-report:last-child{border-bottom:0}
.stm-report-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:var(--dsw-alias-label-secondary)}
.stm-report-subject{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary)}
.stm-report-body{margin-top:4px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.stm-report-body-clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.stm-scroll{max-height:340px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding-right:4px}
.stm-tabs{display:flex;gap:6px;align-items:center}
.stm-tab{border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:999px;padding:2px 10px;font-size:12px;cursor:pointer}
.stm-tab-on{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.stm-more{margin-top:8px}
/* —— 工作台 —— */
.stm-workbench{overflow:hidden!important;background:var(--dsw-alias-bg-base)}
.stm-workbench .stm-wrap{max-width:none;height:100%;gap:12px}
.stm-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:2px 2px 0}
.stm-topbar-left{display:flex;flex-direction:column;gap:3px;min-width:0}
.stm-topbar-title{font-size:19px;font-weight:650;color:var(--dsw-alias-label-primary);line-height:1.25}
.stm-topbar-meta{font-size:12px;color:var(--dsw-alias-label-secondary);display:flex;gap:10px;flex-wrap:wrap}
.stm-topbar-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.stm-icon-btn{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:8px;height:28px;min-width:28px;padding:0 8px;font-size:13px;line-height:1;cursor:pointer}
.stm-icon-btn:hover{color:var(--dsw-alias-label-primary)}
.stm-menu-wrap{position:relative}
.stm-menu{position:absolute;right:0;top:32px;z-index:80;min-width:180px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;box-shadow:0 12px 28px rgba(0,0,0,.22);padding:5px;display:flex;flex-direction:column}
.stm-menu-item{text-align:left;border:0;background:transparent;color:var(--dsw-alias-label-primary);border-radius:7px;padding:7px 10px;font-size:13px;cursor:pointer}
.stm-menu-item:hover{background:var(--dsw-alias-bg-layer-2)}
.stm-menu-danger{color:var(--dsw-alias-label-error, #d9534f)}
.stm-work{display:flex;gap:12px;flex:1;min-height:0}
.stm-rail{width:212px;flex:0 0 212px;min-height:0;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.stm-rail-head{display:flex;align-items:center;justify-content:space-between;padding:9px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px;color:var(--dsw-alias-label-secondary)}
.stm-rail-list{flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
.stm-rail-item{width:100%;text-align:left;border:0;background:transparent;border-bottom:1px solid var(--dsw-alias-border-l1);padding:8px 10px;cursor:pointer;color:var(--dsw-alias-label-primary);display:flex;gap:8px;align-items:flex-start}
.stm-rail-item:hover{background:var(--dsw-alias-bg-layer-2)}
.stm-rail-item-on{background:var(--dsw-alias-bg-layer-2);box-shadow:inset 2px 0 0 var(--dsw-alias-brand-primary,var(--dsw-alias-label-primary))}
.stm-rail-main{min-width:0;display:flex;flex-direction:column;gap:2px;flex:1}
.stm-rail-name{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;min-width:0}
.stm-rail-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stm-rail-sub{font-size:11px;color:var(--dsw-alias-label-secondary);display:flex;gap:6px;flex-wrap:wrap}
.stm-rail-badge{font-size:10px;font-weight:600;border-radius:999px;padding:0 6px;line-height:16px;background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-secondary)}
.stm-chat{flex:1;min-width:0;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.stm-chat-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.stm-chat-head-id{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.stm-chat-head-id strong{font-size:14px}
.stm-chat-body{flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:14px 18px;display:flex;flex-direction:column;gap:12px}
.stm-chat-foot{border-top:1px solid var(--dsw-alias-border-l1);padding:10px 14px 12px;display:flex;flex-direction:column;gap:8px;background:var(--dsw-alias-bg-layer-1)}
.stm-compose{display:flex;flex-direction:column;gap:8px}
.stm-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden}
.stm-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;padding:5px 12px;cursor:pointer}
.stm-seg-on{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.stm-compose-hint{font-size:11px;color:var(--dsw-alias-label-secondary)}
.stm-live{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,transparent);font-size:13px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;max-height:240px;overflow-y:auto;scrollbar-width:thin}
.stm-side{width:336px;flex:0 0 336px;min-height:0;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden}
.stm-side-rail{width:38px;flex:0 0 38px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;align-items:center;padding:8px 0;gap:14px;cursor:pointer;color:var(--dsw-alias-label-secondary)}
.stm-side-rail span{writing-mode:vertical-rl;font-size:11px;letter-spacing:.08em}
.stm-side-tabs{display:flex;gap:4px;padding:8px 10px;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap;align-items:center}
.stm-side-body{flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:10px 12px;display:flex;flex-direction:column;gap:10px}
.stm-item{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:5px;font-size:12px}
.stm-item-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary)}
.stm-item-subject{font-weight:600;color:var(--dsw-alias-label-primary);font-size:12.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.stm-item-body{color:var(--dsw-alias-label-secondary);line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap}
.stm-item-body-open{-webkit-line-clamp:initial}
.stm-msg{display:flex;flex-direction:column;gap:4px;font-size:13px;line-height:1.7}
.stm-msg-user{background:var(--dsw-alias-bg-layer-2,transparent);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:10px 12px}
.stm-msg-system{border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:8px 10px;color:var(--dsw-alias-label-secondary);font-size:12px}
.stm-msg-role{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;align-items:center}
.stm-msg-text{color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}
.stm-msg-clamp{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.stm-msg-tools{font-size:11px;color:var(--dsw-alias-label-secondary);display:flex;gap:6px;flex-wrap:wrap}
.stm-msg-tool{font-family:var(--dsw-alias-font-mono, monospace);font-size:11.5px;color:var(--dsw-alias-label-secondary);border-left:2px solid var(--dsw-alias-border-l2);padding:3px 8px;white-space:pre-wrap;word-break:break-all;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.stm-drawer{position:fixed;top:0;right:0;bottom:0;width:440px;max-width:92vw;background:var(--dsw-alias-bg-layer-1);border-left:1px solid var(--dsw-alias-border-l1);box-shadow:-12px 0 32px rgba(0,0,0,.18);z-index:60;display:flex;flex-direction:column;animation:stm-slide-in .18s ease-out}
@keyframes stm-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
.stm-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.stm-drawer-title{font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}
.stm-drawer-sub{font-size:12px;color:var(--dsw-alias-label-secondary)}
.stm-drawer-tabs{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.stm-msg{display:flex;flex-direction:column;gap:3px;padding:7px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);font-size:12px;line-height:1.6}
.stm-msg:last-child{border-bottom:0}
.stm-msg-role{font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.stm-msg-user .stm-msg-role{color:var(--dsw-alias-brand-primary,var(--dsw-alias-label-primary))}
.stm-msg-text{color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}
.stm-msg-tools{font-size:11px;color:var(--dsw-alias-label-secondary)}
.stm-drawer-transcript{flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
.stm-drawer-foot{display:flex;gap:8px;justify-content:flex-end;padding:10px 14px;border-top:1px solid var(--dsw-alias-border-l1)}
.stm-candidate{display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.stm-candidate:last-child{border-bottom:0}
.stm-candidate-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stm-candidate-cwd{font-size:11px;color:var(--dsw-alias-label-secondary)}
.stm-icon{position:relative;display:inline-flex;align-items:center;justify-content:center;color:currentColor}
.stm-icon-badge{position:absolute;top:-1px;right:-2px;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-warn-primary);box-shadow:0 0 0 2px var(--dsw-alias-bg-base)}
.stm-empty{font-size:13px;color:var(--dsw-alias-label-secondary);padding:12px 0}
.stm-hint{font-size:11px;color:var(--dsw-alias-label-secondary)}
`

    function installStyles() {
      const style = document.createElement('style')
      style.id = 'stm-styles'
      style.textContent = CSS
      document.head.appendChild(style)
      return () => style.remove()
    }

    // ---- 共享状态 ----
    const store = {
      state: null,
      error: null,
      loading: true,
      listeners: new Set(),
      refs: 0,
      timer: null,
      set(patch) {
        Object.assign(this, patch)
        for (const listener of this.listeners) listener()
      }
    }

    let openSession = null

    function usePolling() {
      useEffect(() => {
        store.refs += 1
        if (store.refs === 1) {
          if (store.state === null) refresh()
          store.timer = setInterval(refresh, 3000)
        }
        return () => {
          store.refs -= 1
          if (store.refs <= 0 && store.timer !== null) {
            clearInterval(store.timer)
            store.timer = null
          }
        }
      }, [])
    }

    function useStore() {
      const [, force] = useState(0)
      useEffect(() => {
        const listener = () => force(value => value + 1)
        store.listeners.add(listener)
        return () => store.listeners.delete(listener)
      }, [])
      return store
    }

    async function refresh() {
      try {
        const response = await fetch(`${ROUTE}/state`, { headers: { accept: 'application/json' } })
        const body = await response.json()
        store.set({ state: body, error: null, loading: false })
      } catch (error) {
        store.set({ error: String(error), loading: false })
      }
    }

    async function act(body) {
      try {
        const response = await fetch(`${ROUTE}/action`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
        const payload = await response.json()
        await refresh()
        return payload
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    }

    function withTeam(state, body) {
      return { ...body, teamId: state?.activeTeamId ?? '' }
    }

    /** 只发动作、不触发整页状态刷新（用于 watch/unwatch 这类高频调用）。 */
    async function actRaw(body) {
      try {
        const response = await fetch(`${ROUTE}/action`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
        return await response.json()
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    }

    /** 读一个会话的实时状态与流式文本。 */
    async function fetchLive(sessionId) {
      try {
        const response = await fetch(`${ROUTE}/live?session=${encodeURIComponent(sessionId)}`, {
          headers: { accept: 'application/json' }
        })
        return await response.json()
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    }

    /** 读一个会话最近的对话（只读，不激活 Agent）。 */
    async function fetchTranscript(sessionId, limit = 30) {
      const response = await fetch(`${ROUTE}/transcript?session=${encodeURIComponent(sessionId)}&limit=${limit}`, {
        headers: { accept: 'application/json' }
      })
      return await response.json()
    }

    // ---- 小组件 ----
    function Button({ children, onClick, disabled, primary, ghost, style, className, title }) {
      const base = `stm-btn${primary ? ' stm-btn-primary' : ''}${ghost ? ' stm-btn-ghost' : ''}`
      const merged = className ? `${base} ${className}` : base
      return h('button', { type: 'button', className: merged, onClick, disabled: disabled === true, style, title }, children)
    }

    function statusOf(member) {
      if (Array.isArray(member.pendingInput) && member.pendingInput.length > 0) {
        return { kind: 'input', label: t('statusInput') }
      }
      if (member.running) return { kind: 'running', label: t('statusRunning') }
      if (member.active) return { kind: 'idle', label: t('statusIdle') }
      return { kind: 'off', label: t('statusOff') }
    }

    function copyText(text) {
      try {
        navigator.clipboard.writeText(text)
      } catch { /* 忽略 */ }
    }

    /** 把 state.models 展平成下拉项。 */
    function modelOptions(models) {
      const rows = []
      for (const provider of models?.providers ?? []) {
        for (const model of provider.models ?? []) {
          rows.push({
            key: `${provider.id}\u0001${model.id}`,
            provider: provider.id,
            providerName: provider.name,
            model: model.id,
            name: model.name,
            efforts: model.efforts ?? [],
            defaultEffort: model.defaultEffort ?? ''
          })
        }
      }
      return rows
    }

    /** 内置 preset 的显示名（Host 的目录只带 id，名称由客户端本地化）。 */
    const presetNames = {
      zh: { standard: '标准模式', ptc: 'PTC 模式', minimal: '极简模式', cordis: '创造模式' },
      en: { standard: 'Standard', ptc: 'PTC', minimal: 'Minimal', cordis: 'Creator' }
    }

    /** Agent 模式（preset）下拉项；standard 作为默认。 */
    function presetOptions(state) {
      const list = state?.presets
      if (!Array.isArray(list)) return []
      return list.filter(preset => preset.broken !== true).map(preset => {
        const fallback = presetNames[currentLocale()]?.[preset.id]
        const name = (typeof preset.name === 'string' && preset.name !== '' && preset.name !== preset.id)
          ? preset.name
          : (fallback ?? preset.id)
        return { id: preset.id, name }
      })
    }

    /** 当前界面语言（用于内置 preset 名称）。 */
    function currentLocale() {
      try {
        const locale = boundLocale?.()
        const id = locale?.id ?? ''
        return id.startsWith('en') ? 'en' : 'zh'
      } catch {
        return 'zh'
      }
    }

    function defaultPresetId(state) {
      const list = presetOptions(state)
      return list.some(preset => preset.id === 'standard') ? 'standard' : ''
    }

    /** 侧栏图标。 */
    function PanelIcon(props) {
      const size = props && typeof props.size === 'number' ? props.size : 18
      const snapshot = useStore()
      usePolling()
      const pending = (snapshot.state?.teams ?? []).reduce((sum, team) => sum + (team.pendingReports ?? 0), 0)
      return h(
        'span',
        { className: 'stm-icon', title: t('panelLabel') },
        h('svg', { width: size, height: size, viewBox: '0 0 36 36', fill: 'none', 'aria-hidden': 'true' },
          h('path', {
            d: 'M18 13.4v4.2M18.2 17.6H10.3v4.4M17.8 17.6h8.1v4.4',
            stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: 0.7
          }),
          h('circle', { cx: 18, cy: 9.4, r: 3.4, fill: 'currentColor' }),
          h('circle', { cx: 10.3, cy: 25.5, r: 3.1, stroke: 'currentColor', strokeWidth: 2 }),
          h('circle', { cx: 25.9, cy: 25.5, r: 3.1, stroke: 'currentColor', strokeWidth: 2 })
        ),
        pending > 0 ? h('span', { className: 'stm-icon-badge' }) : null
      )
    }

    function TeamList({ state, onOpen, onNotice }) {
      const teams = state?.teams ?? []
      return h('div', { className: 'stm-card' },
        h('h3', { className: 'stm-section-title' }, t('teams')),
        teams.length === 0
          ? h('div', { className: 'stm-empty' }, t('noTeams'))
          : teams.map(team => h('div', {
            className: 'stm-row stm-row-click',
            key: team.id,
            onClick: () => onOpen(team.id)
          },
          h('div', { className: 'stm-grow' },
            h('div', { className: 'stm-name' },
              team.name,
              team.id === state.activeTeamId ? h('span', { className: 'stm-chip stm-chip-lead' }, '当前') : null
            ),
            h('div', { className: 'stm-meta' },
              h('span', null, `${t('members')} ${team.memberCount}`),
              team.leadName ? h('span', null, `${t('lead')}: ${team.leadName}`) : null,
              team.runningCount > 0 ? h('span', null, t('statusRunning') + ` ${team.runningCount}`) : null,
              team.openTasks > 0 ? h('span', null, t('openTasks') + ` ${team.openTasks}`) : null,
              team.pendingReports > 0 ? h('span', { className: 'stm-chip stm-chip-warn' }, `${t('pending')} ${team.pendingReports}`) : null
            )
          ),
          h(Button, { ghost: true }, t('openTeam'))
          ))
      )
    }

    function CreateTeamForm({ state, onCreated, onNotice, onClose }) {
      const options = modelOptions(state?.models)
      const fallbackKey = state?.models?.default
        ? `${state.models.default.provider}\u0001${state.models.default.model}`
        : ''
      const [name, setName] = useState('')
      const [cwd, setCwd] = useState(state?.defaultCwd ?? '')
      const presets = presetOptions(state)
      const presetDefault = defaultPresetId(state)
      const [rows, setRows] = useState([
        { name: 'Lead', role: '统筹', stage: 0, lead: true, modelKey: fallbackKey, preset: presetDefault, effort: '' },
        { name: '', role: '', stage: 1, lead: false, modelKey: fallbackKey, preset: presetDefault, effort: '' }
      ])
      const [busy, setBusy] = useState(false)
      const canCreate = state?.creations?.canCreate !== false

      function patch(index, change) {
        setRows(previous => previous.map((row, i) => i === index ? { ...row, ...change } : row))
      }
      function makeLead(index) {
        setRows(previous => previous.map((row, i) => ({ ...row, lead: i === index })))
      }

      function submit() {
        if (busy) return
        const filled = rows.filter(row => row.name.trim() !== '')
        if (filled.length === 0) {
          onNotice(`${t('createFailed')}: ${t('memberName')} 不能为空`)
          return
        }
        const members = filled.map((row, index) => {
          const option = options.find(item => item.key === row.modelKey) ?? null
          return {
            name: row.name.trim(),
            role: row.role.trim(),
            stage: Number.isFinite(Number(row.stage)) ? Number(row.stage) : index + 1,
            lead: row.lead === true,
            ...(row.preset ? { agentPreset: row.preset } : {}),
            ...(row.effort ? { reasoningEffort: row.effort } : {}),
            ...(option === null ? {} : { provider: option.provider, model: option.model })
          }
        })
        setBusy(true)
        act({ kind: 'create-team', name: name.trim(), cwd: cwd.trim(), members }).then(result => {
          setBusy(false)
          if (!result.ok) {
            onNotice(`${t('createFailed')}: ${result.error?.message ?? result.error}`)
            return
          }
          onNotice(t('created', { n: (result.created ?? []).length }))
          const failed = (result.created ?? []).filter(item => item.modelError !== '')
          if (failed.length > 0) onNotice(`${failed.map(item => `${item.name}: ${item.modelError}`).join('; ')}`)
          if (typeof onCreated === 'function') onCreated(result.team)
          else if (typeof onClose === 'function') onClose()
        })
      }

      return h('div', { className: 'stm-card' },
        h('div', { className: 'stm-inline', style: { justifyContent: 'space-between' } },
          h('h3', { className: 'stm-section-title', style: { margin: 0 } }, t('createTitle')),
          onClose ? h(Button, { ghost: true, onClick: onClose }, t('cancel')) : null
        ),
        h('div', { className: 'stm-hint', style: { marginTop: '6px' } }, t('createHint')),
        h('div', { className: 'stm-inline', style: { marginTop: '10px' } },
          h('label', { className: 'stm-field', style: { flex: '1' } }, t('teamNameInput'),
            h('input', {
              className: 'stm-input',
              value: name,
              placeholder: t('teamNameInput'),
              onChange: event => setName(event.target.value)
            })
          ),
          h('label', { className: 'stm-field', style: { flex: '2' } }, t('cwd'),
            h('input', {
              className: 'stm-input',
              value: cwd,
              list: 'stm-workspace-paths',
              placeholder: '/Users/...',
              onChange: event => setCwd(event.target.value)
            }),
            h('datalist', { id: 'stm-workspace-paths' },
              (state?.workspaces ?? []).map(workspace =>
                h('option', { key: workspace.id, value: workspace.path }, workspace.title))
            )
          )
        ),
        h('div', { className: 'stm-hint', style: { marginTop: '4px' } }, t('cwdHint')),
        rows.length === 0 ? h('div', { className: 'stm-hint', style: { marginTop: '8px' } }, t('rowsEmpty')) : null,
        rows.map((row, index) => {
          const rowOption = options.find(option => option.key === row.modelKey) ?? null
          const rowEfforts = rowOption?.efforts ?? []
          return h('div', { className: 'stm-inline', key: index, style: { marginTop: '8px' } },
          h('input', {
            className: 'stm-input',
            value: row.name,
            placeholder: t('memberName'),
            style: { width: '130px' },
            onChange: event => patch(index, { name: event.target.value })
          }),
          h('input', {
            className: 'stm-input',
            value: row.role,
            placeholder: t('roleLabel'),
            style: { width: '110px' },
            onChange: event => patch(index, { role: event.target.value })
          }),
          h('input', {
            className: 'stm-input',
            value: row.stage,
            type: 'number',
            title: t('priorityHint'),
            style: { width: '64px' },
            onChange: event => patch(index, { stage: event.target.value })
          }),
          options.length === 0
            ? null
            : h('select', {
              className: 'stm-select',
              value: row.modelKey,
              style: { width: '190px' },
              onChange: event => {
                const key = event.target.value
                const option = options.find(candidate => candidate.key === key) ?? null
                patch(index, { modelKey: key, effort: option?.defaultEffort ?? '' })
              }
            }, options.map(option => h('option', { value: option.key, key: option.key },
              `${option.providerName} · ${option.name}`))),
          rowEfforts.length === 0
            ? null
            : h('select', {
              className: 'stm-select',
              value: row.effort ?? '',
              style: { width: '110px' },
              title: t('effort'),
              onChange: event => patch(index, { effort: event.target.value })
            },
            h('option', { value: '', key: '' }, t('effortDefault')),
            rowEfforts.map(item => h('option', { value: item.id, key: item.id }, item.name))),
          h('label', { className: 'stm-inline', style: { gap: '4px', fontSize: '12px' } },
            h('input', { type: 'checkbox', checked: row.lead === true, onChange: () => makeLead(index) }),
            t('lead')
          ),
          h(Button, { ghost: true, onClick: () => setRows(previous => previous.filter((_, i) => i !== index)) }, t('removeRow'))
        )}),
        h('div', { className: 'stm-inline', style: { marginTop: '10px' } },
          h(Button, { ghost: true, onClick: () => setRows(previous => [...previous, { name: '', role: '', stage: previous.length, lead: false, modelKey: fallbackKey, preset: presetDefault, effort: '' }]) }, t('addRow')),
          h(Button, { primary: true, onClick: submit, disabled: busy || !canCreate || cwd.trim() === '' || rows.length === 0 }, busy ? t('creating') : t('createBtn')),
          state?.models === null ? h('span', { className: 'stm-hint' }, t('noModelCatalog')) : null
        )
      )
    }

    function MemberRow({
      member, models, state, onNotice, index, isFirst, isLast,
      onMove, onDragStart, onDragOver, onDrop, onDragEnd, dragging, onViewChat
    }) {
      const options = modelOptions(models)
      const current = member.model
      const fallback = models?.default
      const initialKey = current
        ? `${current.provider}\u0001${current.model}`
        : fallback ? `${fallback.provider}\u0001${fallback.model}` : ''
      const [editing, setEditing] = useState(false)
      const [role, setRole] = useState(member.role)
      const [stage, setStage] = useState(String(member.stage))
      const [modelKey, setModelKey] = useState(initialKey)
      const [effort, setEffort] = useState(current?.reasoningEffort ?? '')
      const status = statusOf(member)
      const selectedOption = options.find(option => option.key === modelKey) ?? null
      const dirtyModel = current === null
        || `${current.provider}\u0001${current.model}` !== modelKey
        || (current.reasoningEffort ?? '') !== effort

      function save() {
        const rosterChanged = role !== member.role || String(stage) !== String(member.stage)
        const tasks = []
        if (rosterChanged) {
          tasks.push(act(withTeam(state, { kind: 'update-member', sessionId: member.sessionId, role, stage: Number(stage) })))
        }
        if (dirtyModel && selectedOption !== null) {
          tasks.push(act(withTeam(state, {
            kind: 'select-model',
            sessionId: member.sessionId,
            provider: selectedOption.provider,
            model: selectedOption.model,
            reasoningEffort: effort
          })))
        }
        Promise.all(tasks).then(results => {
          const failed = results.find(result => !result.ok)
          if (failed) {
            onNotice(`${t('modelSaveFailed')}: ${failed.error?.message ?? failed.error}`)
            return
          }
          if (dirtyModel && selectedOption !== null) {
            onNotice(t('modelSaved', {
              name: member.name,
              label: `${selectedOption.name}${effort ? ` · ${effort}` : ''}`
            }))
          }
          setEditing(false)
        })
      }

      const chips = []
      if (member.lead) chips.push(h('span', { key: 'lead', className: 'stm-chip stm-chip-lead' }, t('lead')))
      if (member.role) chips.push(h('span', { key: 'role', className: 'stm-chip' }, member.role))
      chips.push(h('span', { key: 'stage', className: 'stm-chip' }, `${t('stage')} ${member.stage}`))
      const modelText = current
        ? `${current.model}${current.reasoningEffort ? ` · ${current.reasoningEffort}` : ''}`
        : null
      chips.push(h('span', {
        key: 'model',
        className: 'stm-chip',
        title: modelText === null ? t('modelDefault') : `${current.provider}/${current.model}`
      }, modelText === null
        ? (fallback ? t('modelDefaultLabel', { name: fallback.model }) : t('modelDefault'))
        : modelText))
      if (member.unread > 0) chips.push(h('span', { key: 'unread', className: 'stm-chip' }, `${member.unread} ${t('unread')}`))

      const effortOptions = selectedOption?.efforts ?? []
      return h('div', {
        className: `stm-row${dragging === true ? ' stm-row-drag' : ''}`,
        onDragOver,
        onDrop
      },
        h('span', {
          className: 'stm-drag',
          draggable: true,
          title: t('dragHint'),
          onDragStart: event => {
            try { event.dataTransfer?.setData('text/plain', member.sessionId) } catch { /* 忽略 */ }
            if (typeof onDragStart === 'function') onDragStart()
          },
          onDragEnd
        }, '⋮⋮'),
        h('span', { className: `stm-dot stm-dot-${status.kind}` }),
        h('div', { className: 'stm-grow' },
          h('div', { className: 'stm-name' }, member.name, chips),
          h('div', { className: 'stm-meta' },
            h('span', null, status.label),
            h('span', { className: 'stm-mono', title: member.sessionId, onClick: () => copyText(member.sessionId) }, member.sessionId)
          ),
          editing
            ? h('div', { className: 'stm-inline', style: { marginTop: '6px' } },
              h('input', {
                className: 'stm-input',
                value: role,
                placeholder: t('rolePlaceholder'),
                onChange: event => setRole(event.target.value),
                style: { width: '120px' }
              }),
              h('input', {
                className: 'stm-input',
                value: stage,
                type: 'number',
                title: t('priorityHint'),
                onChange: event => setStage(event.target.value),
                style: { width: '70px' }
              }),
              h('select', {
                className: 'stm-select',
                value: modelKey,
                style: { width: '230px' },
                onChange: event => {
                  setModelKey(event.target.value)
                  const option = options.find(candidate => candidate.key === event.target.value)
                  setEffort(option?.defaultEffort ?? '')
                }
              }, options.length === 0
                ? h('option', { value: '', key: '' }, t('modelDefault'))
                : options.map(option => h('option', { value: option.key, key: option.key },
                  `${option.providerName} · ${option.name}`))),
              effortOptions.length === 0
                ? null
                : h('select', {
                  className: 'stm-select',
                  value: effort,
                  style: { width: '120px' },
                  onChange: event => setEffort(event.target.value)
                },
                h('option', { value: '', key: '' }, t('effortDefault')),
                effortOptions.map(item => h('option', { value: item.id, key: item.id }, item.name))
                ),
              h(Button, { onClick: save, primary: true }, t('save')),
              h(Button, { onClick: () => setEditing(false), ghost: true }, t('cancel'))
            )
            : null
        ),
        h(Button, { ghost: true, onClick: () => { if (typeof onViewChat === 'function') onViewChat(member.sessionId) } }, t('viewChat')),
        h(Button, { ghost: true, onClick: () => { if (openSession) openSession(member.sessionId) } }, t('open')),
        h(Button, { ghost: true, onClick: () => setEditing(true) }, t('role')),
        h(Button, { ghost: true, disabled: isFirst === true, onClick: () => { if (typeof onMove === 'function') onMove(-1) } }, '↑'),
        h(Button, { ghost: true, disabled: isLast === true, onClick: () => { if (typeof onMove === 'function') onMove(1) } }, '↓'),
        member.lead
          ? null
          : h(Button, {
            ghost: true,
            onClick: () => act(withTeam(state, { kind: 'set-lead', sessionId: member.sessionId })).then(result => {
              if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
            })
          }, t('setLead')),
        h(Button, {
          ghost: true,
          onClick: () => act(withTeam(state, { kind: 'remove-member', sessionId: member.sessionId })).then(result => {
            if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
          })
        }, t('remove'))
      )
    }

    function AddMembers({ state, onNotice }) {
      const [search, setSearch] = useState('')
      const [selected, setSelected] = useState(() => new Set())
      const [manual, setManual] = useState('')
      const candidates = (state?.sessions ?? []).filter(session => {
        if (session.member) return false
        if (search.trim() === '') return true
        const needle = search.trim().toLowerCase()
        return session.sessionId.toLowerCase().includes(needle)
          || (session.title ?? '').toLowerCase().includes(needle)
          || (session.cwd ?? '').toLowerCase().includes(needle)
      }).slice(0, 60)

      function toggle(sessionId) {
        const next = new Set(selected)
        if (next.has(sessionId)) next.delete(sessionId)
        else next.add(sessionId)
        setSelected(next)
      }

      function addSelected() {
        const items = [...selected].map(sessionId => {
          const candidate = (state?.sessions ?? []).find(session => session.sessionId === sessionId)
          return { sessionId, name: candidate?.title ?? '' }
        })
        if (items.length === 0) return
        act(withTeam(state, { kind: 'add-members', items })).then(result => {
          if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
          else onNotice(t('injected', { n: result.members ?? items.length }))
          setSelected(new Set())
        })
      }

      function addManual() {
        const sessionId = manual.trim()
        if (sessionId === '') return
        act(withTeam(state, { kind: 'add-member', sessionId })).then(result => {
          if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
          setManual('')
        })
      }

      return h('div', { className: 'stm-card' },
        h('h3', { className: 'stm-section-title' }, t('addMember')),
        h('input', {
          className: 'stm-input',
          value: search,
          placeholder: t('search'),
          onChange: event => setSearch(event.target.value)
        }),
        candidates.length === 0
          ? h('div', { className: 'stm-empty' }, t('noReports'))
          : h('div', null, candidates.map(candidate => h('div', { className: 'stm-candidate', key: candidate.sessionId },
            h('input', { type: 'checkbox', checked: selected.has(candidate.sessionId), onChange: () => toggle(candidate.sessionId) }),
            h('div', { className: 'stm-candidate-title' },
              h('div', null, candidate.title || candidate.sessionId),
              h('div', { className: 'stm-candidate-cwd' }, candidate.cwd || ' ')
            ),
            candidate.live ? h('span', { className: 'stm-chip' }, t('statusRunning')) : null
          ))),
        h('div', { className: 'stm-inline', style: { marginTop: '10px' } },
          h(Button, { primary: true, onClick: addSelected, disabled: selected.size === 0 }, `${t('addSelected')} (${selected.size})`)
        ),
        h('div', { className: 'stm-inline', style: { marginTop: '10px' } },
          h('input', {
            className: 'stm-input',
            value: manual,
            placeholder: t('manualPlaceholder'),
            onChange: event => setManual(event.target.value),
            style: { width: '260px' }
          }),
          h(Button, { onClick: addManual }, t('add'))
        )
      )
    }

    /** 在已有团队里「添加一行」新建智能体角色（= 新建 session），支持一次加多行。 */
    function AddAgentRows({ state, onNotice, onDone }) {
      const team = state?.team
      const models = state?.models
      const options = modelOptions(models)
      const presets = presetOptions(state)
      const presetDefault = defaultPresetId(state)
      const fallbackKey = models?.default ? `${models.default.provider}\u0001${models.default.model}` : ''
      const [cwd, setCwd] = useState(team?.cwd || state?.defaultCwd || '')
      const [rows, setRows] = useState([{ name: '', role: '', stage: 0, lead: false, modelKey: fallbackKey, preset: presetDefault, effort: '' }])
      const [busy, setBusy] = useState(false)
      const canCreate = state?.creations?.canCreate !== false

      useEffect(() => {
        setCwd(team?.cwd || state?.defaultCwd || '')
      }, [team?.id])

      function patch(index, change) {
        setRows(previous => previous.map((row, i) => i === index ? { ...row, ...change } : row))
      }

      function submit() {
        if (busy) return
        const filled = rows.filter(row => row.name.trim() !== '')
        if (filled.length === 0) {
          onNotice(`${t('failed')}: ${t('memberName')} 不能为空`)
          return
        }
        const items = filled.map((row, index) => {
          const option = options.find(item => item.key === row.modelKey) ?? null
          return {
            name: row.name.trim(),
            role: row.role.trim(),
            stage: Number.isFinite(Number(row.stage)) ? Number(row.stage) : (team?.members?.length ?? 0) + index + 1,
            lead: row.lead === true,
            ...(row.preset ? { agentPreset: row.preset } : {}),
            ...(row.effort ? { reasoningEffort: row.effort } : {}),
            ...(option === null ? {} : { provider: option.provider, model: option.model })
          }
        })
        setBusy(true)
        act(withTeam(state, { kind: 'create-members', cwd: cwd.trim(), items })).then(result => {
          setBusy(false)
          if (!result.ok) {
            onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
            return
          }
          onNotice(t('addAgentCreated', { n: (result.created ?? []).length }))
          const failed = (result.created ?? []).filter(item => item.modelError !== '')
          if (failed.length > 0) onNotice(`${failed.map(item => `${item.name}: ${item.modelError}`).join('; ')}`)
          setRows([{ name: '', role: '', stage: 0, lead: false, modelKey: fallbackKey, preset: presetDefault, effort: '' }])
          if (typeof onDone === 'function') onDone()
        })
      }

      return h('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l1)', marginTop: '6px', paddingTop: '6px' } },
        h('div', { className: 'stm-hint' }, t('addAgentHint')),
        h('div', { className: 'stm-inline', style: { marginTop: '8px' } },
          h('label', { className: 'stm-field', style: { flex: '1' } }, t('cwd'),
            h('input', {
              className: 'stm-input',
              value: cwd,
              list: 'stm-agent-workspace-paths',
              placeholder: '/Users/...',
              onChange: event => setCwd(event.target.value)
            }),
            h('datalist', { id: 'stm-agent-workspace-paths' },
              (state?.workspaces ?? []).map(workspace =>
                h('option', { key: workspace.id, value: workspace.path }, workspace.title))
            )
          )
        ),
        rows.length === 0 ? h('div', { className: 'stm-hint', style: { marginTop: '8px' } }, t('rowsEmpty')) : null,
        rows.map((row, index) => {
          const rowOption = options.find(option => option.key === row.modelKey) ?? null
          const rowEfforts = rowOption?.efforts ?? []
          return h('div', { className: 'stm-inline', key: index, style: { marginTop: '8px' } },
          h('input', {
            className: 'stm-input',
            value: row.name,
            placeholder: t('memberName'),
            style: { width: '130px' },
            onChange: event => patch(index, { name: event.target.value })
          }),
          h('input', {
            className: 'stm-input',
            value: row.role,
            placeholder: t('roleLabel'),
            style: { width: '110px' },
            onChange: event => patch(index, { role: event.target.value })
          }),
          h('input', {
            className: 'stm-input',
            value: row.stage,
            type: 'number',
            title: t('priorityHint'),
            style: { width: '64px' },
            onChange: event => patch(index, { stage: event.target.value })
          }),
          options.length === 0
            ? null
            : h('select', {
              className: 'stm-select',
              value: row.modelKey,
              style: { width: '180px' },
              onChange: event => {
                const key = event.target.value
                const option = options.find(candidate => candidate.key === key) ?? null
                patch(index, { modelKey: key, effort: option?.defaultEffort ?? '' })
              }
            }, options.map(option => h('option', { value: option.key, key: option.key },
              `${option.providerName} · ${option.name}`))),
          rowEfforts.length === 0
            ? null
            : h('select', {
              className: 'stm-select',
              value: row.effort ?? '',
              style: { width: '110px' },
              title: t('effort'),
              onChange: event => patch(index, { effort: event.target.value })
            },
            h('option', { value: '', key: '' }, t('effortDefault')),
            rowEfforts.map(item => h('option', { value: item.id, key: item.id }, item.name))),
          presets.length === 0
            ? null
            : h('select', {
              className: 'stm-select',
              value: row.preset ?? '',
              style: { width: '120px' },
              title: t('preset'),
              onChange: event => patch(index, { preset: event.target.value })
            }, presets.map(preset => h('option', { value: preset.id, key: preset.id }, preset.name))),
          h('label', { className: 'stm-inline', style: { gap: '4px', fontSize: '12px' } },
            h('input', {
              type: 'checkbox',
              checked: row.lead === true,
              onChange: () => setRows(previous => previous.map((candidate, i) => ({ ...candidate, lead: i === index ? !row.lead : false })))
            }),
            t('lead')
          ),
          h(Button, { ghost: true, onClick: () => setRows(previous => previous.filter((_, i) => i !== index)) }, t('removeRow'))
        )}),
        h('div', { className: 'stm-inline', style: { marginTop: '10px' } },
          h(Button, { ghost: true, onClick: () => setRows(previous => [...previous, { name: '', role: '', stage: previous.length, lead: false, modelKey: fallbackKey, preset: presetDefault, effort: '' }]) }, t('addRow')),
          h(Button, { primary: true, onClick: submit, disabled: busy || !canCreate || cwd.trim() === '' || rows.length === 0 }, busy ? t('creating') : t('addAgentBtn')),
          h(Button, { ghost: true, onClick: () => { if (typeof onDone === 'function') onDone() } }, t('cancel'))
        )
      )
    }

    function DispatchBox({ state, onNotice }) {
      const members = state?.team?.members ?? []
      const leadMember = members.find(member => member.lead) ?? null
      const [target, setTarget] = useState('all')
      const [text, setText] = useState('')
      const [mode, setMode] = useState('queue')
      const [busy, setBusy] = useState(false)

      function send() {
        if (text.trim() === '') return
        setBusy(true)
        act(withTeam(state, { kind: 'dispatch', mode, tasks: [{ target, text }] })).then(result => {
          setBusy(false)
          if (!result.ok) {
            onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
            return
          }
          const failed = (result.results ?? []).filter(item => !item.ok)
          if (failed.length > 0) onNotice(`${t('failed')}: ${failed.map(item => `${item.name} ${item.error}`).join('; ')}`)
          else {
            setText('')
            onNotice(`${t('done')}: ${(result.results ?? []).map(item => item.name).join(', ')}`)
          }
        })
      }

      return h('div', { className: 'stm-card' },
        h('h3', { className: 'stm-section-title' }, t('taskTitle')),
        h('div', { className: 'stm-inline' },
          h('label', { className: 'stm-field', style: { flex: '1' } }, t('target'),
            h('select', { className: 'stm-select', value: target, onChange: event => setTarget(event.target.value) },
              h('option', { value: 'all', key: 'all' }, `${t('all')}（${members.filter(member => !member.lead).length}）`),
              leadMember
                ? h('option', { value: 'lead', key: 'lead' }, `${t('leadTarget')}：${leadMember.name}`)
                : null,
              members.filter(member => !member.lead).map(member =>
                h('option', { value: member.sessionId, key: member.sessionId }, member.name))
            )
          ),
          h('label', { className: 'stm-field', style: { flex: '1' } }, t('mode'),
            h('select', { className: 'stm-select', value: mode, onChange: event => setMode(event.target.value) },
              h('option', { value: 'queue', key: 'queue' }, t('modeQueue')),
              h('option', { value: 'steer', key: 'steer' }, t('modeSteer'))
            )
          )
        ),
        h('textarea', {
          className: 'stm-textarea',
          style: { marginTop: '8px' },
          value: text,
          placeholder: t('taskPlaceholder'),
          onChange: event => setText(event.target.value)
        }),
        h('div', { className: 'stm-inline', style: { marginTop: '8px' } },
          h(Button, { primary: true, onClick: send, disabled: busy || text.trim() === '' }, busy ? t('sending') : t('send'))
        )
      )
    }

    /** 右侧滑出抽屉：观察某个角色的对话（不切换左侧会话列表）。 */
    function TranscriptDrawer({ state, sessionId, onClose, onSelect }) {
      const members = state?.team?.members ?? []
      const member = members.find(candidate => candidate.sessionId === sessionId) ?? null
      const [transcript, setTranscript] = useState(null)
      const [error, setError] = useState('')
      const [loading, setLoading] = useState(false)
      const scrollRef = useRef(null)
      const lastSeq = transcript?.messages?.length ? transcript.messages[transcript.messages.length - 1].seq : -1

      async function load(quiet) {
        if (member === null) return
        if (quiet !== true) setLoading(true)
        try {
          const payload = await fetchTranscript(member.sessionId, 30)
          if (payload.ok === false) {
            setError(payload.error ?? 'unknown')
            return
          }
          setError('')
          setTranscript(payload)
        } catch (cause) {
          setError(String(cause))
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => {
        setTranscript(null)
        setError('')
        load()
      }, [member?.sessionId])

      useEffect(() => {
        const timer = setInterval(() => { load(true) }, 2500)
        return () => clearInterval(timer)
      }, [member?.sessionId])

      useEffect(() => {
        const element = scrollRef.current
        if (element !== null && element !== undefined) element.scrollTop = element.scrollHeight
      }, [lastSeq])

      const status = member === null
        ? { kind: 'off', label: t('drawerOff') }
        : member.running ? { kind: 'running', label: t('drawerRunning') }
          : member.active ? { kind: 'idle', label: t('drawerIdle') }
            : { kind: 'off', label: t('drawerOff') }

      return h('div', { className: 'stm-drawer' },
        h('div', { className: 'stm-drawer-head' },
          h('div', null,
            h('div', { className: 'stm-drawer-title' }, member === null ? t('drawerTitle') : member.name),
            h('div', { className: 'stm-drawer-sub' },
              member === null ? '' : `${member.role === '' ? '-' : member.role} · ${status.label} · ${t('stage')} ${member.stage}`,
              error === '' ? '' : ` · ${t('drawerFailed', { msg: error })}`)
          ),
          h(Button, { ghost: true, onClick: onClose }, t('cancel'))
        ),
        h('div', { className: 'stm-drawer-tabs' },
          members.map(candidate => h('button', {
            key: candidate.sessionId,
            className: `stm-tab${candidate.sessionId === sessionId ? ' stm-tab-on' : ''}`,
            onClick: () => onSelect(candidate.sessionId)
          }, `${candidate.name}${candidate.lead ? ` · ${t('lead')}` : ''}`))
        ),
        h('div', { className: 'stm-drawer-transcript', ref: scrollRef },
          transcript === null
            ? h('div', { className: 'stm-empty' }, loading ? t('drawerLoading') : t('drawerEmpty'))
            : transcript.messages.length === 0
              ? h('div', { className: 'stm-empty' }, t('drawerEmpty'))
              : transcript.messages.map(message => h('div', { key: message.seq, className: `stm-msg stm-msg-${message.role}` },
                h('div', { className: 'stm-msg-role' },
                  `${message.role === 'user' ? t('user') : message.role === 'assistant' ? 'Assistant' : 'Tool'}`,
                  message.time > 0 ? ` · ${new Date(message.time).toLocaleTimeString('zh-CN', { hour12: false })}` : ''),
                h('div', { className: 'stm-msg-text' }, message.text),
                message.tools !== undefined && message.tools.length > 0
                  ? h('div', { className: 'stm-msg-tools' }, `${t('tools')}: ${message.tools.join(', ')}`)
                  : null
              ))
        ),
        h('div', { className: 'stm-drawer-foot' },
          h(Button, { ghost: true, onClick: () => load() }, t('drawerRefresh')),
          member === null
            ? null
            : h(Button, { primary: true, onClick: () => { if (openSession) openSession(member.sessionId) } }, t('drawerOpenChat'))
        )
      )
    }

    /** 卡片折叠状态（按 key 记在本地，刷新后保持）。 */
    function useCollapse(key, initialOpen) {
      const storeKey = `session-team:card:${key}`
      const [open, setOpen] = useState(() => {
        try {
          const stored = window.localStorage.getItem(storeKey)
          if (stored === '1' || stored === '0') return stored === '1'
        } catch { /* 忽略 */ }
        return initialOpen
      })
      useEffect(() => {
        try { window.localStorage.setItem(storeKey, open ? '1' : '0') } catch { /* 忽略 */ }
      }, [open])
      return [open, setOpen]
    }

    /** 卡片标题栏：标题 + 计数 + 标签页 + 折叠按钮。 */
    function CardHead({ title, tabs, tab, onTab, open, onToggle, collapseLabel }) {
      return h('div', { className: 'stm-inline', style: { justifyContent: 'space-between', alignItems: 'center' } },
        h('div', { className: 'stm-inline', style: { gap: '10px', flexWrap: 'wrap' } },
          h('h3', { className: 'stm-section-title', style: { margin: 0 } }, title),
          tabs === null || tabs === undefined
            ? null
            : h('div', { className: 'stm-tabs' }, tabs.map(item => h('button', {
              key: item.id,
              className: `stm-tab${tab === item.id ? ' stm-tab-on' : ''}`,
              onClick: () => onTab(item.id)
            }, `${item.label} ${item.count}`)))
        ),
        h(Button, { ghost: true, onClick: onToggle }, open ? collapseLabel : t('expand'))
      )
    }

    /** 汇报列表：默认只看未读，按需展开全文与历史。 */
    function ReportList({ state }) {
      const [tab, setTab] = useState('unread')
      const [visible, setVisible] = useState(5)
      const [open, setOpen] = useCollapse('reports', true)
      const [expanded, setExpanded] = useState(() => new Set())
      const all = state?.team?.reports ?? []
      const unread = all.filter(report => !report.delivered)
      const list = tab === 'unread' ? unread : all
      const total = Number(state?.team?.reportTotal ?? all.length)
      const collapsed = tab === 'unread' ? unread.length : total
      const ordered = list.slice().reverse()
      const shown = ordered.slice(0, visible)
      const rest = ordered.length - shown.length
      const tabs = [
        { id: 'unread', label: t('tabUnread'), count: unread.length },
        { id: 'all', label: t('tabAll'), count: total },
      ]

      function toggleBody(key) {
        setExpanded(previous => {
          const next = new Set(previous)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
      }

      return h('div', { className: 'stm-card' },
        h(CardHead, {
          title: t('reports'),
          tabs,
          tab,
          onTab: id => { setTab(id); setVisible(5) },
          open,
          onToggle: () => setOpen(!open),
          collapseLabel: t('collapseBody')
        }),
        open
          ? h('div', null,
            collapsed === 0
              ? h('div', { className: 'stm-empty' }, tab === 'unread' ? t('noUnreadReports') : t('noReports'))
              : h('div', { className: 'stm-scroll', style: { marginTop: '6px' } },
                shown.map((report, index) => {
                  const key = `${report.createdAt}-${index}`
                  const isOpen = expanded.has(key)
                  return h('div', { className: 'stm-report', key },
                    h('div', { className: 'stm-report-head' },
                      h('span', { className: 'stm-report-subject' }, report.subject),
                      h('span', { className: 'stm-chip' }, report.state),
                      h('span', null, `${report.from}${report.role ? `（${report.role}）` : ''} · ${t('stage')} ${report.stage}`),
                      h('span', { className: 'stm-chip' }, report.delivered ? t('delivered') : t('queued'))
                    ),
                    report.body === ''
                      ? null
                      : h('div', {
                        className: `stm-report-body${isOpen ? '' : ' stm-report-body-clamp'}`,
                        onClick: () => toggleBody(key),
                        style: { cursor: 'pointer' }
                      }, report.body),
                    report.body === ''
                      ? null
                      : h(Button, { ghost: true, onClick: () => toggleBody(key), style: { marginTop: '2px' } }, isOpen ? t('collapseBody') : t('expand'))
                  )
                })
              ),
            rest > 0
              ? h('div', { className: 'stm-more' }, h(Button, { ghost: true, onClick: () => setVisible(visible + 20) }, t('showMore', { n: rest })))
              : null,
            tab === 'all' && total > all.length
              ? h('div', { className: 'stm-hint', style: { marginTop: '4px' } }, t('olderNotLoaded', { n: total }))
              : null
          )
          : null
      )
    }

    function taskStateOf(task) {
      if (task.state === 'done') return { label: t('taskDone'), kind: 'done' }
      if (task.state === 'blocked') return { label: t('taskBlocked'), kind: 'blocked' }
      if (task.stale === true) return { label: t('taskStale'), kind: 'stale' }
      return { label: t('taskRunning'), kind: 'running' }
    }

    /** 任务与恢复：默认只看未完成，按需看历史。 */
    function TaskCard({ state, onNotice }) {
      const [busy, setBusy] = useState('')
      const [tab, setTab] = useState('open')
      const [visible, setVisible] = useState(10)
      const [open, setOpen] = useCollapse('tasks', true)
      const all = state?.team?.tasks ?? []
      const openTasks = all.filter(task => task.state === 'dispatched' || task.state === 'paused')
      const list = tab === 'open' ? openTasks : all
      const total = Number(state?.team?.taskTotal ?? all.length)
      const ordered = list.slice().reverse()
      const shown = ordered.slice(0, visible)
      const rest = ordered.length - shown.length
      const tabs = [
        { id: 'open', label: t('tabOpen'), count: Number(state?.team?.openTasks ?? openTasks.length) },
        { id: 'all', label: t('tabAll'), count: total },
      ]

      function recover(task) {
        setBusy(task.id)
        act(withTeam(state, { kind: 'recover', sessionId: task.sessionId })).then(result => {
          setBusy('')
          if (!result.ok) {
            onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
            return
          }
          const resumed = (result.results ?? []).filter(item => item.ok && item.skipped === '')
          onNotice(resumed.length === 0
            ? t('recoveredNone')
            : `${t('done')}: ${resumed.map(item => item.name).join(', ')}`)
        })
      }

      return h('div', { className: 'stm-card' },
        h(CardHead, {
          title: t('tasks'),
          tabs,
          tab,
          onTab: id => { setTab(id); setVisible(10) },
          open,
          onToggle: () => setOpen(!open),
          collapseLabel: t('collapseBody')
        }),
        open
          ? h('div', null,
            shown.length === 0
              ? h('div', { className: 'stm-empty' }, tab === 'open' ? t('noOpenTasks') : t('noTasks'))
              : h('div', { className: 'stm-scroll', style: { marginTop: '6px' } },
                shown.map(task => {
                  const status = taskStateOf(task)
                  return h('div', { className: 'stm-report', key: task.id },
                    h('div', { className: 'stm-report-head' },
                      h('span', { className: 'stm-report-subject' }, task.subject),
                      h('span', { className: `stm-chip${status.kind === 'stale' ? ' stm-chip-warn' : ''}` }, status.label),
                      h('span', null, task.name),
                      h('span', null, t('taskDispatchedAt', { time: new Date(task.dispatchedAt).toLocaleTimeString('zh-CN', { hour12: false }) })),
                      task.resumeCount > 0 ? h('span', null, t('taskResumed', { n: task.resumeCount })) : null,
                      task.stale === true
                        ? h(Button, { ghost: true, disabled: busy === task.id, onClick: () => recover(task) }, busy === task.id ? '…' : t('recover'))
                        : null
                    )
                  )
                })
              ),
            rest > 0
              ? h('div', { className: 'stm-more' }, h(Button, { ghost: true, onClick: () => setVisible(visible + 20) }, t('showMore', { n: rest })))
              : null,
            tab === 'all' && total > all.length
              ? h('div', { className: 'stm-hint', style: { marginTop: '4px' } }, t('olderNotLoaded', { n: total }))
              : null
          )
          : null
      )
    }

    /** 把小菜单：次要操作收进 ⋯，主按钮保持克制。 */
    function MenuButton({ title, items }) {
      const [open, setOpen] = useState(false)
      useEffect(() => {
        if (!open) return undefined
        const close = () => setOpen(false)
        window.addEventListener('click', close)
        return () => window.removeEventListener('click', close)
      }, [open])
      const visible = (items ?? []).filter(item => item !== null && item !== undefined)
      if (visible.length === 0) return null
      return h('div', { className: 'stm-menu-wrap', onClick: event => event.stopPropagation() },
        h('button', { className: 'stm-icon-btn', title, onClick: () => setOpen(!open) }, '⋯'),
        open
          ? h('div', { className: 'stm-menu' }, visible.map(item => h('button', {
            key: item.label,
            className: `stm-menu-item${item.danger === true ? ' stm-menu-danger' : ''}`,
            onClick: () => { setOpen(false); item.onClick() }
          }, item.label)))
          : null
      )
    }

    /** 左侧角色栏：一屏看到所有角色状态，点一下切换对话。 */
    function MemberRail({ state, selectedId, onSelect, onAdd, adding }) {
      const members = state?.team?.members ?? []
      return h('div', { className: 'stm-rail' },
        h('div', { className: 'stm-rail-head' },
          h('span', null, `${t('railTitle')} ${members.length}`),
          h(Button, { ghost: true, onClick: onAdd }, adding ? t('cancel') : '＋')
        ),
        h('div', { className: 'stm-rail-list' },
          members.map(member => {
            const status = statusOf(member)
            const chips = []
            if (member.role) chips.push(member.role)
            chips.push(`${t('stage')} ${member.stage}`)
            return h('button', {
              key: member.sessionId,
              className: `stm-rail-item${member.sessionId === selectedId ? ' stm-rail-item-on' : ''}`,
              onClick: () => onSelect(member.sessionId)
            },
              h('span', { className: `stm-dot stm-dot-${status.kind}`, style: { marginTop: '5px' } }),
              h('div', { className: 'stm-rail-main' },
                h('div', { className: 'stm-rail-name' },
                  h('span', null, member.name),
                  member.lead ? h('span', { className: 'stm-rail-badge' }, t('lead')) : null
                ),
                h('div', { className: 'stm-rail-sub' },
                  h('span', null, status.label),
                  chips.length === 0 ? null : h('span', null, chips.join(' · '))
                )
              ),
              member.unread > 0 ? h('span', { className: 'stm-rail-badge' }, `${member.unread}`) : null
            )
          })
        )
      )
    }

    /** 一条对话消息：系统上下文、长文本折叠、工具调用单独样式。 */
    function MessageRow({ message, expanded, onToggle }) {
      const long = message.text !== undefined && message.text.length > 600
      const isSystem = message.role === 'user' && message.text !== undefined && message.text.includes('<system-reminder>')
      if (message.role === 'tool') {
        return h('div', { className: 'stm-msg-tool' }, message.text)
      }
      const roles = message.role === 'user'
        ? (isSystem ? t('msgSystem') : t('user'))
        : 'Assistant'
      return h('div', { className: `stm-msg${message.role === 'user' && !isSystem ? ' stm-msg-user' : ''}${isSystem ? ' stm-msg-system' : ''}` },
        h('div', { className: 'stm-msg-role' },
          h('span', null, roles),
          message.time > 0 ? h('span', null, new Date(message.time).toLocaleTimeString('zh-CN', { hour12: false })) : null
        ),
        h('div', {
          className: `stm-msg-text${long && expanded !== true ? ' stm-msg-clamp' : ''}`,
          onClick: long ? onToggle : undefined,
          style: long ? { cursor: 'pointer' } : undefined
        }, message.text),
        long
          ? h('button', { className: 'stm-tab', style: { alignSelf: 'flex-start' }, onClick: onToggle }, expanded ? t('collapseBody') : t('expand'))
          : null,
        message.tools !== undefined && message.tools.length > 0
          ? h('div', { className: 'stm-msg-tools' },
            h('span', null, `${t('tools')}:`),
            message.tools.map(tool => h('span', { key: tool, className: 'stm-chip' }, tool))
          )
          : null
      )
    }

    /** 中间对话区：历史 + 实时流式输出 + 发消息/派活/中断。 */
    function ConversationPane({ state, sessionId, draft, onDraft, onNotice, openSession }) {
      const member = (state?.team?.members ?? []).find(candidate => candidate.sessionId === sessionId) ?? null
      const [transcript, setTranscript] = useState(null)
      const [live, setLive] = useState(null)
      const [error, setError] = useState('')
      const [loading, setLoading] = useState(false)
      const [busy, setBusy] = useState('')
      const [mode, setMode] = useState('message')
      const [expanded, setExpanded] = useState(() => new Set())
      const scrollRef = useRef(null)
      const runningRef = useRef(false)
      const lastSeq = transcript?.messages?.length
        ? transcript.messages[transcript.messages.length - 1].seq
        : -1

      async function loadTranscript(quiet) {
        if (sessionId === '') return
        if (quiet !== true) setLoading(true)
        try {
          const payload = await fetchTranscript(sessionId, 40)
          if (payload.ok === false) setError(payload.error ?? 'unknown')
          else {
            setError('')
            setTranscript(payload)
          }
        } catch (cause) {
          setError(String(cause))
        } finally {
          setLoading(false)
        }
      }

      useEffect(() => {
        if (sessionId === '') return undefined
        setTranscript(null)
        setLive(null)
        setError('')
        setExpanded(new Set())
        loadTranscript()
        actRaw({ kind: 'watch', sessionId })
        return () => { actRaw({ kind: 'unwatch', sessionId }) }
      }, [sessionId])

      useEffect(() => {
        if (sessionId === '') return undefined
        let stopped = false
        async function tick() {
          if (stopped) return
          const payload = await fetchLive(sessionId)
          if (stopped) return
          if (payload.ok !== false) {
            setLive(payload)
            if (runningRef.current === true && payload.running !== true) loadTranscript(true)
            runningRef.current = payload.running === true
          }
        }
        tick()
        const timer = setInterval(tick, 1500)
        return () => {
          stopped = true
          clearInterval(timer)
        }
      }, [sessionId])

      useEffect(() => {
        const element = scrollRef.current
        if (element !== null && element !== undefined) element.scrollTop = element.scrollHeight
      }, [lastSeq, live?.streamText?.length])

      async function send(steer) {
        const text = draft.trim()
        if (text === '') return
        setBusy('send')
        const result = mode === 'dispatch'
          ? await act(withTeam(state, {
            kind: 'dispatch',
            mode: steer ? 'steer' : 'queue',
            tasks: [{ target: sessionId, text }]
          }))
          : await actRaw({ kind: 'message', sessionId, text, mode: steer ? 'steer' : 'queue' })
        setBusy('')
        if (result === null || result === undefined || result.ok === false) {
          onNotice(`${t('failed')}: ${result?.error?.message ?? result?.error ?? 'unknown'}`)
          return
        }
        onDraft('')
        if (mode === 'dispatch') {
          const failed = (result.results ?? []).filter(item => !item.ok)
          onNotice(failed.length > 0
            ? `${t('failed')}: ${failed.map(item => `${item.name} ${item.error}`).join('; ')}`
            : `${t('done')}: ${(result.results ?? []).map(item => item.name).join(', ')}`)
        }
        loadTranscript(true)
      }

      async function dispatchAll() {
        const text = draft.trim()
        if (text === '') {
          onNotice(`${t('failed')}: ${t('enterText')}`)
          return
        }
        setBusy('send')
        const result = await act(withTeam(state, { kind: 'dispatch', mode: 'queue', tasks: [{ target: 'all', text }] }))
        setBusy('')
        if (result.ok === false) {
          onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
          return
        }
        onDraft('')
        onNotice(`${t('done')}: ${(result.results ?? []).map(item => item.name).join(', ')}`)
      }

      async function interrupt() {
        setBusy('cancel')
        const result = await act({ kind: 'cancel', sessionId })
        setBusy('')
        if (result.ok === false) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
        else {
          onNotice(t('done'))
          loadTranscript(true)
        }
      }

      async function renameSession(name) {
        const title = typeof window.prompt === 'function' ? window.prompt(t('sessionRename'), name) : ''
        if (typeof title !== 'string' || title.trim() === '') return
        const result = await act({ kind: 'rename-session', sessionId, title: title.trim() })
        if (result.ok === false) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
      }

      async function archiveSession() {
        if (typeof window.confirm === 'function' && !window.confirm(t('sessionArchive'))) return
        const result = await act({ kind: 'archive-session', sessionId })
        if (result.ok === false) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
        else onNotice(`${t('done')}: ${t('sessionArchive')}`)
      }

      function toggleMessage(key) {
        setExpanded(previous => {
          const next = new Set(previous)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
      }

      if (member === null) {
        return h('div', { className: 'stm-chat' }, h('div', { className: 'stm-empty' }, t('chatEmpty')))
      }

      const running = live?.running === true || member.running === true
      const status = statusOf(member)
      const chips = []
      if (member.role) chips.push(member.role)
      chips.push(`${t('stage')} ${member.stage}`)
      if (member.model !== null && member.model !== undefined) {
        chips.push(`${member.model.model}${member.model.reasoningEffort ? ` · ${member.model.reasoningEffort}` : ''}`)
      }
      if (member.lead) chips.push(t('lead'))

      return h('div', { className: 'stm-chat' },
        h('div', { className: 'stm-chat-head' },
          h('div', { className: 'stm-chat-head-id' },
            h('span', { className: `stm-dot stm-dot-${status.kind}` }),
            h('strong', null, member.name),
            chips.map(chip => h('span', { className: 'stm-chip', key: chip }, chip)),
            live?.pendingInput !== undefined && live.pendingInput.length > 0
              ? h('span', { className: 'stm-chip stm-chip-warn' }, t('pendingInput'))
              : null
          ),
          h('div', { className: 'stm-inline' },
            h(Button, { ghost: true, onClick: () => { if (openSession) openSession(sessionId) } }, t('drawerOpenChat')),
            h(MenuButton, {
              title: t('chatMenu'),
              items: [
                { label: t('chatRefresh'), onClick: () => loadTranscript() },
                { label: t('sessionRename'), onClick: () => renameSession(member.name) },
                { label: t('sessionArchive'), onClick: archiveSession },
                { label: t('dispatchAll'), onClick: dispatchAll }
              ]
            })
          )
        ),
        h('div', { className: 'stm-chat-body', ref: scrollRef },
          error === '' ? null : h('div', { className: 'stm-notice stm-notice-error' }, `${t('failed')}: ${error}`),
          transcript === null
            ? h('div', { className: 'stm-empty' }, loading ? t('drawerLoading') : t('chatEmpty'))
            : transcript.messages.length === 0
              ? h('div', { className: 'stm-empty' }, t('chatEmpty'))
              : transcript.messages.map((message, index) => {
                const key = message.seq
                return h(MessageRow, {
                  key,
                  message,
                  expanded: expanded.has(key),
                  onToggle: () => toggleMessage(key)
                })
              }),
          running
            ? h('div', { className: 'stm-live' },
              h('div', { className: 'stm-msg-role' }, t('liveRunning')),
              h('div', null, live?.streamText === undefined || live?.streamText === '' ? '…' : live.streamText),
              live?.tools !== undefined && live.tools.length > 0
                ? h('div', { className: 'stm-msg-tools' },
                  h('span', null, `${t('liveTools')}:`),
                  live.tools.map(tool => h('span', { key: tool, className: 'stm-chip' }, tool))
                )
                : null
            )
            : null
        ),
        h('div', { className: 'stm-chat-foot' },
          h('div', { className: 'stm-compose' },
            h('textarea', {
              className: 'stm-textarea',
              value: draft,
              placeholder: t('chatPlaceholder'),
              onChange: event => onDraft(event.target.value),
              onKeyDown: event => {
                if (event.key === 'Enter' && event.shiftKey !== true) {
                  event.preventDefault()
                  send(event.ctrlKey === true)
                }
              }
            }),
            h('div', { className: 'stm-inline', style: { justifyContent: 'space-between', flexWrap: 'wrap' } },
              h('div', { className: 'stm-inline' },
                h('div', { className: 'stm-seg' },
                  h('button', { className: mode === 'message' ? 'stm-seg-on' : '', onClick: () => setMode('message') }, t('modeMessage')),
                  h('button', { className: mode === 'dispatch' ? 'stm-seg-on' : '', onClick: () => setMode('dispatch') }, t('dispatchTab'))
                ),
                running
                  ? h(Button, { ghost: true, onClick: () => send(true), disabled: busy !== '' }, t('sendSteer'))
                  : null
              ),
              h('div', { className: 'stm-inline' },
                running
                  ? h(Button, { ghost: true, onClick: interrupt, disabled: busy !== '' }, busy === 'cancel' ? '…' : t('interrupt'))
                  : null,
                h(Button, { primary: true, onClick: () => send(false), disabled: busy !== '' || draft.trim() === '' }, busy === 'send' ? '…' : t('sendQueue'))
              )
            ),
            h('div', { className: 'stm-compose-hint' }, t('composeHint'))
          )
        )
      )
    }

    /** 右侧工作区：可收起；任务 / 汇报 / 通知 / 派活。 */
    function SidePanel({ state, onNotice, onReply, open, onToggle, openSession }) {
      const team = state?.team ?? {}
      const tasks = team.tasks ?? []
      const reports = team.reports ?? []
      const notices = team.notices ?? []
      const [tab, setTab] = useState('tasks')
      const [expanded, setExpanded] = useState(() => new Set())
      const [busy, setBusy] = useState('')

      const openTasks = tasks.filter(task => task.state === 'dispatched' || task.state === 'paused')
      const unread = reports.filter(report => !report.delivered)
      const pendingNotices = notices.filter(item => !item.delivered)

      async function recover(task) {
        setBusy(task.id)
        const result = await act(withTeam(state, { kind: 'recover', sessionId: task.sessionId }))
        setBusy('')
        if (result.ok === false) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
        else onNotice(t('done'))
      }

      if (open !== true) {
        return h('div', {
          className: 'stm-side-rail',
          onClick: onToggle,
          title: t('panelExpand')
        },
          h('span', null, `${t('tasks')} ${openTasks.length}`),
          h('span', null, `${t('reports')} ${unread.length}`),
          h('span', null, '‹')
        )
      }

      const tabs = [
        { id: 'tasks', label: `${t('tasks')} ${openTasks.length}` },
        { id: 'reports', label: `${t('reports')} ${unread.length}` },
        { id: 'notices', label: `${t('noticeTab')} ${pendingNotices.length}` },
        { id: 'dispatch', label: t('dispatchTab') }
      ]

      return h('div', { className: 'stm-side' },
        h('div', { className: 'stm-side-tabs' },
          tabs.map(item => h('button', {
            key: item.id,
            className: `stm-tab${tab === item.id ? ' stm-tab-on' : ''}`,
            onClick: () => setTab(item.id)
          }, item.label)),
          h('div', { style: { marginLeft: 'auto' } }, h(Button, { ghost: true, onClick: onToggle }, t('panelCollapse')))
        ),
        h('div', { className: 'stm-side-body' },
          tab === 'tasks'
            ? (openTasks.length === 0
              ? h('div', { className: 'stm-empty' }, t('noOpenTasks'))
              : openTasks.slice().reverse().slice(0, 12).map(task => {
                const status = taskStateOf(task)
                return h('div', { className: 'stm-item', key: task.id },
                  h('div', { className: 'stm-item-head' },
                    h('span', { className: `stm-chip${status.kind === 'stale' ? ' stm-chip-warn' : ''}` }, status.label),
                    h('span', null, task.name)
                  ),
                  h('div', { className: 'stm-item-subject' }, task.subject),
                  h('div', { className: 'stm-inline' },
                    task.stale === true
                      ? h(Button, { ghost: true, onClick: () => recover(task), disabled: busy === task.id }, busy === task.id ? '…' : t('recover'))
                      : null,
                    h(Button, { ghost: true, onClick: () => onReply(task.sessionId, task.subject) }, t('reply'))
                  )
                )
              }))
            : tab === 'reports'
              ? (unread.length === 0
                ? h('div', { className: 'stm-empty' }, t('noUnreadReports'))
                : unread.slice().reverse().slice(0, 12).map((report, index) => {
                  const key = `${report.createdAt}-${index}`
                  const isOpen = expanded.has(key)
                  return h('div', { className: 'stm-item', key },
                    h('div', { className: 'stm-item-head' },
                      h('span', { className: 'stm-chip' }, report.state),
                      h('span', null, `${report.from}${report.role ? `（${report.role}）` : ''}`)
                    ),
                    h('div', { className: 'stm-item-subject' }, report.subject),
                    h('div', {
                      className: `stm-item-body${isOpen ? ' stm-item-body-open' : ''}`,
                      style: { cursor: 'pointer' },
                      onClick: () => setExpanded(previous => {
                        const next = new Set(previous)
                        if (next.has(key)) next.delete(key)
                        else next.add(key)
                        return next
                      })
                    }, report.body),
                    report.sessionId !== undefined && report.sessionId !== ''
                      ? h(Button, { ghost: true, onClick: () => onReply(report.sessionId, report.subject) }, t('reply'))
                      : null
                  )
                }))
              : tab === 'notices'
                ? (notices.length === 0
                  ? h('div', { className: 'stm-empty' }, t('noNotices'))
                  : notices.slice().reverse().slice(0, 10).map((notice, index) => h('div', { className: 'stm-item', key: index },
                    h('div', { className: 'stm-item-head' },
                      h('span', { className: 'stm-chip' }, notice.delivered ? t('delivered') : t('queued')),
                      h('span', null, notice.createdAt === undefined ? '' : new Date(notice.createdAt).toLocaleTimeString('zh-CN', { hour12: false }))
                    ),
                    h('div', { className: 'stm-item-body stm-item-body-open' }, notice.text)
                  )))
                : h(DispatchBox, { state, onNotice })
        )
      )
    }

    function TeamDetail({ state, onBack, onNotice }) {
      const [addOpen, setAddOpen] = useState(false)
      const [agentOpen, setAgentOpen] = useState(false)
      const [busy, setBusy] = useState(false)
      const [draft, setDraft] = useState('')
      const [selectedId, setSelectedId] = useState('')
      const [panelOpen, setPanelOpen] = useState(() => {
        try { return window.localStorage.getItem('session-team:panel') !== '0' } catch { return true }
      })
      const team = state?.team

      const effectiveId = team === undefined || team === null
        ? ''
        : team.members.some(member => member.sessionId === selectedId)
          ? selectedId
          : (team.lead !== '' ? team.lead : (team.members[0]?.sessionId ?? ''))

      useEffect(() => {
        if (team === undefined || team === null) return
        try {
          const stored = window.localStorage.getItem(`session-team:role:${team.id}`)
          if (stored !== null && stored !== '' && team.members.some(member => member.sessionId === stored)) {
            setSelectedId(stored)
          }
        } catch { /* 忽略 */ }
      }, [team?.id])

      useEffect(() => {
        if (team === undefined || team === null || effectiveId === '') return
        try { window.localStorage.setItem(`session-team:role:${team.id}`, effectiveId) } catch { /* 忽略 */ }
      }, [effectiveId])

      useEffect(() => {
        try { window.localStorage.setItem('session-team:panel', panelOpen ? '1' : '0') } catch { /* 忽略 */ }
      }, [panelOpen])

      if (!team) {
        return h('div', { className: 'stm-page' },
          h('div', { className: 'stm-wrap' },
            h('div', { className: 'stm-actions' }, h(Button, { onClick: onBack }, t('back'))),
            h('div', { className: 'stm-card' }, h('div', { className: 'stm-empty' }, t('noTeams')))
          )
        )
      }

      const leadMember = team.members.find(member => member.lead)

      function run(body, success) {
        setBusy(true)
        act(withTeam(state, body)).then(result => {
          setBusy(false)
          if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
          else if (success) onNotice(success)
        })
      }

      return h('div', { className: 'stm-page stm-workbench' },
        h('div', { className: 'stm-wrap' },
          h('div', { className: 'stm-topbar' },
            h('div', { className: 'stm-topbar-left' },
              h('h1', { className: 'stm-topbar-title' }, team.name),
              h('div', { className: 'stm-topbar-meta' },
                h('span', { title: t('tipMembers') }, `${t('members')} ${team.members.length}`),
                h('span', { title: t('tipOpenTasks') }, `${t('openTasks')} ${team.openTasks}`),
                h('span', { title: t('tipPending') }, `${t('pending')} ${team.pendingReports}`),
                team.pendingNotices > 0
                  ? h('span', { title: t('tipNotices') }, `${t('noticesPending')} ${team.pendingNotices}`)
                  : null,
                leadMember ? h('span', { title: t('tipLead') }, `${t('lead')}: ${leadMember.name}`) : null
              )
            ),
            h('div', { className: 'stm-topbar-actions' },
              h(Button, { ghost: true, onClick: onBack, title: t('tipBack') }, t('back')),
              h(MenuButton, {
                title: t('menuMore'),
                items: [
                  { label: t('refresh'), onClick: () => refresh() },
                  { label: t('flush'), onClick: () => run({ kind: 'flush' }, `${t('done')}: ${t('flush')}`) },
                  { label: t('briefing'), onClick: () => run({ kind: 'brief-lead' }, `${t('done')}: ${t('briefing')}`) },
                  {
                    label: t('groupWorkspace'),
                    onClick: () => {
                      setBusy(true)
                      act(withTeam(state, { kind: 'attach-workspace' })).then(result => {
                        setBusy(false)
                        if (result.ok === false) {
                          onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
                          return
                        }
                        onNotice(result.attached > 0 ? t('groupedDone', { n: result.attached }) : t('groupedNone'))
                      })
                    }
                  },
                  { label: t('addMember'), onClick: () => setAddOpen(true) },
                  {
                    label: t('deleteTeam'),
                    danger: true,
                    onClick: () => {
                      if (typeof window.confirm === 'function' && !window.confirm(t('deleteConfirm'))) return
                      setBusy(true)
                      act({ kind: 'delete-team', teamId: team.id }).then(result => {
                        setBusy(false)
                        if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
                        else onBack()
                      })
                    }
                  }
                ]
              })
            )
          ),
          h('div', { className: 'stm-work' },
            h(MemberRail, {
              state,
              selectedId: effectiveId,
              onSelect: id => setSelectedId(id),
              onAdd: () => setAgentOpen(!agentOpen),
              adding: agentOpen
            }),
            h(ConversationPane, {
              state,
              sessionId: effectiveId,
              draft,
              onDraft: setDraft,
              onNotice,
              openSession
            }),
            h(SidePanel, {
              state,
              onNotice,
              open: panelOpen,
              onToggle: () => setPanelOpen(!panelOpen),
              openSession,
              onReply: (id, subject) => {
                setSelectedId(id)
                setDraft(`关于「${subject}」：`)
              }
            })
          ),
          agentOpen
            ? h('div', { className: 'stm-modal' },
              h('div', { className: 'stm-modal-body' },
                h('div', { className: 'stm-inline', style: { justifyContent: 'space-between' } },
                  h('h3', { className: 'stm-section-title', style: { margin: 0 } }, t('addAgentTitle')),
                  h(Button, { ghost: true, onClick: () => setAgentOpen(false) }, t('cancel'))
                ),
                h(AddAgentRows, { state, onNotice, onDone: () => setAgentOpen(false) })
              )
            )
            : null,
          addOpen
            ? h('div', { className: 'stm-modal' },
              h('div', { className: 'stm-modal-body' },
                h('div', { className: 'stm-inline', style: { justifyContent: 'space-between' } },
                  h('h3', { className: 'stm-section-title', style: { margin: 0 } }, t('addMember')),
                  h(Button, { ghost: true, onClick: () => setAddOpen(false) }, t('cancel'))
                ),
                h(AddMembers, { state, onNotice })
              )
            )
            : null
        )
      )
    }

    function TeamPanel() {
      const snapshot = useStore()
      usePolling()
      const state = snapshot.state
      const [view, setView] = useState(() => {
        try {
          const stored = window.localStorage.getItem(VIEW_KEY)
          if (stored === 'list' || stored === 'detail') return stored
        } catch { /* 忽略 */ }
        return 'detail'
      })
      useEffect(() => {
        try { window.localStorage.setItem(VIEW_KEY, view) } catch { /* 忽略 */ }
      }, [view])
      const [creating, setCreating] = useState(false)
      const [notice, setNotice] = useState('')

      function openTeam(teamId) {
        act({ kind: 'select-team', teamId }).then(result => {
          if (!result.ok) {
            setNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
            return
          }
          setView('detail')
        })
      }

      const notices = []
      if (notice) notices.push(h('div', { key: 'notice', className: 'stm-notice' }, notice))
      if (snapshot.error) notices.push(h('div', { key: 'error', className: 'stm-notice stm-notice-error' }, `${t('failed')}: ${snapshot.error}`))

      const effectiveView = view === 'detail' && state?.team ? 'detail' : 'list'

      if (effectiveView === 'list') {
        return h('div', { className: 'stm-page' },
          h('div', { className: 'stm-wrap' },
            h('div', { className: 'stm-head' },
              h('div', null,
                h('h1', { className: 'stm-title' }, t('title')),
                h('p', { className: 'stm-sub' }, t('subtitle'))
              ),
              h('div', { className: 'stm-actions' },
                h(Button, { onClick: () => refresh() }, t('refresh')),
                h(Button, { primary: true, onClick: () => setCreating(!creating) }, t('newTeam'))
              )
            ),
            notices,
            creating ? h(CreateTeamForm, {
              state,
              onCreated: team => {
                setCreating(false)
                if (team?.id) openTeam(team.id)
              },
              onNotice: setNotice,
              onClose: () => setCreating(false)
            }) : null,
            h(TeamList, { state, onOpen: openTeam, onNotice: setNotice }),
            h('div', { className: 'stm-hint' }, `dsh-session-team v${state?.version ?? '?'}`)
          )
        )
      }

      return h(TeamDetail, {
        state,
        onNotice: setNotice,
        onBack: () => setView('list')
      })
    }

    const inject = ['slots', 'locale']

    function apply(ctx) {
      try {
        ctx.effect(() => installStyles(), 'session-team: styles')
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-team: dictionaries')
        boundT = ctx.locale.bind(NS)
        boundLocale = () => ctx.locale.getLocale()
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_KEY, order: 30, label: () => t('panelLabel'), locale: NS }, PanelIcon)
        )
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_KEY, locale: NS }, TeamPanel))
        const uiWorkspace = ctx.get('uiWorkspace')
        if (uiWorkspace && typeof uiWorkspace.openSession === 'function') {
          openSession = sessionId => uiWorkspace.openSession(sessionId)
        }
      } catch (error) {
        console.error('[dsh-session-team] client apply failed:', error)
      }
    }

    return { inject, apply }
  }
})
