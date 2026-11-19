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
      sideTrigger: '任务 {n} · 汇报 {m}',
      generating: '正在生成',
      thinking: '思考中',
      systemBlock: '系统上下文',
      me: '我',
      assistantName: '助手',
      toolCalls: '工具调用',
      copy: '复制',
      copied: '已复制',
      injectedHint: '系统提示（折叠）',
      roleSettings: '角色设置',
      roleSettingsHint: '改角色、优先级、模型与思考强度；也可以设为 Lead 或移出团队。',
      setLeadDone: '已设为 Lead',
      removeRoleDone: '已移出团队',
      saveDone: '已保存',
      removeConfirm: '确定把「{name}」移出团队？会话本身和聊天记录都会保留。',
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
      addAgentEntry: '添加角色',
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
      sideTrigger: 'Tasks {n} · Reports {m}',
      generating: 'Generating',
      thinking: 'Thinking',
      systemBlock: 'System context',
      me: 'Me',
      assistantName: 'Assistant',
      toolCalls: 'Tool calls',
      copy: 'Copy',
      copied: 'Copied',
      injectedHint: 'System note (collapsed)',
      roleSettings: 'Role settings',
      roleSettingsHint: 'Change role, priority, model and reasoning effort; set as Lead or remove from the team.',
      setLeadDone: 'Set as Lead',
      removeRoleDone: 'Removed from the team',
      saveDone: 'Saved',
      removeConfirm: 'Remove "{name}" from the team? The session and its history are kept.',
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
      addAgentEntry: 'Add role',
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
.stm-btn-primary{background:var(--stm-brand-hover);border-color:transparent;color:var(--stm-brand-ink)}
.stm-btn-primary:hover:not(:disabled){border-color:transparent;filter:brightness(1.05)}
.stm-btn-primary:disabled{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.stm-btn-ghost{height:30px;padding:0 10px;font-size:12px;background:transparent}
.stm-card{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:14px;padding:16px 18px}
.stm-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.stm-row:last-child{border-bottom:0}
.stm-row-click{cursor:pointer}
.stm-row-click:hover .stm-name{color:var(--dsw-alias-brand-primary)}
.stm-drag{cursor:grab;color:var(--dsw-alias-label-secondary);font-size:12px;letter-spacing:-1px;user-select:none;padding:0 2px}
.stm-row-drag{opacity:.5}
.stm-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-state-idle-primary)}
.stm-dot-running{background:var(--stm-success);box-shadow:0 0 0 3px var(--stm-success-weak)}
.stm-dot-input{background:var(--stm-warn);box-shadow:0 0 0 3px var(--stm-warn-weak)}
.stm-dot-idle{background:var(--stm-idle)}
.stm-dot-off{background:var(--dsw-alias-border-l2)}
.stm-dot-done{background:var(--stm-success)}
.stm-name{font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stm-chip{font-size:11px;font-weight:400;padding:2px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.stm-chip-lead{border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary)}
.stm-chip-warn{border-color:transparent;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.stm-chip-danger{border-color:transparent;background:var(--stm-danger-weak);color:var(--stm-danger)}
.stm-chip-success{border-color:transparent;background:var(--stm-success-weak);color:var(--stm-success)}
.stm-chip-info{border-color:transparent;background:var(--stm-brand-weak);color:var(--stm-brand)}
.stm-meta{font-size:12px;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.stm-grow{flex:1;min-width:0}
.stm-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);cursor:pointer;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stm-section-title{margin:0 0 10px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}
.stm-input:focus, .stm-select:focus, .stm-textarea:focus{outline:none;box-shadow:0 0 0 2px var(--stm-brand-soft)}
.stm-textarea{width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:8px;font-size:13px;padding:8px 10px;font-family:inherit}
.stm-textarea:focus{outline:none;box-shadow:0 0 0 2px var(--stm-brand-soft)}
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
.stm-tab-on{background:var(--stm-brand-weak);color:var(--stm-brand);border-color:transparent;font-weight:600}
.stm-more{margin-top:8px}
/* —— 工作台 v3 —— */
.stm-workbench{overflow:hidden!important;padding:56px 20px 18px!important;display:block;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums;
  --stm-brand:#4f6bf6;
  --stm-brand-hover:#3f59e0;
  --stm-brand-ink:#ffffff;
  --stm-success:var(--dsw-alias-state-success-primary,#16a34a);
  --stm-warn:var(--dsw-alias-state-warn-primary,#d97706);
  --stm-danger:var(--dsw-alias-state-error-primary,#dc2626);
  --stm-idle:var(--dsw-alias-state-idle-primary,#9ca3af);
  --stm-brand-weak:color-mix(in srgb,var(--stm-brand) 10%,transparent);
  --stm-brand-soft:color-mix(in srgb,var(--stm-brand) 16%,transparent);
  --stm-success-weak:color-mix(in srgb,var(--stm-success) 14%,transparent);
  --stm-warn-weak:color-mix(in srgb,var(--stm-warn) 15%,transparent);
  --stm-danger-weak:color-mix(in srgb,var(--stm-danger) 13%,transparent);
  --stm-idle-weak:color-mix(in srgb,var(--stm-idle) 16%,transparent)}
@media (prefers-color-scheme: dark) {
  .stm-workbench{--stm-brand:#7b90ff;--stm-brand-hover:#93a4ff;--stm-brand-ink:#0b0f1a}
}
.stm-workbench .stm-wrap{max-width:none!important;width:100%!important;align-self:stretch;height:100%;gap:0}
.stm-workbench .stm-body{width:100%}
.stm-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:0 2px 14px;flex-shrink:0}
.stm-topbar-left{display:flex;flex-direction:column;gap:6px;min-width:0}
.stm-topbar-title{font-size:17px;font-weight:650;letter-spacing:-.01em;color:var(--dsw-alias-label-primary);line-height:1.25;margin:0;text-wrap:balance}
.stm-topbar-meta{display:flex;gap:6px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary);align-items:center}
.stm-meta-chip{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 9px;border-radius:999px;background:var(--dsw-alias-bg-layer-2,transparent);font-variant-numeric:tabular-nums}
.stm-meta-chip::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--stm-idle);flex:none}
.stm-meta-tasks{background:var(--stm-warn-weak);color:var(--stm-warn)}
.stm-meta-tasks::before{background:var(--stm-warn)}
.stm-meta-reports{background:var(--stm-brand-weak);color:var(--stm-brand)}
.stm-meta-reports::before{background:var(--stm-brand)}
.stm-meta-notices{background:var(--stm-success-weak);color:var(--stm-success)}
.stm-meta-notices::before{background:var(--stm-success)}
.stm-meta-lead::before{background:var(--stm-brand)}
.stm-meta-num{font-variant-numeric:tabular-nums}
.stm-topbar-actions{display:flex;align-items:center;gap:4px;flex-shrink:0}
.stm-icon-btn{border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:9px;height:32px;min-width:32px;padding:0 8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition-property:background-color,color;transition-duration:120ms}
.stm-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.stm-icon-btn:active{transform:scale(.96)}
.stm-menu-wrap{position:relative}
.stm-menu{position:absolute;right:0;top:36px;z-index:90;min-width:184px;background:var(--dsw-alias-bg-layer-1);border-radius:12px;padding:5px;display:flex;flex-direction:column;gap:1px;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 10px 24px -6px rgba(0,0,0,.24),0 24px 48px -12px rgba(0,0,0,.18)}
.stm-menu-item{text-align:left;border:0;background:transparent;color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 10px;font-size:13px;cursor:pointer;transition-property:background-color;transition-duration:120ms}
.stm-menu-item:hover{background:var(--dsw-alias-bg-layer-2)}
.stm-menu-danger{color:var(--dsw-alias-label-error,#d9534f)}
.stm-body{flex:1;display:flex;gap:14px;min-height:0;position:relative}
.stm-rail{width:204px;flex:0 0 204px;display:flex;flex-direction:column;min-height:0;border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.05)}
.stm-rail-head{display:flex;align-items:center;justify-content:space-between;padding:10px 8px 6px 14px;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);flex-shrink:0}
.stm-rail-list{flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:0 6px 8px}
.stm-rail-item{display:flex;align-items:center;gap:9px;width:100%;padding:8px;border:0;border-radius:10px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;text-align:left;transition-property:background-color;transition-duration:120ms}
.stm-rail-item:hover{background:var(--dsw-alias-bg-layer-2)}
.stm-rail-item-on{background:var(--stm-brand-weak);box-shadow:inset 2px 0 0 var(--stm-brand)}
.stm-rail-item-on .stm-rail-name{font-weight:650}
.stm-rail-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.stm-rail-name{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:550;min-width:0}
.stm-rail-name>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stm-rail-sub{font-size:11px;color:var(--dsw-alias-label-secondary);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.stm-status{font-weight:600}
.stm-status-running{color:var(--stm-success)}
.stm-status-input{color:var(--stm-warn)}
.stm-status-idle{color:var(--stm-brand)}
.stm-status-off{color:var(--dsw-alias-label-secondary)}
.stm-rail-badge{flex-shrink:0;font-size:10px;font-weight:600;border-radius:999px;padding:0 6px;line-height:15px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);letter-spacing:.02em}
.stm-rail-item-on .stm-rail-badge{background:var(--stm-brand-soft);color:var(--stm-brand)}
.stm-rail-unread{background:var(--stm-brand);color:var(--stm-brand-ink);border-radius:999px;font-size:10px;font-weight:600;line-height:15px;padding:0 6px;flex-shrink:0}
.stm-main{flex:1;min-width:0;display:flex;flex-direction:column;border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.05);transition-property:margin-right;transition-duration:200ms;transition-timing-function:cubic-bezier(.2,0,0,1)}
.stm-main-aside{margin-right:0}
.stm-chat-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px 10px 18px;flex-shrink:0;border-bottom:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}
.stm-chat-head-id{flex-wrap:nowrap;overflow:hidden}
.stm-chat-head-id>strong{white-space:nowrap;flex-shrink:0}
.stm-chat-actions{margin-left:auto}
.stm-chat-id{display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:wrap}
.stm-chat-id>strong{font-size:14px;font-weight:650;letter-spacing:-.01em}
.stm-chat-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary);display:flex;gap:0;align-items:center;flex-wrap:nowrap;overflow:hidden;white-space:nowrap;font-variant-numeric:tabular-nums;min-width:0}
.stm-chat-meta>span{overflow:hidden;text-overflow:ellipsis}
.stm-chat-meta>span+span::before{content:'·';margin:0 7px;opacity:.5}
.stm-chat-actions{display:flex;align-items:center;gap:2px;flex-shrink:0}
.stm-ghost-btn{border:0;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:9px;height:32px;padding:0 10px;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition-property:background-color,color;transition-duration:120ms}
.stm-ghost-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.stm-ghost-btn:active{transform:scale(.96)}
.stm-chat-body{flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:24px 0 8px}
.stm-thread{max-width:min(780px,100%);margin:0 auto;padding:0 32px;display:flex;flex-direction:column;gap:18px}
.stm-turn{display:flex;flex-direction:column;gap:8px;max-width:100%;padding:12px 14px;border-radius:14px;background:rgba(0,0,0,.025);background:color-mix(in srgb,var(--dsw-alias-label-primary) 3.5%,var(--dsw-alias-bg-base))}
.stm-chat-head{background:rgba(0,0,0,.015);background:color-mix(in srgb,var(--dsw-alias-label-primary) 2.5%,var(--dsw-alias-bg-layer-1))}
.stm-compose-wrap{background:rgba(0,0,0,.015);background:color-mix(in srgb,var(--dsw-alias-label-primary) 2.5%,var(--dsw-alias-bg-layer-1))}
.stm-turn-head{display:flex;align-items:center;gap:8px}
.stm-avatar{width:22px;height:22px;border-radius:7px;display:inline-flex;align-items:center;justify-content:center;background:var(--stm-brand);color:var(--stm-brand-ink);font-size:10px;font-weight:700;letter-spacing:.02em;flex-shrink:0}
.stm-turn-name{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary)}
.stm-turn-time{font-size:11px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.stm-turn-body{font-size:14px;line-height:1.75;color:var(--dsw-alias-label-primary);padding-left:30px}
.stm-tools{margin-left:30px}
.stm-tools>summary{cursor:pointer;font-size:11.5px;color:var(--stm-brand);list-style:none;display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:7px;background:var(--stm-brand-weak)}
.stm-tools>summary::-webkit-details-marker{display:none}
.stm-tools>summary:hover{color:var(--dsw-alias-label-primary)}
.stm-tools-body{display:flex;flex-direction:column;gap:4px;margin-top:6px}
.stm-user-row{display:flex;flex-direction:column;align-items:flex-end;gap:4px;align-self:flex-end;max-width:86%}
.stm-user-bubble{white-space:normal;background:rgba(79,107,246,.16);background:color-mix(in srgb,var(--stm-brand) 16%,var(--dsw-alias-bg-layer-1));border-radius:16px 16px 5px 16px;padding:10px 14px;font-size:14px;line-height:1.7;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--stm-brand) 34%,transparent)}
.stm-user-meta{font-size:11px;color:var(--stm-brand);font-variant-numeric:tabular-nums;opacity:.85}
.stm-sys{max-width:100%}
.stm-sys>summary{cursor:pointer;font-size:11.5px;color:var(--dsw-alias-label-secondary);list-style:none;display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:7px;border:1px dashed var(--dsw-alias-border-l2)}
.stm-sys>summary::-webkit-details-marker{display:none}
.stm-sys-body{margin-top:6px;padding:8px 12px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.7;white-space:pre-wrap;max-height:240px;overflow:auto}
.stm-msg{display:flex;flex-direction:column;gap:6px;font-size:14px;line-height:1.75;color:var(--dsw-alias-label-primary)}
.stm-msg-user{align-self:flex-end;max-width:86%;background:var(--dsw-alias-bg-layer-2,var(--dsw-alias-bg-layer-1));border-radius:14px 14px 5px 14px;padding:9px 14px;box-shadow:0 0 0 1px rgba(0,0,0,.04)}
.stm-msg-role{font-size:11px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;align-items:center;font-variant-numeric:tabular-nums}
.stm-msg-text{color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word;text-wrap:pretty}
.stm-msg-md{display:flex;flex-direction:column;gap:2px;text-wrap:pretty}
.stm-msg-system{border-left:2px solid var(--dsw-alias-border-l2);padding:1px 0 1px 12px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.7}
.stm-msg-clamp{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.stm-msg-tools{display:flex;gap:6px;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-secondary);align-items:center}
.stm-tool{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2,transparent);border-radius:7px;padding:3px 8px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;align-self:flex-start}
.stm-live{display:flex;flex-direction:column;gap:5px;padding:2px 0 2px 12px;border-left:2px solid var(--stm-success);color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.7}
.stm-live-head{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:.03em;text-transform:uppercase}
.stm-live-dot{width:6px;height:6px;border-radius:999px;background:var(--stm-success);animation:stm-pulse 1.2s ease-in-out infinite}
@keyframes stm-pulse{0%,100%{opacity:.2}50%{opacity:1}}
.stm-live-text{white-space:pre-wrap;word-break:break-word;max-height:190px;overflow:hidden;text-wrap:pretty}
.stm-compose-wrap{padding:10px 16px 12px;flex-shrink:0;border-top:1px solid var(--dsw-alias-border-l1)}
.stm-compose{max-width:min(760px,100%);margin:0 auto;display:flex;flex-direction:column;gap:8px}
.stm-compose textarea{min-height:64px;max-height:200px}
.stm-seg{position:relative;display:inline-flex;align-items:center;padding:2px;border-radius:9px;background:rgba(0,0,0,.06);background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,var(--dsw-alias-bg-layer-2,transparent));box-shadow:inset 0 1px 2px rgba(0,0,0,.14),inset 0 0 0 1px rgba(0,0,0,.03)}
.stm-seg-thumb{position:absolute;top:2px;left:2px;height:calc(100% - 4px);width:calc((100% - 4px) / var(--stm-seg-count,2));border-radius:7px;background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 1px 2px rgba(0,0,0,.16),0 0 0 1px rgba(0,0,0,.04);transform:translateX(calc(var(--stm-seg-index,0) * 100%));transition:transform 180ms cubic-bezier(.2,0,0,1)}
.stm-seg-item{position:relative;z-index:1;border:0;background:transparent;height:26px;min-width:54px;padding:0 12px;border-radius:7px;font-size:12.5px;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:color 150ms ease;white-space:nowrap}
.stm-seg-item-on{color:var(--dsw-alias-label-primary);font-weight:600}
.stm-send{border:0;border-radius:9px;background:var(--stm-brand-hover);color:var(--stm-brand-ink);font-size:13px;font-weight:600;padding:0 16px;height:32px;cursor:pointer;transition-property:opacity,transform,background-color;transition-duration:120ms}
.stm-send:hover:not(:disabled){opacity:.88}
.stm-send:active:not(:disabled){transform:scale(.96)}
.stm-send:disabled{opacity:.4;cursor:default}
.stm-interrupt{display:inline-flex;align-items:center;height:30px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--stm-danger);font-size:12.5px;font-weight:500;cursor:pointer;transition-property:background-color,transform;transition-duration:120ms}
.stm-interrupt:hover{background:var(--stm-danger-weak)}
.stm-interrupt:active{transform:scale(.96)}
.stm-interrupt:disabled{opacity:.45;cursor:default}
.stm-compose-hint{font-size:11px;color:var(--dsw-alias-label-secondary);text-wrap:pretty}
.stm-rail-gear{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;color:var(--dsw-alias-label-secondary);border-radius:9px;transition-property:background-color,color;transition-duration:120ms}
.stm-rail-gear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2))}
.stm-chip-btn{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;font-size:12.5px;font-weight:500;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2,transparent);cursor:pointer;transition-property:background-color,transform;transition-duration:120ms}
.stm-chip-btn:hover{background:var(--dsw-alias-bg-layer-3,var(--dsw-alias-bg-layer-2))}
.stm-chip-btn:active{transform:scale(.96)}
.stm-chip-btn-icon{display:inline-flex;align-items:center;line-height:1}
.stm-modal-backdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.28);backdrop-filter:blur(2px);animation:stm-fade-in 140ms ease-out}
@keyframes stm-fade-in{from{opacity:0}to{opacity:1}}
.stm-modal-card{width:600px;max-width:92vw;max-height:86vh;overflow:auto;background:var(--dsw-alias-bg-layer-1);border-radius:16px;padding:18px 20px;display:flex;flex-direction:column;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 12px 32px -8px rgba(0,0,0,.28),0 32px 64px -16px rgba(0,0,0,.24)}
.stm-drawer.stm-drawer-out{animation:stm-slide-out 200ms cubic-bezier(.2,0,0,1) forwards}
@keyframes stm-slide-out{from{transform:translateX(0)}to{transform:translateX(100%)}}
.stm-drawer-backdrop{position:absolute;inset:0;z-index:35;background:transparent}
.stm-drawer{position:absolute;top:0;right:0;bottom:0;width:400px;max-width:92%;z-index:40;display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1);border-radius:14px 0 0 14px;overflow:hidden;animation:stm-slide-in 200ms cubic-bezier(.2,0,0,1);box-shadow:0 0 0 1px rgba(0,0,0,.06),-8px 0 24px -8px rgba(0,0,0,.2),-24px 0 56px -16px rgba(0,0,0,.16)}
.stm-drawer-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 8px 10px 16px;flex-shrink:0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.stm-drawer-title{font-size:12px;font-weight:650;letter-spacing:.03em;text-transform:uppercase;color:var(--dsw-alias-label-secondary)}
.stm-drawer-tabs{display:flex;gap:2px;flex-wrap:wrap;padding:8px 10px;flex-shrink:0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.stm-drawer-body{flex:1;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;padding:12px;display:flex;flex-direction:column;gap:9px}
.stm-item{background:var(--dsw-alias-bg-layer-2,transparent);border-radius:11px;padding:11px 12px;display:flex;flex-direction:column;gap:6px;font-size:12.5px;box-shadow:inset 3px 0 0 var(--stm-brand),0 0 0 1px rgba(0,0,0,.03)}
.stm-item-warn{box-shadow:inset 3px 0 0 var(--stm-warn),0 0 0 1px rgba(0,0,0,.03)}
.stm-item-ok{box-shadow:inset 3px 0 0 var(--stm-success),0 0 0 1px rgba(0,0,0,.03)}
.stm-item-head{display:flex;align-items:center;gap:7px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:11px;font-variant-numeric:tabular-nums}
.stm-item-subject{font-weight:600;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;text-wrap:pretty}
.stm-item-body{color:var(--dsw-alias-label-secondary);line-height:1.7;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;text-wrap:pretty}
.stm-item-body-open{-webkit-line-clamp:initial}
.stm-item-body.md-body{display:block;max-height:96px;overflow:hidden;-webkit-line-clamp:unset}
.stm-item-body.md-body.stm-item-body-open{max-height:none}
.md-body .md-p{margin:0 0 6px}
.md-body .md-p:last-child{margin-bottom:0}
.md-p{margin:0}
.md-h1,.md-h2,.md-h3,.md-h4{margin:14px 0 6px;font-weight:650;color:var(--dsw-alias-label-primary);line-height:1.4}
.md-h1{font-size:18px}
.md-h2{font-size:16px}
.md-h3{font-size:15px}
.md-h4{font-size:14px}
.md-list{margin:6px 0;padding-left:22px}
.md-list li{margin:2px 0}
.md-code-block{margin:10px 0;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,var(--dsw-alias-bg-layer-1));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);overflow:hidden}
.md-code-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 8px 4px 12px;border-bottom:1px solid color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
.md-code-lang{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);font-weight:600}
.md-code-copy{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11.5px;padding:3px 8px;border-radius:6px;cursor:pointer;transition-property:background-color,color;transition-duration:120ms}
.md-code-copy:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.md-code{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;line-height:1.6;padding:10px 12px;overflow-x:auto;white-space:pre;margin:0}
.md-inline-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;background:var(--dsw-alias-bg-layer-2,#f4f4f4);border-radius:4px;padding:1px 5px}
.md-quote{border-left:2px solid var(--dsw-alias-border-l2);padding:2px 0 2px 12px;margin:8px 0;color:var(--dsw-alias-label-secondary)}
.md-table-wrap{overflow-x:auto;margin:8px 0;border-radius:10px;box-shadow:0 0 0 1px var(--dsw-alias-border-l1)}
.md-table-wrap .md-table{margin:0}
.md-table{border-collapse:collapse;font-size:12.5px;width:100%}
.md-table th,.md-table td{border-bottom:1px solid var(--dsw-alias-border-l1);border-right:1px solid var(--dsw-alias-border-l1);padding:6px 10px;text-align:left;vertical-align:top}
.md-table tr:last-child td{border-bottom:0}
.md-table th:last-child,.md-table td:last-child{border-right:0}
.md-table th{background:var(--dsw-alias-bg-layer-2,transparent);font-weight:600}
.md-hr{border:0;border-top:1px solid var(--dsw-alias-border-l1);margin:12px 0}
.md-tasklist{list-style:none;padding-left:2px}
.md-task,.md-task-done{display:flex;gap:8px;align-items:flex-start;margin:3px 0}
.md-checkbox{width:14px;height:14px;border-radius:4px;box-shadow:inset 0 0 0 1.5px var(--dsw-alias-border-l2);display:inline-flex;align-items:center;justify-content:center;font-size:10px;line-height:1;flex-shrink:0;margin-top:4px;color:var(--dsw-alias-label-primary)}
.md-task-done{color:var(--dsw-alias-label-secondary);text-decoration:line-through}
.md-task-done .md-checkbox{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base);box-shadow:none}
.md-bold{font-weight:650}
.md-em{font-style:italic}
.md-link{color:var(--stm-brand,var(--dsw-alias-brand-primary));text-decoration:underline;text-underline-offset:2px}
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

    // ---- 图标（内联 SVG，不使用 emoji） ----
    function Icon({ name, size }) {
      const common = {
        width: size ?? 16,
        height: size ?? 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
      }
      if (name === 'sliders') {
        return h('svg', common,
          h('path', { d: 'M2.5 4.5h4M9.5 4.5h4M2.5 11.5h6M11.5 11.5h2' }),
          h('circle', { cx: 8, cy: 4.5, r: 1.5 }),
          h('circle', { cx: 10, cy: 11.5, r: 1.5 })
        )
      }
      if (name === 'more') {
        return h('svg', common,
          h('circle', { cx: 3.5, cy: 8, r: 1, fill: 'currentColor', stroke: 'none' }),
          h('circle', { cx: 8, cy: 8, r: 1, fill: 'currentColor', stroke: 'none' }),
          h('circle', { cx: 12.5, cy: 8, r: 1, fill: 'currentColor', stroke: 'none' })
        )
      }
      if (name === 'plus') {
        return h('svg', common, h('path', { d: 'M8 3v10M3 8h10' }))
      }
      if (name === 'close') {
        return h('svg', common, h('path', { d: 'M4 4l8 8M12 4l-8 8' }))
      }
      if (name === 'chevron-left') {
        return h('svg', common, h('path', { d: 'M10 3.5L5.5 8l4.5 4.5' }))
      }
      if (name === 'chevron-right') {
        return h('svg', common, h('path', { d: 'M6 3.5L10.5 8 6 12.5' }))
      }
      if (name === 'refresh') {
        return h('svg', common,
          h('path', { d: 'M13 8a5 5 0 1 1-1.6-3.7' }),
          h('path', { d: 'M13 3v3h-3' })
        )
      }
      return null
    }

    /** 渲染兜底：任何组件抛错都显示错误卡片，而不是整页白屏。 */
    class PanelBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { error: null }
      }

      static getDerivedStateFromError(error) {
        return { error }
      }

      componentDidCatch(error, info) {
        try {
          console.error('[dsh-session-team] render failed:', error, info)
        } catch { /* 忽略 */ }
        try {
          actRaw({
            kind: 'client-error',
            message: String(error?.message ?? error),
            stack: String(error?.stack ?? ''),
            componentStack: String(info?.componentStack ?? '')
          })
        } catch { /* 忽略 */ }
      }

      render() {
        if (this.state.error !== null) {
          const detail = String(this.state.error?.stack ?? this.state.error)
          return h('div', { className: 'stm-page' },
            h('div', { className: 'stm-wrap' },
              h('div', { className: 'stm-card' },
                h('h3', { className: 'stm-section-title' }, '界面渲染出错'),
                h('div', { className: 'stm-hint' }, '把下面的信息发给开发者即可定位；点「重新加载」可恢复。'),
                h('pre', {
                  className: 'stm-notice stm-notice-error',
                  style: { whiteSpace: 'pre-wrap', maxHeight: '360px', overflow: 'auto', marginTop: '8px' }
                }, detail),
                h('div', { className: 'stm-actions', style: { marginTop: '10px' } },
                  h(Button, { onClick: () => { if (typeof location !== 'undefined') location.reload() } }, '重新加载')
                )
              )
            )
          )
        }
        return this.props.children ?? null
      }
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

    /** 角色设置弹窗：改角色、优先级、模型、思考强度，设为 Lead 或移出团队。 */
    function RoleSettings({ state, member, onNotice, onClose }) {
      const models = state?.models
      const options = modelOptions(models)
      const current = member.model
      const fallback = models?.default
      const initialKey = current
        ? `${current.provider}\u0001${current.model}`
        : fallback ? `${fallback.provider}\u0001${fallback.model}` : ''
      const [role, setRole] = useState(member.role)
      const [stage, setStage] = useState(String(member.stage))
      const [modelKey, setModelKey] = useState(initialKey)
      const [effort, setEffort] = useState(current?.reasoningEffort ?? '')
      const [busy, setBusy] = useState('')
      const selectedOption = options.find(option => option.key === modelKey) ?? null
      const effortOptions = selectedOption?.efforts ?? []
      const dirtyModel = current === null
        || `${current.provider}\u0001${current.model}` !== modelKey
        || (current.reasoningEffort ?? '') !== effort
      const status = statusOf(member)

      function save() {
        const rosterChanged = role !== member.role || String(stage) !== String(member.stage)
        const tasks = []
        if (rosterChanged) {
          tasks.push(act(withTeam(state, {
            kind: 'update-member',
            sessionId: member.sessionId,
            role,
            stage: Number.isFinite(Number(stage)) ? Number(stage) : member.stage
          })))
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
        if (tasks.length === 0) {
          onClose()
          return
        }
        setBusy('save')
        Promise.all(tasks).then(results => {
          setBusy('')
          const failed = results.find(result => !result.ok)
          if (failed) {
            onNotice(`${t('failed')}: ${failed.error?.message ?? failed.error}`)
            return
          }
          onNotice(dirtyModel ? t('modelSaved', {
            name: member.name,
            label: `${selectedOption.name}${effort ? ` · ${effort}` : ''}`
          }) : t('saveDone'))
          onClose()
        })
      }

      function setLead() {
        setBusy('lead')
        act(withTeam(state, { kind: 'set-lead', sessionId: member.sessionId })).then(result => {
          setBusy('')
          if (result.ok === false) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
          else onNotice(t('setLeadDone'))
          onClose()
        })
      }

      function remove() {
        if (typeof window.confirm === 'function' && !window.confirm(t('removeConfirm', { name: member.name }))) return
        setBusy('remove')
        act(withTeam(state, { kind: 'remove-member', sessionId: member.sessionId })).then(result => {
          setBusy('')
          if (result.ok === false) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
          else onNotice(t('removeRoleDone'))
          onClose()
        })
      }

      return h('div', { className: 'stm-modal-backdrop', onClick: onClose },
        h('div', { className: 'stm-modal-card', onClick: event => event.stopPropagation() },
          h('div', { className: 'stm-inline', style: { justifyContent: 'space-between', alignItems: 'flex-start' } },
            h('div', null,
              h('h3', { className: 'stm-section-title', style: { margin: 0 } }, `${member.name} · ${t('roleSettings')}`),
              h('div', { className: 'stm-hint', style: { marginTop: '4px' } }, t('roleSettingsHint'))
            ),
            h('button', { className: 'stm-icon-btn', onClick: onClose, title: t('cancel') }, h(Icon, { name: 'close' }))
          ),
          h('div', { className: 'stm-inline', style: { marginTop: '12px', gap: '8px' } },
            h('span', { className: `stm-dot stm-dot-${status.kind}` }),
            h('span', { className: 'stm-chip' }, status.label),
            h('span', { className: 'stm-chip', title: member.sessionId }, member.sessionId)
          ),
          h('div', { className: 'stm-inline', style: { marginTop: '12px', gap: '10px', flexWrap: 'wrap' } },
            h('label', { className: 'stm-field', style: { width: '160px' } }, t('roleLabel'),
              h('input', {
                className: 'stm-input',
                value: role,
                placeholder: t('rolePlaceholder'),
                onChange: event => setRole(event.target.value)
              })
            ),
            h('label', { className: 'stm-field', style: { width: '110px' } }, t('stage'),
              h('input', {
                className: 'stm-input',
                value: stage,
                type: 'number',
                title: t('priorityHint'),
                onChange: event => setStage(event.target.value)
              })
            )
          ),
          h('div', { className: 'stm-inline', style: { marginTop: '10px', gap: '10px', flexWrap: 'wrap' } },
            h('label', { className: 'stm-field', style: { flex: '1', minWidth: '220px' } }, t('model'),
              options.length === 0
                ? h('select', { className: 'stm-select', value: '', disabled: true },
                  h('option', { value: '', key: '' }, t('noModelCatalog')))
                : h('select', {
                  className: 'stm-select',
                  value: modelKey,
                  onChange: event => {
                    const key = event.target.value
                    setModelKey(key)
                    const option = options.find(candidate => candidate.key === key) ?? null
                    setEffort(option?.defaultEffort ?? '')
                  }
                }, options.map(option => h('option', { value: option.key, key: option.key },
                  `${option.providerName} · ${option.name}`)))
            ),
            effortOptions.length === 0
              ? null
              : h('label', { className: 'stm-field', style: { width: '140px' } }, t('effort'),
                h('select', {
                  className: 'stm-select',
                  value: effort,
                  onChange: event => setEffort(event.target.value)
                },
                h('option', { value: '', key: '' }, t('effortDefault')),
                effortOptions.map(item => h('option', { value: item.id, key: item.id }, item.name)))
              )
          ),
          h('div', { className: 'stm-inline', style: { marginTop: '16px', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' } },
            h('div', { className: 'stm-inline', style: { gap: '6px' } },
              member.lead
                ? h('span', { className: 'stm-chip stm-chip-lead' }, t('lead'))
                : h(Button, { ghost: true, onClick: setLead, disabled: busy !== '' }, t('setLead')),
              h(Button, { ghost: true, onClick: remove, disabled: busy !== '' }, t('remove'))
            ),
            h('div', { className: 'stm-inline', style: { gap: '6px' } },
              h(Button, { ghost: true, onClick: onClose }, t('cancel')),
              h(Button, { primary: true, onClick: save, disabled: busy !== '' }, busy === 'save' ? '…' : t('save'))
            )
          )
        )
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

      return h('div', { className: `stm-drawer${closing === true ? ' stm-drawer-out' : ''}` },
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

    /** 分段开关：内凹轨道 + 可滑动的选中块。 */
    function Segmented({ value, options, onChange }) {
      const index = Math.max(0, options.findIndex(option => option.id === value))
      return h('div', {
        className: 'stm-seg',
        style: { '--stm-seg-count': options.length, '--stm-seg-index': index }
      },
        h('span', { className: 'stm-seg-thumb' }),
        options.map(option => h('button', {
          key: option.id,
          className: `stm-seg-item${option.id === value ? ' stm-seg-item-on' : ''}`,
          onClick: () => onChange(option.id)
        }, option.label))
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
                      h('span', { className: `stm-chip${report.delivered ? '' : ' stm-chip-info'}` }, report.state),
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

    /** 小菜单：次要操作收进「更多」菜单。 */
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
        h('button', { className: 'stm-icon-btn', title, onClick: () => setOpen(!open) }, h(Icon, { name: 'more' })),
        open
          ? h('div', { className: 'stm-menu' }, visible.map(item => h('button', {
            key: item.label,
            className: `stm-menu-item${item.danger === true ? ' stm-menu-danger' : ''}`,
            onClick: () => { setOpen(false); item.onClick() }
          }, item.label)))
          : null
      )
    }

    /** 左侧角色栏：一行一个角色，点一下切换对话。 */
    function MemberRail({ state, selectedId, onSelect, onAdd, adding, onSettings }) {
      const members = state?.team?.members ?? []
      return h('div', { className: 'stm-rail' },
        h('div', { className: 'stm-rail-head' },
          h('span', null, `${t('railTitle')} ${members.length}`),
          h(Button, { ghost: true, onClick: onAdd, title: t('addAgentEntry') }, adding ? t('cancel') : h(Icon, { name: 'plus' }))
        ),
        h('div', { className: 'stm-rail-list' },
          members.map(member => {
            const status = statusOf(member)
            const parts = []
            if (member.role) parts.push(member.role)
            parts.push(`P${member.stage}`)
            return h('button', {
              key: member.sessionId,
              className: `stm-rail-item${member.sessionId === selectedId ? ' stm-rail-item-on' : ''}`,
              onClick: () => onSelect(member.sessionId)
            },
              h('span', { className: `stm-dot stm-dot-${status.kind}` }),
              h('div', { className: 'stm-rail-main' },
                h('div', { className: 'stm-rail-name' },
                  h('span', null, member.name),
                  member.lead ? h('span', { className: 'stm-rail-badge' }, t('lead')) : null
                ),
                h('div', { className: 'stm-rail-sub' },
                  h('span', { className: `stm-status stm-status-${status.kind}` }, status.label),
                  parts.length === 0 ? null : h('span', null, ` · ${parts.join(' · ')}`)
                )
              ),
              member.unread > 0 ? h('span', { className: 'stm-rail-unread' }, `${member.unread}`) : null,
              h('span', {
                className: 'stm-rail-gear',
                title: t('roleSettings'),
                role: 'button',
                'aria-label': t('roleSettings'),
                onClick: event => {
                  event.stopPropagation()
                  if (typeof onSettings === 'function') onSettings(member.sessionId)
                }
              }, h(Icon, { name: 'sliders' }))
            )
          })
        )
      )
    }

    /** 去掉 Markdown 标记，用于标题等短文本。 */
    function mdToPlain(text) {
      return String(text ?? '')
        .replace(/[#*`>|~_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    /** 行内 Markdown：**粗**、*斜*、`代码`、[链接](url)。 */
    function renderInline(text, keyPrefix) {
      const nodes = []
      const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|~~[^~]+~~|\*[^*]+\*)/g
      let last = 0
      let index = 0
      for (const match of String(text).matchAll(pattern)) {
        const token = match[0]
        const at = match.index ?? 0
        if (at > last) nodes.push(String(text).slice(last, at))
        last = at + token.length
        const key = `${keyPrefix}-i${index}`
        index += 1
        if (token.startsWith('**') && token.endsWith('**')) {
          nodes.push(h('strong', { key, className: 'md-bold' }, token.slice(2, -2)))
        } else if (token.startsWith('`') && token.endsWith('`')) {
          nodes.push(h('code', { key, className: 'md-inline-code' }, token.slice(1, -1)))
        } else if (token.startsWith('~~') && token.endsWith('~~')) {
          nodes.push(h('s', { key }, token.slice(2, -2)))
        } else if (token.startsWith('[')) {
          const parts = token.slice(1, -1).split('](')
          nodes.push(h('a', { key, className: 'md-link', href: parts[1], target: '_blank', rel: 'noreferrer' }, parts[0]))
        } else if (token.startsWith('*') && token.length > 2) {
          nodes.push(h('em', { key, className: 'md-em' }, token.slice(1, -1)))
        } else {
          nodes.push(token)
        }
      }
      if (last < String(text).length) nodes.push(String(text).slice(last))
      return nodes
    }

    /** 代码块：独立底色 + 语言标签 + 一键复制。 */
    function MdCode({ code, lang }) {
      const [copied, setCopied] = useState(false)
      function copy() {
        const text = String(code ?? '')
        const done = () => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }
        try {
          if (navigator?.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => {
              const area = window.document.createElement('textarea')
              area.value = text
              window.document.body.appendChild(area)
              area.select()
              try { window.document.execCommand('copy') } catch { /* 忽略 */ }
              window.document.body.removeChild(area)
              done()
            })
            return
          }
        } catch { /* 忽略 */ }
        done()
      }
      return h('div', { className: 'md-code-block' },
        h('div', { className: 'md-code-head' },
          h('span', { className: 'md-code-lang' }, lang === '' ? 'code' : lang),
          h('button', { className: 'md-code-copy', onClick: copy }, copied ? t('copied') : t('copy'))
        ),
        h('pre', { className: 'md-code' }, String(code ?? ''))
      )
    }

    /** 极简 Markdown 渲染：标题、列表、代码块、表格、引用、分隔线、行内样式。 */
    function renderMarkdown(text) {
      const lines = String(text ?? '').split('\n')
      const blocks = []
      let i = 0
      let key = 0
      const nextKey = () => `md-${key++}`

      function isTableRow(line) {
        return /^\s*\|.*\|\s*$/.test(line)
      }
      function isTableSep(line) {
        return /^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(line)
      }
      function splitRow(line) {
        return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
      }
      function isBlockStart(line) {
        return /^(#{1,4})\s|^\s*```|^\s*>|^\s*([-*])\s|^\s*\d+\.\s/.test(line)
          || isTableRow(line)
          || /^(---|\*\*\*|___)$/.test(line.trim())
      }

      while (i < lines.length) {
        const line = lines[i]
        if (line.trim() === '') { i += 1; continue }
        if (/^\s*```/.test(line)) {
          const lang = line.trim().slice(3).trim()
          i += 1
          const code = []
          while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i += 1 }
          i += 1
          blocks.push(h(MdCode, { key: nextKey(), code: code.join('\n'), lang }))
          continue
        }
        if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
          const header = splitRow(line)
          i += 2
          const rows = []
          while (i < lines.length && isTableRow(lines[i])) { rows.push(splitRow(lines[i])); i += 1 }
          const headCells = header.map((cell, ci) => h('th', { key: ci }, renderInline(cell, `th${ci}`)))
          const bodyRows = rows.map((row, ri) => h('tr', { key: ri },
            row.map((cell, ci) => h('td', { key: ci }, renderInline(cell, `td${ri}-${ci}`)))))
          blocks.push(h('div', { key: nextKey(), className: 'md-table-wrap' },
            h('table', { className: 'md-table' },
              h('thead', null, h('tr', null, headCells)),
              h('tbody', null, bodyRows)
            )
          ))
          continue
        }
        const heading = line.match(/^(#{1,4})\s+(.+)$/)
        if (heading !== null) {
          const level = Math.min(4, heading[1].length)
          blocks.push(h(`h${level}`, { key: nextKey(), className: `md-h${level}` }, renderInline(heading[2], `h${key}`)))
          i += 1
          continue
        }
        if (/^\s*>-?\s?/.test(line)) {
          const quote = []
          while (i < lines.length && /^\s*>/.test(lines[i])) { quote.push(lines[i].replace(/^\s*>\s?/, '')); i += 1 }
          blocks.push(h('div', { key: nextKey(), className: 'md-quote md-p' }, renderInline(quote.join('\n'), `q${key}`)))
          continue
        }
        const taskItem = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/)
        if (taskItem !== null) {
          const items = []
          while (i < lines.length) {
            const match = lines[i].match(/^\s*[-*]\s+\[([ xX])\]\s+(.+)$/)
            if (match === null) break
            items.push({ done: match[1].toLowerCase() === 'x', text: match[2] })
            i += 1
          }
          blocks.push(h('ul', { key: nextKey(), className: 'md-list md-tasklist' },
            items.map((item, ii) => h('li', { key: ii, className: item.done ? 'md-task-done' : 'md-task' },
              h('span', { className: 'md-checkbox', 'aria-hidden': true }, item.done ? '✓' : ''),
              renderInline(item.text, `task${ii}`)
            ))
          ))
          continue
        }
        const bullet = line.match(/^\s*([-*])\s+(.+)$/)
        const numbered = line.match(/^\s*(\d+)\.\s+(.+)$/)
        if (bullet !== null || numbered !== null) {
          const ordered = numbered !== null
          const items = []
          while (i < lines.length) {
            const b = lines[i].match(/^\s*([-*])\s+(.+)$/)
            const n = lines[i].match(/^\s*(\d+)\.\s+(.+)$/)
            if ((ordered && n === null) || (ordered === false && b === null)) break
            items.push((ordered ? n[2] : b[2]))
            i += 1
          }
          blocks.push(h(ordered ? 'ol' : 'ul', { key: nextKey(), className: 'md-list' },
            items.map((item, ii) => h('li', { key: ii }, renderInline(item, `li${ii}`))))
          )
          continue
        }
        if (/^(---|\*\*\*|___)$/.test(line.trim())) {
          blocks.push(h('hr', { key: nextKey(), className: 'md-hr' }))
          i += 1
          continue
        }
        const paragraph = []
        while (i < lines.length && lines[i].trim() !== '' && isBlockStart(lines[i]) === false) {
          paragraph.push(lines[i])
          i += 1
        }
        if (paragraph.length > 0) {
          blocks.push(h('p', { key: nextKey(), className: 'md-p' }, renderInline(paragraph.join('\n'), `p${key}`)))
        } else {
          i += 1
        }
      }
      return blocks
    }

    /** 把时间线切成「轮」：用户一条、助手若干条 + 工具调用。 */
    function buildTurns(messages) {
      const turns = []
      let current = null
      for (const message of messages) {
        if (message.role === 'user') {
          turns.push({
            kind: 'user',
            seq: message.seq,
            time: message.time,
            text: message.text,
            injected: message.injected === true,
            summary: message.summary ?? ''
          })
          current = null
          continue
        }
        if (message.role === 'tool') {
          if (current === null) {
            turns.push({ kind: 'tool', seq: message.seq, time: message.time, tools: [{ name: message.name, args: message.text }] })
            continue
          }
          current.tools.push({ name: message.name, args: message.text })
          continue
        }
        if (current === null) {
          current = { kind: 'assistant', seq: message.seq, time: message.time, texts: [], tools: [] }
          turns.push(current)
        }
        if (message.text !== '') current.texts.push(message.text)
        for (const name of message.tools ?? []) {
          if (!current.tools.some(item => item.name === name && item.args === '')) {
            current.tools.push({ name, args: '' })
          }
        }
      }
      return turns
    }

    /** 助手一轮：头像 + 名称 + Markdown 正文 + 可折叠工具调用。 */
    function AssistantTurn({ turn, expanded, onToggle }) {
      const text = turn.texts.join('\n\n')
      const long = text.length > 2400
      return h('div', { className: 'stm-turn' },
        h('div', { className: 'stm-turn-head' },
          h('span', { className: 'stm-avatar' }, 'AI'),
          h('span', { className: 'stm-turn-name' }, t('assistantName')),
          turn.time > 0 ? h('span', { className: 'stm-turn-time' }, new Date(turn.time).toLocaleTimeString('zh-CN', { hour12: false })) : null
        ),
        h('div', {
          className: 'stm-turn-body',
          style: long === true && expanded !== true ? { maxHeight: '520px', overflow: 'hidden' } : undefined
        }, renderMarkdown(text)),
        long
          ? h('button', { className: 'stm-tab', style: { alignSelf: 'flex-start', marginLeft: '30px' }, onClick: onToggle }, expanded ? t('collapseBody') : t('expand'))
          : null,
        turn.tools.length === 0
          ? null
          : h('details', { className: 'stm-tools' },
            h('summary', null, `${t('toolCalls')} ${turn.tools.length}`),
            h('div', { className: 'stm-tools-body' },
              turn.tools.map((tool, index) => h('div', { className: 'stm-tool', key: `${tool.name}-${index}`, title: tool.args },
                `${tool.name}${tool.args === '' ? '' : ` ${tool.args}`}`))
            )
          )
      )
    }

    /** 用户一条：右侧气泡。 */
    function UserTurn({ turn }) {
      const isSystem = turn.injected === true || turn.text.includes('<system-reminder>')
      if (isSystem === true) {
        const firstLine = turn.text.split('\n').find(line => line.trim() !== '') ?? ''
        const label = turn.summary !== '' ? turn.summary : mdToPlain(firstLine).slice(0, 60)
        return h('details', { className: 'stm-sys' },
          h('summary', null, `${t('injectedHint')}${label === '' ? '' : ` · ${label}`}`),
          h('div', { className: 'stm-sys-body' }, turn.text)
        )
      }
      return h('div', { className: 'stm-user-row' },
        h('div', { className: 'stm-user-bubble' }, renderMarkdown(turn.text)),
        h('div', { className: 'stm-user-meta' },
          `${t('me')}${turn.time > 0 ? ` · ${new Date(turn.time).toLocaleTimeString('zh-CN', { hour12: false })}` : ''}`)
      )
    }

    /** 中间对话区。 */    /** 中间对话区。 */
    function ConversationPane({ state, sessionId, draft, onDraft, onNotice, openSession, sideOpen, onToggleSide, taskCount, reportCount, onSettings }) {
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
      }, [lastSeq, live?.streamText?.length, live?.streamReasoning?.length])

      async function send(steer) {
        const text = draft.trim()
        if (text === '') return
        setBusy('send')
        const result = mode === 'dispatch'
          ? await act(withTeam(state, { kind: 'dispatch', mode: steer ? 'steer' : 'queue', tasks: [{ target: sessionId, text }] }))
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
        return h('div', { className: `stm-main${sideOpen === true ? ' stm-main-aside' : ''}` }, h('div', { className: 'stm-empty' }, t('chatEmpty')))
      }

      const running = live?.running === true || member.running === true
      const status = statusOf(member)
      const meta = []
      if (member.role) meta.push(member.role)
      meta.push(`${t('stage')} ${member.stage}`)
      if (member.model !== null && member.model !== undefined) {
        meta.push(`${member.model.model}${member.model.reasoningEffort ? ` · ${member.model.reasoningEffort}` : ''}`)
      }
      const streamText = (live?.streamText !== undefined && live.streamText !== '') ? live.streamText : ''
      const reasoningText = (live?.streamReasoning !== undefined && live.streamReasoning !== '') ? live.streamReasoning : ''

      return h('div', { className: `stm-main${sideOpen === true ? ' stm-main-aside' : ''}` },
        h('div', { className: 'stm-chat-head' },
          h('div', { className: 'stm-chat-id' },
            h('span', { className: `stm-dot stm-dot-${status.kind}` }),
            h('strong', null, member.name),
            member.lead ? h('span', { className: 'stm-rail-badge' }, t('lead')) : null,
            h('div', { className: 'stm-chat-meta' },
              meta.map(item => h('span', { key: item }, item)),
              live?.pendingInput !== undefined && live.pendingInput.length > 0
                ? h('span', { style: { color: 'var(--dsw-alias-label-error,#d9534f)' } }, t('pendingInput'))
                : null
            )
          ),
          h('div', { className: 'stm-chat-actions' },
            h('button', {
              className: 'stm-icon-btn',
              title: t('roleSettings'),
              'aria-label': t('roleSettings'),
              onClick: () => { if (typeof onSettings === 'function') onSettings(sessionId) }
            }, h(Icon, { name: 'sliders' })),
            h('button', { className: 'stm-ghost-btn', onClick: () => { if (openSession) openSession(sessionId) } }, t('drawerOpenChat')),
            h('button', {
              className: 'stm-ghost-btn',
              'data-stm-side-toggle': '1',
              onClick: onToggleSide,
              title: t('panelExpand')
            }, t('sideTrigger', { n: taskCount, m: reportCount }), h(Icon, { name: sideOpen ? 'chevron-right' : 'chevron-left' })),
            h(MenuButton, {
              title: t('chatMenu'),
              items: [
                { label: t('chatRefresh'), onClick: () => loadTranscript() },
                { label: t('sessionRename'), onClick: () => renameSession(member.name) },
                { label: t('dispatchAll'), onClick: dispatchAll },
                { label: t('sessionArchive'), onClick: archiveSession }
              ]
            })
          )
        ),
        h('div', { className: 'stm-chat-body', ref: scrollRef },
          h('div', { className: 'stm-thread' },
            error === '' ? null : h('div', { className: 'stm-notice stm-notice-error' }, `${t('failed')}: ${error}`),
            transcript === null
              ? h('div', { className: 'stm-empty' }, loading ? t('drawerLoading') : t('chatEmpty'))
              : transcript.messages.length === 0
                ? h('div', { className: 'stm-empty' }, t('chatEmpty'))
                : buildTurns(transcript.messages).map(turn => {
                  if (turn.kind === 'user') return h(UserTurn, { key: `u-${turn.seq}`, turn })
                  if (turn.kind === 'assistant') {
                    return h(AssistantTurn, {
                      key: `a-${turn.seq}`,
                      turn,
                      expanded: expanded.has(turn.seq),
                      onToggle: () => toggleMessage(turn.seq)
                    })
                  }
                  return h('details', { key: `t-${turn.seq}`, className: 'stm-tools' },
                    h('summary', null, `${t('toolCalls')} ${turn.tools.length}`),
                    h('div', { className: 'stm-tools-body' },
                      turn.tools.map((tool, index) => h('div', { className: 'stm-tool', key: index, title: tool.args }, `${tool.name} ${tool.args}`))
                    )
                  )
                }),
            running
              ? h('div', { className: 'stm-live' },
                h('div', { className: 'stm-live-head' },
                  h('span', { className: 'stm-live-dot' }),
                  h('span', null, streamText === '' && reasoningText !== '' ? t('thinking') : t('generating'))
                ),
                h('div', { className: 'stm-live-text' },
                  streamText !== '' ? streamText : (reasoningText !== '' ? reasoningText : '…')
                ),
                live?.tools !== undefined && live.tools.length > 0
                  ? h('div', { className: 'stm-msg-tools' },
                    h('span', null, `${t('liveTools')}:`),
                    live.tools.map(tool => h('span', { key: tool, className: 'stm-chip' }, tool))
                  )
                  : null
              )
              : null
          )
        ),
        h('div', { className: 'stm-compose-wrap' },
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
                h(Segmented, {
                  value: mode,
                  options: [
                    { id: 'message', label: t('modeMessage') },
                    { id: 'dispatch', label: t('dispatchTab') }
                  ],
                  onChange: setMode
                }),
                running
                  ? h('button', { className: 'stm-interrupt', onClick: interrupt, disabled: busy !== '' }, busy === 'cancel' ? '…' : t('interrupt'))
                  : null
              ),
              h('div', { className: 'stm-inline' },
                running
                  ? h(Button, { ghost: true, onClick: () => send(true), disabled: busy !== '' }, t('sendSteer'))
                  : null,
                h('button', {
                  className: 'stm-send',
                  onClick: () => send(false),
                  disabled: busy !== '' || draft.trim() === ''
                }, busy === 'send' ? '…' : t('sendQueue'))
              )
            ),
            h('div', { className: 'stm-compose-hint' }, t('composeHint'))
          )
        )
      )
    }

    /** 右侧浮层：任务 / 汇报 / 通知 / 派活。 */
    function SideDrawer({ state, onNotice, onReply, onClose, closing }) {
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

      const tabs = [
        { id: 'tasks', label: `${t('tasks')} ${openTasks.length}` },
        { id: 'reports', label: `${t('reports')} ${unread.length}` },
        { id: 'notices', label: `${t('noticeTab')} ${pendingNotices.length}` },
        { id: 'dispatch', label: t('dispatchTab') }
      ]

      return h('div', { className: `stm-drawer${closing === true ? ' stm-drawer-out' : ''}` },
        h('div', { className: 'stm-drawer-head' },
          h('div', { className: 'stm-drawer-title' }, t('panelExpand')),
          h('button', { className: 'stm-icon-btn', onClick: onClose }, t('cancel'))
        ),
        h('div', { className: 'stm-drawer-tabs' },
          tabs.map(item => h('button', {
            key: item.id,
            className: `stm-tab${tab === item.id ? ' stm-tab-on' : ''}`,
            onClick: () => setTab(item.id)
          }, item.label))
        ),
        h('div', { className: 'stm-drawer-body' },
          tab === 'tasks'
            ? (openTasks.length === 0
              ? h('div', { className: 'stm-empty' }, t('noOpenTasks'))
              : openTasks.slice().reverse().slice(0, 20).map(task => {
                const status = taskStateOf(task)
                return h('div', {
                  className: `stm-item${status.kind === 'stale' ? ' stm-item-warn' : status.kind === 'running' ? '' : ' stm-item-ok'}`,
                  key: task.id
                },
                  h('div', { className: 'stm-item-head' },
                    h('span', { className: `stm-chip${status.kind === 'stale' ? ' stm-chip-warn' : status.kind === 'running' ? ' stm-chip-info' : ' stm-chip-success'}` }, status.label),
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
                : unread.slice().reverse().slice(0, 20).map((report, index) => {
                  const key = `${report.createdAt}-${index}`
                  const isOpen = expanded.has(key)
                  return h('div', { className: 'stm-item', key },
                    h('div', { className: 'stm-item-head' },
                      h('span', { className: `stm-chip${report.delivered ? '' : ' stm-chip-info'}` }, report.state),
                      h('span', null, `${report.from}${report.role ? `（${report.role}）` : ''}`)
                    ),
                    h('div', { className: 'stm-item-subject' }, report.subject),
                    h('div', {
                      className: `stm-item-body md-body${isOpen ? ' stm-item-body-open' : ''}`,
                      style: { cursor: 'pointer' },
                      onClick: () => setExpanded(previous => {
                        const next = new Set(previous)
                        if (next.has(key)) next.delete(key)
                        else next.add(key)
                        return next
                      })
                    }, renderMarkdown(report.body)),
                    report.sessionId !== undefined && report.sessionId !== ''
                      ? h(Button, { ghost: true, onClick: () => onReply(report.sessionId, report.subject) }, t('reply'))
                      : null
                  )
                }))
              : tab === 'notices'
                ? (notices.length === 0
                  ? h('div', { className: 'stm-empty' }, t('noNotices'))
                  : notices.slice().reverse().slice(0, 12).map((notice, index) => h('div', { className: 'stm-item', key: index },
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
      const [sideOpen, setSideOpen] = useState(false)
      const [settingsId, setSettingsId] = useState('')
      const [sideClosing, setSideClosing] = useState(false)
      const sideTimer = useRef(null)
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
        const timer = setTimeout(() => {
          try {
            const page = window.document.querySelector('.stm-page.stm-workbench')
            const wrap = page === null ? null : page.querySelector('.stm-wrap')
            const rail = page === null ? null : page.querySelector('.stm-rail')
            const main = page === null ? null : page.querySelector('.stm-main')
            actRaw({
              kind: 'layout',
              metrics: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                dpr: window.devicePixelRatio,
                page: page === null ? 0 : Math.round(page.getBoundingClientRect().width),
                wrap: wrap === null ? 0 : Math.round(wrap.getBoundingClientRect().width),
                rail: rail === null ? 0 : Math.round(rail.getBoundingClientRect().width),
                main: main === null ? 0 : Math.round(main.getBoundingClientRect().width)
              }
            })
          } catch { /* 忽略 */ }
        }, 900)
        return () => clearTimeout(timer)
      }, [])

      useEffect(() => {
        if (sideOpen !== true) return undefined
        function onPointerDown(event) {
          if (sideClosing === true) return
          const target = event.target
          if (!(target instanceof Element)) return
          if (target.closest('.stm-drawer')) return
          if (target.closest('[data-stm-side-toggle]')) return
          closeSide()
        }
        document.addEventListener('mousedown', onPointerDown, true)
        return () => document.removeEventListener('mousedown', onPointerDown, true)
      }, [sideOpen, sideClosing])

      function closeSide() {
        setSideClosing(true)
        if (sideTimer.current !== null) clearTimeout(sideTimer.current)
        sideTimer.current = setTimeout(() => {
          setSideClosing(false)
          setSideOpen(false)
        }, 160)
      }

      function openSide() {
        if (sideTimer.current !== null) {
          clearTimeout(sideTimer.current)
          sideTimer.current = null
        }
        setSideClosing(false)
        setSideOpen(true)
      }

      if (!team) {
        return h('div', { className: 'stm-page' },
          h('div', { className: 'stm-wrap' },
            h('div', { className: 'stm-actions' }, h(Button, { onClick: onBack }, t('back'))),
            h('div', { className: 'stm-card' }, h('div', { className: 'stm-empty' }, t('noTeams')))
          )
        )
      }

      const leadMember = team.members.find(member => member.lead)
      const openTaskCount = Number(team.openTasks ?? 0)
      const unreadCount = Number(team.pendingReports ?? 0)

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
                h('span', { className: 'stm-meta-chip' }, `${t('members')} ${team.members.length}`),
                h('span', { className: 'stm-meta-chip stm-meta-tasks' }, `${t('openTasks')} ${openTaskCount}`),
                h('span', { className: 'stm-meta-chip stm-meta-reports' }, `${t('pending')} ${unreadCount}`),
                Number(team.pendingNotices ?? 0) > 0
                  ? h('span', { className: 'stm-meta-chip stm-meta-notices' }, `${t('noticesPending')} ${team.pendingNotices}`)
                  : null,
                leadMember ? h('span', { className: 'stm-meta-chip stm-meta-lead' }, `${t('lead')}: ${leadMember.name}`) : null
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
          h('div', { className: 'stm-body' },
            h(MemberRail, {
              state,
              selectedId: effectiveId,
              onSelect: id => setSelectedId(id),
              onAdd: () => setAgentOpen(!agentOpen),
              adding: agentOpen,
              onSettings: id => setSettingsId(id)
            }),
            h(ConversationPane, {
              state,
              sessionId: effectiveId,
              draft,
              onDraft: setDraft,
              onNotice,
              openSession,
              sideOpen: sideOpen || sideClosing,
              onToggleSide: () => { if (sideOpen) closeSide(); else openSide() },
              taskCount: openTaskCount,
              reportCount: unreadCount,
              onSettings: id => setSettingsId(id)
            }),
            sideOpen || sideClosing
              ? h(SideDrawer, {
                state,
                closing: sideClosing,
                onNotice,
                onClose: closeSide,
                onReply: (id, subject) => {
                  setSelectedId(id)
                  setDraft(`关于「${subject}」：`)
                  closeSide()
                }
              })
              : null
          ),
          settingsId === ''
            ? null
            : (() => {
              const target = team.members.find(member => member.sessionId === settingsId)
              return target === undefined
                ? null
                : h(RoleSettings, {
                  state,
                  member: target,
                  onNotice,
                  onClose: () => setSettingsId('')
                })
            })(),
          agentOpen
            ? h('div', { className: 'stm-modal-backdrop' },
              h('div', { className: 'stm-modal-card' },
                h('div', { className: 'stm-inline', style: { justifyContent: 'space-between' } },
                  h('h3', { className: 'stm-section-title', style: { margin: 0 } }, t('addAgentTitle')),
                  h(Button, { ghost: true, onClick: () => setAgentOpen(false) }, t('cancel'))
                ),
                h(AddAgentRows, { state, onNotice, onDone: () => setAgentOpen(false) })
              )
            )
            : null,
          addOpen
            ? h('div', { className: 'stm-modal-backdrop' },
              h('div', { className: 'stm-modal-card' },
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
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_KEY, locale: NS }, function TeamPanelSafe() {
          return h(PanelBoundary, null, h(TeamPanel))
        }))
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
