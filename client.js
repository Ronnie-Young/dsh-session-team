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
    const { useEffect, useState } = React
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
      flush: '立即投递',
      briefing: '生成 Lead 说明',
      pending: '待读汇报',
      noticesPending: '待通知',
      groupWorkspace: '归入项目分组',
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
      addMember: '从已有会话加入',
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
      flush: 'Deliver now',
      briefing: 'Brief the Lead',
      pending: 'Unread reports',
      noticesPending: 'notices pending',
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
      onMove, onDragStart, onDragOver, onDrop, onDragEnd, dragging
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
              h('option', { value: 'all', key: 'all' }, t('all')),
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

    function TeamDetail({ state, onBack, onNotice }) {
      const [addOpen, setAddOpen] = useState(false)
      const [agentOpen, setAgentOpen] = useState(false)
      const [dragFrom, setDragFrom] = useState(-1)
      const [busy, setBusy] = useState(false)
      const team = state?.team
      if (!team) {
        return h('div', { className: 'stm-page' },
          h('div', { className: 'stm-wrap' },
            h('div', { className: 'stm-actions' }, h(Button, { onClick: onBack }, t('back'))),
            h('div', { className: 'stm-card' }, h('div', { className: 'stm-empty' }, t('noTeams')))
          )
        )
      }
      const leadMember = team.members.find(member => member.lead)

      function moveMember(from, to) {
        if (from < 0 || to < 0 || from === to) return
        const ids = team.members.map(member => member.sessionId)
        if (from >= ids.length || to >= ids.length) return
        const [moved] = ids.splice(from, 1)
        ids.splice(to, 0, moved)
        act(withTeam(state, { kind: 'reorder-members', order: ids })).then(result => {
          if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
        })
        setDragFrom(-1)
      }

      function run(body, success) {
        setBusy(true)
        act(withTeam(state, body)).then(result => {
          setBusy(false)
          if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
          else if (success) onNotice(success)
        })
      }

      return h('div', { className: 'stm-page' },
        h('div', { className: 'stm-wrap' },
          h('div', { className: 'stm-head' },
            h('div', null,
              h('h1', { className: 'stm-title' }, team.name),
              h('p', { className: 'stm-sub' },
                `${t('members')} ${team.members.length} · ${t('pending')} ${team.pendingReports}`,
                team.pendingNotices > 0 ? ` · ${t('noticesPending')} ${team.pendingNotices}` : '',
                leadMember ? ` · ${t('lead')}: ${leadMember.name}` : '',
                state?.models?.default ? ` · ${t('defaultModel', { name: state.models.default.model })}` : ''
              )
            ),
            h('div', { className: 'stm-actions' },
              h(Button, { onClick: onBack }, t('back')),
              h(Button, { onClick: () => refresh(), disabled: false }, t('refresh')),
              h(Button, { onClick: () => run({ kind: 'flush' }, `${t('done')}: ${t('flush')}`), disabled: busy || !team.lead }, t('flush')),
              h(Button, { onClick: () => run({ kind: 'brief-lead' }, `${t('done')}: ${t('briefing')}`), disabled: busy || !team.lead }, t('briefing')),
              h(Button, {
                onClick: () => {
                  setBusy(true)
                  act(withTeam(state, { kind: 'attach-workspace' })).then(result => {
                    setBusy(false)
                    if (!result.ok) {
                      onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
                      return
                    }
                    onNotice(result.attached > 0
                      ? t('groupedDone', { n: result.attached })
                      : t('groupedNone'))
                  })
                },
                disabled: busy
              }, t('groupWorkspace')),
              h(Button, { onClick: () => setAddOpen(!addOpen) }, addOpen ? t('cancel') : t('addMember')),
              h(Button, {
                onClick: () => {
                  if (typeof window.confirm === 'function' && !window.confirm(t('deleteConfirm'))) return
                  setBusy(true)
                  act({ kind: 'delete-team', teamId: team.id }).then(result => {
                    setBusy(false)
                    if (!result.ok) onNotice(`${t('failed')}: ${result.error?.message ?? result.error}`)
                    else onBack()
                  })
                },
                disabled: busy
              }, t('deleteTeam'))
            )
          ),
          addOpen ? h(AddMembers, { state, onNotice }) : null,
          h('div', { className: 'stm-card' },
            h('h3', { className: 'stm-section-title' }, t('members')),
            team.members.length === 0
              ? h('div', { className: 'stm-empty' }, t('noTeams'))
              : team.members.map((member, index) => h(MemberRow, {
                key: member.sessionId,
                member,
                models: state?.models,
                state,
                onNotice,
                index,
                isFirst: index === 0,
                isLast: index === team.members.length - 1,
                onMove: delta => moveMember(index, index + delta),
                onDragStart: () => setDragFrom(index),
                onDragOver: event => { event.preventDefault() },
                onDrop: () => moveMember(dragFrom, index),
                onDragEnd: () => setDragFrom(-1),
                dragging: dragFrom === index
              })),
            agentOpen
              ? h(AddAgentRows, {
                state,
                onNotice,
                onDone: () => setAgentOpen(false)
              })
              : h('div', { className: 'stm-inline', style: { marginTop: '10px' } },
                h(Button, { ghost: true, onClick: () => setAgentOpen(true) }, t('addAgentEntry'))
              )
          ),
          team.members.length > 0 ? h(DispatchBox, { state, onNotice }) : null,
          h(TaskCard, { state, onNotice }),
          h(ReportList, { state }),
          h('div', { className: 'stm-hint' }, `dsh-session-team v${state?.version ?? '?'}`)
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
