/**
 * dsh-session-team — 把多个 session 组织成一支支**项目团队**，而不是只有一个全局团队。
 *
 * 数据模型（`$DSH_HOME/session-team/teams.json`，插件自己的数据文件）：
 *   teams: [{ id, name, cwd, lead, members[], createdAt }]
 *   activeTeamId: 面板当前选中的团队
 *   同时 `ledger.json` 按 teamId 记派活台账与未送达汇报。
 *
 * 与 DSH 自带能力的区别：
 *   - 自带 `subagent` / Team 任务板是“当前会话的子代理”，不是侧栏里的独立会话；
 *   - 本插件把已有会话（或由插件新建的会话）登记成团队成员，每个团队一个 Lead；
 *   - 汇报按「阶段 → 先后」排队，只在 Lead 空闲时成批投递，不插进它正在处理的回合。
 *
 * @module dsh-session-team
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import Schema from '@deepseek-ai/schemastery'

/** 插件版本：唯一来源是 package.json；读取带短缓存，版本号改了不用重启也能显示。 */
const require = createRequire(import.meta.url)
const VERSION = require('./package.json').version
let versionCache = { at: 0, value: VERSION }

/** 读 package.json 的 version（10 秒缓存），读不到时回落到加载时读到的值。 */
async function readVersion() {
  const now = Date.now()
  if (now - versionCache.at < 10_000) return versionCache.value
  try {
    const pkg = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8'))
    if (typeof pkg.version === 'string' && pkg.version !== '') {
      versionCache = { at: now, value: pkg.version }
    }
  } catch { /* 保持旧值 */ }
  return versionCache.value
}

/** 插件名（loader 诊断用）。 */
export const name = 'session-team'

/** 依赖按需注入：缺失时插件照常加载，只是对应能力不可用。 */
export const inject = []

/** 汇报队列上限。 */
const MAX_REPORTS = 200
/** 台账里保留的派活条数。 */
const MAX_ASSIGNMENTS = 100
const MAX_NOTICES = 50

/** 插件配置。 */
export const Config = Schema.object({
  teamName: Schema.string().default('新团队').description('新建团队时的默认名字。'),
  members: Schema.array(
    Schema.object({
      sessionId: Schema.string().required().description('团队成员 session id。'),
      name: Schema.string().default('').description('成员名。'),
      role: Schema.string().default('').description('分工/角色。'),
      stage: Schema.number().default(0).description('阶段号，小的先处理。'),
      lead: Schema.boolean().default(false).description('是否为 Lead。'),
    }),
  )
    .default([])
    .description('【旧版兼容】单团队名单；首次升级时迁移成一个团队，之后以 teams.json 为准。'),
  leadSessionId: Schema.string().default('').description('【旧版兼容】单团队 Lead；迁移后不再读取。'),
  deliverOnIdle: Schema.boolean().default(true).description('Lead 空闲时自动投递排队中的汇报。'),
  maxReportsPerDigest: Schema.number().default(8).description('一次投递最多合并几条汇报。'),
  digestDebounceMs: Schema.number().default(1200).description('汇报到达后合并投递的防抖窗口（毫秒）。'),
  bodyLimit: Schema.number().default(600).description('单条汇报正文在摘要里保留的字符数。'),
  routePath: Schema.string().default('/session-team').description('面板读取状态的 Host 路由前缀。'),
  tool: Schema.boolean().default(true).description('注册团队工具。'),
  briefOnDispatch: Schema.boolean().default(true).description('首次给成员派活时附带团队身份说明。'),
  stateDir: Schema.string().default('').description('团队与台账文件的目录；留空用 $DSH_HOME/session-team。'),
  resumeStaleMs: Schema.number().default(300_000).description('派活后多久没有汇报且成员不在运行，就视为「可能已被中断」；成员还有排队输入时不算。'),
  checkIntervalMs: Schema.number().default(1_000).description('空闲恢复检查的最小间隔（毫秒），只在有未完成任务时运行。'),
})

/** 号码化成员名。 */
function memberLabel(member) {
  return member.role === '' ? member.name : `${member.name}（${member.role}）`
}

/** 把多行正文压成一行。 */
function oneLine(text, limit) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length <= limit ? flat : `${flat.slice(0, limit)}…`
}

/** 一个从不取消的信号。 */
function idleSignal() {
  return new AbortController().signal
}

/** 规范化一个团队成员。 */
function normalizeMember(raw, index) {
  if (raw === null || typeof raw !== 'object') return null
  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId.trim() : ''
  if (sessionId === '') return null
  return {
    sessionId,
    name: (typeof raw.name === 'string' ? raw.name.trim() : '') || `成员 ${index + 1}`,
    role: typeof raw.role === 'string' ? raw.role.trim() : '',
    stage: Number.isFinite(raw.stage) ? Number(raw.stage) : index + 1,
  }
}

/** 规范化一个团队。 */
function normalizeTeam(raw, index) {
  if (raw === null || typeof raw !== 'object') return null
  const members = (Array.isArray(raw.members) ? raw.members : [])
    .map(normalizeMember)
    .filter(Boolean)
  const lead = typeof raw.lead === 'string' && raw.lead !== '' && members.some(m => m.sessionId === raw.lead)
    ? raw.lead
    : (members[0]?.sessionId ?? '')
  return {
    id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : `team-${index + 1}`,
    name: (typeof raw.name === 'string' ? raw.name.trim() : '') || `团队 ${index + 1}`,
    cwd: typeof raw.cwd === 'string' ? raw.cwd.trim() : '',
    lead,
    members,
    createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now(),
  }
}

/**
 * 注册团队工具与路由。
 * @param ctx - Cordis 插件上下文。
 * @param config - 已校验的插件配置。
 */
export async function apply(ctx, config) {
  const stateRoot = typeof config.stateDir === 'string' && config.stateDir.trim() !== ''
    ? config.stateDir.trim()
    : join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'session-team')
  const teamsFile = join(stateRoot, 'teams.json')
  const ledgerFile = join(stateRoot, 'ledger.json')
  const legacyRosterFile = join(stateRoot, 'roster.json')

  /** 全部团队与当前选中的团队。 */
  let teams = []
  let activeTeamId = ''
  let teamsChain = Promise.resolve()
  let teamsTimer = null

  /** 未送达/未读的汇报与派活台账，都带 teamId。 */
  const reports = []
  const assignments = []
  const notices = []
  let reportSeq = 0
  let taskSeq = 0
  let noticeSeq = 0
  let ledgerChain = Promise.resolve()
  let ledgerTimer = null
  /** 每个团队一个投递防抖定时器。 */
  const deliveryTimers = new Map()
  const noticeTimers = new Map()
  let delivering = false
  let noticeDelivering = false
  let lastLayout = null
  /** 已附带过身份说明的成员。 */
  const briefed = new Set()

  const teamById = id => teams.find(team => team.id === id) ?? null
  const activeTeam = () => teamById(activeTeamId) ?? teams[0] ?? null
  /** 调用者属于哪个团队：优先其担任 Lead 的团队，其次作为成员的团队。 */
  const teamForAgent = agentId => teams.find(team => team.lead === agentId)
    ?? teams.find(team => team.members.some(member => member.sessionId === agentId))
    ?? null

  // ---- 团队清单持久化 ----

  /** 读取 teams.json；没有就尝试把旧版单团队配置迁移过来。 */
  async function loadTeams() {
    let data
    try {
      data = JSON.parse(await readFile(teamsFile, 'utf8'))
    } catch {
      data = null
    }
    if (data !== null && Array.isArray(data.teams)) {
      teams = data.teams.map(normalizeTeam).filter(Boolean)
      activeTeamId = typeof data.activeTeamId === 'string' ? data.activeTeamId : ''
    }
    if (teams.length === 0) {
      const legacy = await readLegacyTeam()
      if (legacy !== null) teams = [legacy]
    }
    if (teamById(activeTeamId) === null) activeTeamId = teams[0]?.id ?? ''
  }

  /** 旧版单团队：先看 roster.json，再看 Config 里的 members。 */
  async function readLegacyTeam() {
    let rawMembers = []
    let rawLead = ''
    let rawName = ''
    try {
      const legacy = JSON.parse(await readFile(legacyRosterFile, 'utf8'))
      rawMembers = Array.isArray(legacy.members) ? legacy.members : []
      rawLead = typeof legacy.leadSessionId === 'string' ? legacy.leadSessionId : ''
      rawName = typeof legacy.teamName === 'string' ? legacy.teamName : ''
    } catch {
      rawMembers = Array.isArray(config.members) ? config.members : []
      rawLead = typeof config.leadSessionId === 'string' ? config.leadSessionId : ''
      rawName = typeof config.teamName === 'string' ? config.teamName : ''
    }
    const members = rawMembers.map(normalizeMember).filter(Boolean)
    if (members.length === 0) return null
    return normalizeTeam({
      id: 'team-legacy',
      name: rawName || config.teamName || '迁移团队',
      cwd: '',
      lead: rawLead,
      members,
      createdAt: Date.now(),
    }, 0)
  }

  /** 串行、原子地写团队清单。 */
  function persistTeams() {
    const snapshot = JSON.stringify({ version: 1, activeTeamId, teams }, null, 2)
    teamsChain = teamsChain
      .then(async () => {
        await mkdir(dirname(teamsFile), { recursive: true })
        const temporary = `${teamsFile}.tmp`
        await writeFile(temporary, snapshot, 'utf8')
        await rename(temporary, teamsFile)
      })
      .catch(error => {
        console.error('[dsh-session-team] teams write failed:', error)
      })
    return teamsChain
  }

  /** 防抖保存团队清单。 */
  function scheduleTeamsSave() {
    if (teamsTimer !== null) return
    teamsTimer = setTimeout(() => {
      teamsTimer = null
      persistTeams().catch(() => {})
    }, 300)
    if (typeof teamsTimer.unref === 'function') teamsTimer.unref()
  }

  // ---- 台账持久化 ----

  /** 读取汇报队列与派活台账。 */
  async function loadLedger() {
    let data
    try {
      data = JSON.parse(await readFile(ledgerFile, 'utf8'))
    } catch {
      return
    }
    if (Array.isArray(data.reports)) {
      for (const report of data.reports) {
        if (report === null || typeof report !== 'object' || typeof report.sessionId !== 'string') continue
        if (typeof report.teamId !== 'string') report.teamId = ''
        if (reports.length < MAX_REPORTS) reports.push(report)
        reportSeq = Math.max(reportSeq, Number(report.seq) || 0)
      }
    }
    if (Array.isArray(data.assignments)) {
      for (const task of data.assignments) {
        if (task === null || typeof task !== 'object' || typeof task.sessionId !== 'string') continue
        if (typeof task.teamId !== 'string') task.teamId = ''
        assignments.push(task)
        taskSeq = Math.max(taskSeq, Number(task.seq) || 0)
      }
    }
    if (Array.isArray(data.notices)) {
      for (const notice of data.notices) {
        if (notice === null || typeof notice !== 'object' || typeof notice.text !== 'string') continue
        if (typeof notice.teamId !== 'string') notice.teamId = ''
        if (notices.length < MAX_NOTICES) notices.push(notice)
        noticeSeq = Math.max(noticeSeq, Number(notice.seq) || 0)
      }
    }
    // 旧版台账没有 teamId：只有一个团队时整体归给它。
    if (teams.length === 1) {
      const onlyTeamId = teams[0].id
      for (const report of reports) if (report.teamId === '') report.teamId = onlyTeamId
      for (const task of assignments) if (task.teamId === '') task.teamId = onlyTeamId
      for (const notice of notices) if (notice.teamId === '') notice.teamId = onlyTeamId
    }
  }

  /** 串行、原子地写台账。 */
  function persistLedger() {
    const snapshot = JSON.stringify({
      version: 1,
      savedAt: new Date().toISOString(),
      assignments: assignments.slice(-MAX_ASSIGNMENTS),
      reports: [...reports.filter(report => !report.delivered), ...reports.filter(report => report.delivered).slice(-50)],
      notices: [...notices.filter(notice => !notice.delivered), ...notices.filter(notice => notice.delivered).slice(-20)],
    }, null, 2)
    ledgerChain = ledgerChain
      .then(async () => {
        await mkdir(dirname(ledgerFile), { recursive: true })
        const temporary = `${ledgerFile}.tmp`
        await writeFile(temporary, snapshot, 'utf8')
        await rename(temporary, ledgerFile)
      })
      .catch(error => {
        console.error('[dsh-session-team] ledger write failed:', error)
      })
    return ledgerChain
  }

  /** 防抖保存台账。 */
  function scheduleLedgerSave() {
    if (ledgerTimer !== null) return
    ledgerTimer = setTimeout(() => {
      ledgerTimer = null
      persistLedger().catch(() => {})
    }, 300)
    if (typeof ledgerTimer.unref === 'function') ledgerTimer.unref()
  }

  await loadTeams()
  await loadLedger()
  if (teams.length > 0) scheduleTeamsSave()

  // ---- 会话状态与模型 ----

  /** 会话清单摘要（冷会话只读头，不激活 Agent）。 */
  async function sessionSummaries(signal) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.list !== 'function') return null
    try {
      const value = await controller.list({}, signal ?? idleSignal())
      return new Map(value.items.map(item => [item.sessionId, item]))
    } catch {
      return null
    }
  }

  /** 只对活着的会话问一次精确状态。 */
  async function sessionState(sessionId, signal) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.state !== 'function') return null
    try {
      const state = await controller.state({ sessionId }, signal ?? idleSignal())
      return {
        active: state.active === true,
        running: state.running === true,
        pendingInput: Array.isArray(state.pendingInput) ? state.pendingInput : [],
        queued: Array.isArray(state.queue) ? state.queue.length : 0,
      }
    } catch {
      return null
    }
  }

  /** 一个成员的显示状态。 */
  async function memberState(sessionId, summaries, signal) {
    const summary = summaries?.get(sessionId)
    const base = {
      active: summary?.agentAvailable === true,
      running: summary?.running === true,
      pendingInput: [],
      queued: 0,
    }
    if (!base.active) return base
    const exact = await sessionState(sessionId, signal)
    return exact ?? base
  }

  /** 某个团队的 Lead 是否活着且空闲。 */
  async function leadIsIdle(team) {
    if (team === null || team.lead === '') return false
    const summaries = await sessionSummaries()
    const summary = summaries?.get(team.lead)
    if (!summary) return false
    return summary.agentAvailable === true && summary.running !== true
  }

  /** 向一个会话投递一条 user 消息。 */
  async function promptSession(sessionId, text, mode, signal) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.prompt !== 'function') {
      throw new Error('sessionController 不可用，无法投递消息')
    }
    const requestId = `session-team-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await controller.prompt(
      { requestId, sessionId, mode, content: [{ type: 'text', text }] },
      signal ?? idleSignal(),
    )
    return true
  }

  /** 模型目录缓存。 */
  let modelCatalogCache = { at: 0, value: null }

  /** 读取可路由的模型目录。 */
  async function modelCatalog(force) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.modelCatalog !== 'function') return null
    if (!force && modelCatalogCache.value !== null && Date.now() - modelCatalogCache.at < 60_000) {
      return modelCatalogCache.value
    }
    try {
      const value = await controller.modelCatalog()
      modelCatalogCache = { at: Date.now(), value }
      return value
    } catch {
      return null
    }
  }

  /** 成员模型选择缓存。 */
  const memberModelCache = new Map()

  /** 读成员下一个回合会用的模型。 */
  async function memberModel(sessionId, signal) {
    const cached = memberModelCache.get(sessionId)
    if (cached !== undefined && Date.now() - cached.at < 5_000) return cached.value
    const controller = ctx.get('sessionController')
    let value = null
    if (controller && typeof controller.projections === 'function') {
      try {
        const snapshot = await controller.projections({ sessionId }, signal ?? idleSignal())
        const selection = snapshot?.values?.modelSelection
        const chosen = selection?.next ?? selection?.lastUsed ?? null
        if (chosen && typeof chosen.provider === 'string' && typeof chosen.model === 'string') {
          value = {
            provider: chosen.provider,
            model: chosen.model,
            reasoningEffort: typeof chosen.reasoningEffort === 'string' ? chosen.reasoningEffort : '',
          }
        }
      } catch {
        value = null
      }
    }
    memberModelCache.set(sessionId, { at: Date.now(), value })
    return value
  }

  /** 面板/工具用的模型目录快照。 */
  async function modelSnapshot(force) {
    const catalog = await modelCatalog(force)
    if (catalog === null) return null
    return {
      default: {
        provider: catalog.default?.provider ?? '',
        model: catalog.default?.model ?? '',
      },
      providers: (catalog.groups ?? []).map(group => ({
        id: group.id,
        name: group.name,
        models: (group.models ?? []).map(model => ({
          id: model.id,
          name: model.name,
          description: model.description ?? '',
          efforts: (model.reasoning?.efforts ?? []).map(effort => ({ id: effort.id, name: effort.name })),
          defaultEffort: model.reasoning?.defaultEffort ?? '',
        })),
      })),
      failures: (catalog.failures ?? []).map(failure => failure.message ?? String(failure.id ?? '')),
    }
  }

  /** 当前可用的 Agent 模式（preset）列表，供面板选择。 */
  async function presetCatalog() {
    const presets = ctx.get('agentPresets')
    if (!presets || typeof presets.list !== 'function') return null
    try {
      const list = await presets.list()
      return list
        .filter(preset => preset && typeof preset.id === 'string' && preset.id !== '')
        .map(preset => ({
          id: preset.id,
          name: typeof preset.name === 'string' && preset.name !== '' ? preset.name : preset.id,
          description: typeof preset.description === 'string' ? preset.description : '',
          order: Number.isFinite(preset.order) ? Number(preset.order) : 0,
          broken: preset.broken !== undefined,
        }))
        .sort((left, right) => left.order - right.order)
    } catch {
      return null
    }
  }

  /** 给某个成员换模型（只写该会话，不动全局默认）。 */
  async function selectMemberModel(member, provider, model, reasoningEffort, signal) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.resolveAgent !== 'function') {
      throw new Error('sessionController 不可用，无法切换模型')
    }
    const catalog = await modelCatalog(true)
    const entry = catalog?.groups?.find(group => group.id === provider)?.models?.find(item => item.id === model)
    if (!entry) throw new Error(`模型不在当前可用目录里：${provider} / ${model}`)
    const route = await controller.resolveAgent(member.sessionId)
    if (!route || !route.agent) {
      throw new Error(`无法激活成员会话（${route?.error?.code ?? 'UNKNOWN'}）：${member.sessionId}`)
    }
    const selection = {
      provider,
      model,
      ...(typeof reasoningEffort === 'string' && reasoningEffort !== '' ? { reasoningEffort } : {}),
    }
    route.agent.model.select(selection)
    memberModelCache.delete(member.sessionId)
    return {
      ...selection,
      reasoningEffort: selection.reasoningEffort ?? '',
      label: `${entry.name}${selection.reasoningEffort === undefined ? '' : ` · ${selection.reasoningEffort}`}`,
    }
  }

  // ---- 会话对话预览（右侧抽屉） ----

  /** 把消息 content 里的文本块拼成一段文字。 */
  function textOfBlocks(blocks) {
    if (!Array.isArray(blocks)) return ''
    const parts = []
    for (const block of blocks) {
      if (block === null || typeof block !== 'object') continue
      if (block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    }
    return parts.join('\n').trim()
  }

  /** 助手消息里请求过的工具名（去重、最多 6 个）。 */
  function toolNamesOf(blocks) {
    if (!Array.isArray(blocks)) return []
    const names = []
    for (const block of blocks) {
      if (block === null || typeof block !== 'object') continue
      if (block.type === 'tool-call' && typeof block.name === 'string' && !names.includes(block.name)) {
        names.push(block.name)
      }
    }
    return names.slice(0, 6)
  }

  /** 读一个会话最近的消息（只读，不激活 Agent）。 */
  async function transcriptOf(sessionId, limit, signal) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.events !== 'function') throw new Error('sessionController 不可用')
    const page = await controller.events({
      address: { kind: 'session', sessionId },
      maxMessages: limit,
    }, signal ?? idleSignal())
    const messages = []
    for (const record of page?.records ?? []) {
      const event = record?.event
      if (event === null || typeof event !== 'object') continue
      const data = event.data ?? {}
      const seq = Number(event.seq) || 0
      const time = Number(event.time) || 0
      if (event.type === 'user/message') {
        const text = textOfBlocks(data.content)
        if (text !== '') {
          const source = data.source ?? null
          const injected = source !== null && source !== undefined && source.kind !== 'user'
          messages.push({
            seq,
            time,
            role: 'user',
            injected,
            summary: typeof source?.form === 'object' && source.form?.summary !== undefined
              ? String(source.form.summary)
              : '',
            text: text.length > 6000 ? `${text.slice(0, 6000)}\n…` : text,
          })
        }
      } else if (event.type === 'assistant/message') {
        const message = data.message ?? {}
        const text = textOfBlocks(message.content)
        const tools = toolNamesOf(message.content)
        if (text !== '' || tools.length > 0) {
          messages.push({
            seq,
            time,
            role: 'assistant',
            text: text.length > 6000 ? `${text.slice(0, 6000)}\n…` : text,
            tools,
          })
        }
      } else if (event.type === 'tool/call') {
        messages.push({
          seq,
          time,
          role: 'tool',
          name: String(data.name ?? 'tool'),
          text: oneLine(String(data.arguments ?? ''), 300),
          tools: [],
        })
      }
    }
    return {
      sessionId,
      cursor: Number(page?.cursor ?? -1),
      hasMore: page?.hasMore === true,
      messages,
    }
  }

  // ---- 角色对话：发消息 / 中断 / 流式输出 ----

  /** 正在监听的会话：sessionId -> { abort, buffer, lastReadAt }。 */
  const watchers = new Map()
  const LIVE_TEXT_LIMIT = 4000
  let watcherTimer = null

  /** 把 assistant-stream 的 chunk 折进缓冲区。 */
  function applyStreamChunk(buffer, chunk) {
    if (chunk === null || typeof chunk !== 'object') return
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      buffer.text = (buffer.text + chunk.text).slice(-LIVE_TEXT_LIMIT)
    } else if (chunk.type === 'reasoning-delta' && typeof chunk.text === 'string') {
      buffer.reasoning = (buffer.reasoning + chunk.text).slice(-LIVE_TEXT_LIMIT)
    } else if (chunk.type === 'tool-call-delta' && typeof chunk.name === 'string' && chunk.name !== '') {
      if (!buffer.tools.includes(chunk.name)) buffer.tools = [...buffer.tools, chunk.name].slice(-8)
    }
  }

  /** 应用一帧流式输出。 */
  function applyStreamFrame(buffer, frame) {
    if (frame === null || typeof frame !== 'object') return
    if (frame.type === 'start') {
      buffer.text = ''
      buffer.reasoning = ''
      buffer.tools = []
      return
    }
    if (frame.type === 'end') {
      buffer.text = ''
      buffer.reasoning = ''
      buffer.tools = []
      return
    }
    if (frame.type === 'chunk') applyStreamChunk(buffer, frame.chunk)
  }

  /** 订阅一个会话的实时状态与流式文本；重复调用会替换旧订阅。 */
  function startWatch(sessionId) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.follow !== 'function') {
      throw new Error('sessionController.follow 不可用，无法查看流式输出')
    }
    stopWatch(sessionId)
    const abort = new AbortController()
    const buffer = { text: '', reasoning: '', tools: [], updatedAt: Date.now(), error: '' }
    watchers.set(sessionId, { abort, buffer, lastReadAt: Date.now() })
    const signal = abort.signal
    ;(async () => {
      try {
        const stream = controller.follow({
          address: { kind: 'session', sessionId },
          maxMessages: 1,
          activate: false,
          assistantStream: true,
        }, signal)
        for await (const frame of stream) {
          const entry = watchers.get(sessionId)
          if (entry === undefined) break
          entry.buffer.updatedAt = Date.now()
          if (frame?.type === 'assistant-stream') {
            applyStreamFrame(entry.buffer, frame.frame)
          } else if (frame?.type === 'snapshot') {
            entry.buffer.text = ''
            entry.buffer.reasoning = ''
            entry.buffer.tools = []
            const baseline = frame.assistantStream?.activeAttempt
            if (baseline !== undefined && Array.isArray(baseline.stream)) {
              for (const chunk of baseline.stream) applyStreamChunk(entry.buffer, chunk)
            }
          }
        }
      } catch (error) {
        const entry = watchers.get(sessionId)
        if (entry !== undefined && signal.aborted !== true) {
          entry.buffer.error = error instanceof Error ? error.message : String(error)
        }
      }
    })()
    if (watcherTimer === null) {
      watcherTimer = setInterval(() => {
        const now = Date.now()
        for (const [sessionId, entry] of watchers) {
          if (now - entry.lastReadAt > 120_000) stopWatch(sessionId)
        }
      }, 30_000)
      if (typeof watcherTimer.unref === 'function') watcherTimer.unref()
    }
    return { ok: true, sessionId }
  }

  /** 停止监听一个会话。 */
  function stopWatch(sessionId) {
    const entry = watchers.get(sessionId)
    if (entry === undefined) return { ok: true, removed: false }
    watchers.delete(sessionId)
    try { entry.abort.abort() } catch { /* 忽略 */ }
    return { ok: true, removed: true }
  }

  /** 读一个会话的实时状态与流式文本缓冲。 */
  async function liveState(sessionId, signal) {
    const entry = watchers.get(sessionId)
    const controller = ctx.get('sessionController')
    let state = null
    if (controller && typeof controller.state === 'function') {
      try {
        state = await controller.state({ sessionId }, signal ?? idleSignal())
      } catch { /* 保持空 */ }
    }
    if (entry === undefined) {
      return { ok: true, watching: false, running: state?.running === true, active: state?.active === true, pendingInput: state?.pendingInput ?? [] }
    }
    entry.lastReadAt = Date.now()
    return {
      ok: true,
      watching: true,
      running: state?.running === true,
      active: state?.active === true,
      pendingInput: state?.pendingInput ?? [],
      queue: (state?.queue ?? []).length,
      streamText: entry.buffer.text,
      streamReasoning: entry.buffer.reasoning,
      tools: entry.buffer.tools,
      updatedAt: new Date(entry.buffer.updatedAt).toISOString(),
      error: entry.buffer.error,
    }
  }

  /** 给某个角色发一条普通消息（不记派活台账）。 */
  async function sendMessage(sessionId, text, mode, signal) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.prompt !== 'function') throw new Error('sessionController 不可用')
    const body = String(text ?? '').trim()
    if (body === '') throw new Error('消息不能为空')
    await controller.prompt({
      requestId: `session-team-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      mode: mode === 'steer' ? 'steer' : 'queue',
      content: [{ type: 'text', text: body.slice(0, 8000) }],
    }, signal ?? idleSignal())
    return { ok: true, sessionId, mode: mode === 'steer' ? 'steer' : 'queue' }
  }

  // ---- 项目分组（workspace） ----

  /** 团队 cwd 对应的持久工作区：不存在就建一个，让新会话直接落到项目分组里。 */
  async function workspaceFor(cwd, title) {
    const registry = ctx.get('workspaceRegistry')
    if (!registry || typeof registry.create !== 'function') return null
    const path = String(cwd ?? '').trim()
    if (path === '' || !path.startsWith('/')) return null
    try {
      return await registry.create(path, String(title ?? ''))
    } catch {
      return null
    }
  }

  /** 把若干会话挂到团队工作区；已属于其他工作区的会话不搬动。 */
  async function attachSessionsToWorkspace(workspace, sessionIds) {
    if (workspace === null || typeof workspace.attachSession !== 'function') return { attached: 0, skipped: 0 }
    const registry = ctx.get('workspaceRegistry')
    const owned = new Set()
    try {
      for (const item of registry?.list?.() ?? []) {
        for (const id of item.sessionIds ?? []) owned.add(id)
      }
    } catch { /* 忽略 */ }
    let attached = 0
    let skipped = 0
    for (const sessionId of sessionIds) {
      if (typeof sessionId !== 'string' || sessionId === '') continue
      if (owned.has(sessionId)) { skipped += 1; continue }
      try {
        await workspace.attachSession(sessionId)
        attached += 1
      } catch { skipped += 1 }
    }
    return { attached, skipped }
  }

  // ---- 汇报 ----

  const pendingReportsOf = team => reports.filter(report => !report.delivered && report.teamId === team.id)
  const sortByOrder = (a, b) => a.stage - b.stage || a.seq - b.seq

  /** 汇总摘要文本。 */
  function formatDigest(team, batch, total) {
    const remaining = total - batch.length
    const lines = [
      `[团队汇报] 团队「${team.name}」有 ${total} 条汇报待读；本轮送达 ${batch.length} 条（按阶段、再按先后排序）。`,
    ]
    batch.forEach((report, index) => {
      lines.push(`${index + 1}. ${report.name}${report.role === '' ? '' : `（${report.role}）`} · 阶段 ${report.stage} · ${report.state} · ${report.subject}`)
      if (report.body !== '') lines.push(`   ${oneLine(report.body, config.bodyLimit)}`)
    })
    lines.push(remaining > 0
      ? `（还剩 ${remaining} 条未读：用 team_collect 继续读取。不要逐条回复汇报者；需要安排下一步时用 team_dispatch。）`
      : '（这是当前全部未读汇报。不要逐条回复汇报者；需要安排下一步时用 team_dispatch。）')
    return lines.join('\n')
  }

  /** 投递一批汇报给团队 Lead。 */
  async function flushReports(team, force) {
    if (delivering) return { delivered: 0, reason: 'busy' }
    if (team === null || team.lead === '') return { delivered: 0, reason: 'no-lead' }
    const pending = pendingReportsOf(team)
    if (pending.length === 0) return { delivered: 0, reason: 'empty' }
    if (!force && !(await leadIsIdle(team))) return { delivered: 0, reason: 'lead-busy' }
    delivering = true
    try {
      const batch = pending.slice().sort(sortByOrder).slice(0, Math.max(1, config.maxReportsPerDigest))
      await promptSession(team.lead, formatDigest(team, batch, pending.length), 'queue')
      const deliveredAt = Date.now()
      for (const report of batch) {
        report.delivered = true
        report.deliveredAt = deliveredAt
      }
      scheduleLedgerSave()
      return { delivered: batch.length, reason: 'ok' }
    } catch (error) {
      return { delivered: 0, reason: 'failed', error: error instanceof Error ? error.message : String(error) }
    } finally {
      delivering = false
    }
  }

  /** 防抖调度某个团队的自动投递。 */
  function scheduleDelivery(team, force) {
    if (team === null || team.lead === '') return
    if (!config.deliverOnIdle && !force) return
    if (deliveryTimers.has(team.id)) return
    const timer = setTimeout(() => {
      deliveryTimers.delete(team.id)
      flushReports(team, force).catch(error => {
        console.error('[dsh-session-team] flush failed:', error)
      })
    }, Math.max(0, config.digestDebounceMs))
    if (typeof timer.unref === 'function') timer.unref()
    deliveryTimers.set(team.id, timer)
  }

  // ---- 成员变动通知 ----

  /** 当前团队里未送达的成员变动通知。 */
  const pendingNoticesOf = team => notices.filter(notice => !notice.delivered && notice.teamId === team.id)

  /** 生成一条「成员名单」通知文本；highlight 里的会话会被标记为新成员。 */
  function formatRosterNotice(team, headline, highlight = []) {
    const marks = new Set(highlight.filter(id => typeof id === 'string'))
    const lines = [
      `[团队成员变动] ${headline}`,
      `团队「${team.name}」现在有 ${team.members.length} 位成员：`,
    ]
    for (const member of team.members) {
      const tags = []
      if (marks.has(member.sessionId)) tags.push('新成员')
      if (member.sessionId === team.lead) tags.push('Lead')
      const role = member.role === '' ? '' : `（${member.role}）`
      lines.push(`- ${member.name}${role} · 优先级 ${member.stage}${tags.length === 0 ? '' : ` · ${tags.join(' / ')}`}`)
    }
    lines.push('（这是成员名单变更通知，不需要回复。核对或查看完整名单用 team_roster；'
      + '给新成员安排工作用 team_dispatch，target 写成员名。角色说明见上面的括号。）')
    return lines.join('\n')
  }

  /** 记一条成员变动通知并调度投递。 */
  function queueRosterNotice(team, headline, highlight = []) {
    if (team === null || team.lead === '') return
    notices.push({
      seq: ++noticeSeq,
      teamId: team.id,
      text: formatRosterNotice(team, headline, highlight),
      createdAt: Date.now(),
      delivered: false,
    })
    if (notices.length > MAX_NOTICES) notices.splice(0, notices.length - MAX_NOTICES)
    scheduleLedgerSave()
    scheduleNoticeDelivery(team, false)
  }

  /** 把某个团队未送达的成员变动通知合并成一条发给 Lead。 */
  async function flushNotices(team, force) {
    if (noticeDelivering) return { delivered: 0, reason: 'busy' }
    if (team === null || team.lead === '') return { delivered: 0, reason: 'no-lead' }
    const pending = pendingNoticesOf(team)
    if (pending.length === 0) return { delivered: 0, reason: 'empty' }
    if (!force && !(await leadIsIdle(team))) return { delivered: 0, reason: 'lead-busy' }
    noticeDelivering = true
    try {
      const text = pending.map(notice => notice.text).join('\n\n')
      await promptSession(team.lead, text, 'queue')
      const deliveredAt = Date.now()
      for (const notice of pending) {
        notice.delivered = true
        notice.deliveredAt = deliveredAt
      }
      scheduleLedgerSave()
      return { delivered: pending.length, reason: 'ok' }
    } catch (error) {
      return { delivered: 0, reason: 'failed', error: error instanceof Error ? error.message : String(error) }
    } finally {
      noticeDelivering = false
    }
  }

  /** 防抖调度某个团队的成员变动通知投递。 */
  function scheduleNoticeDelivery(team, force) {
    if (team === null || team.lead === '') return
    if (noticeTimers.has(team.id)) return
    const timer = setTimeout(() => {
      noticeTimers.delete(team.id)
      flushNotices(team, force).catch(error => {
        console.error('[dsh-session-team] notice flush failed:', error)
      })
    }, Math.max(0, config.digestDebounceMs))
    if (typeof timer.unref === 'function') timer.unref()
    noticeTimers.set(team.id, timer)
  }

  /** 某个 Lead 变空闲时投递它团队的汇报。 */
  ctx.effect(
    () => ctx.on('agent/status', payload => {
      const agentId = payload?.agent?.id
      if (typeof agentId !== 'string') return
      if (payload.status !== 'idle') return
      const team = teams.find(candidate => candidate.lead === agentId)
      if (team === undefined) return
      if (pendingReportsOf(team).length > 0) scheduleDelivery(team, false)
      if (pendingNoticesOf(team).length > 0) scheduleNoticeDelivery(team, false)
    }),
    'session-team: lead idle delivery',
  )

  /** 卸载时清掉所有定时器。 */
  ctx.effect(
    () => () => {
      for (const timer of deliveryTimers.values()) clearTimeout(timer)
      deliveryTimers.clear()
      for (const timer of noticeTimers.values()) clearTimeout(timer)
      noticeTimers.clear()
      for (const sessionId of [...watchers.keys()]) stopWatch(sessionId)
      if (watcherTimer !== null) {
        clearInterval(watcherTimer)
        watcherTimer = null
      }
      if (teamsTimer !== null) clearTimeout(teamsTimer)
      if (ledgerTimer !== null) clearTimeout(ledgerTimer)
    },
    'session-team: pending timers',
  )

  // ---- 派活 ----

  /** 把一份汇报挂到该成员最早未完成的派活上。 */
  function linkReportToAssignment(team, report) {
    const task = assignments.find(candidate => candidate.teamId === team.id
      && candidate.sessionId === report.sessionId
      && (candidate.state === 'dispatched' || candidate.state === 'paused'))
    if (task === undefined) return
    task.lastReportId = report.id
    task.reportedAt = Date.now()
    if (report.state === 'done' || report.state === 'blocked') task.state = report.state
  }

  /** 解析派活目标：成员名、session id 或 all。 */
  function resolveTargets(team, target) {
    const text = String(target ?? '').trim()
    if (text === '' || text === 'all' || text === '*') {
      return team.members.filter(member => member.sessionId !== team.lead)
    }
    const byId = team.members.find(member => member.sessionId === text)
    if (byId) return [byId]
    if ((text === 'lead' || text === 'Lead' || text === '管理') && team.lead !== '') {
      return team.members.filter(member => member.sessionId === team.lead)
    }
    const lowered = text.toLowerCase()
    return team.members.filter(member => member.name.toLowerCase() === lowered)
  }

  /** 派活消息正文。 */
  function dispatchText(team, member, taskText) {
    const header = config.briefOnDispatch && !briefed.has(member.sessionId)
      ? `[团队协作] 团队「${team.name}」：你是成员 ${memberLabel(member)}，阶段 ${member.stage}。Lead 会话是 ${team.lead}。\n`
        + '任务完成后用 team_report 汇报（subject/body/state=done|blocked|progress）；Lead 空闲时会读到，不要直接给 Lead 发消息。\n---\n'
      : `[团队协作] ${memberLabel(member)}：\n`
    briefed.add(member.sessionId)
    return `${header}${taskText}`
  }

  /** 执行一次派活。 */
  async function dispatchTasks(team, tasks, mode, signal) {
    const results = []
    for (const task of tasks) {
      const targets = resolveTargets(team, task.target)
      if (targets.length === 0) {
        results.push({ sessionId: '', name: String(task.target ?? ''), ok: false, error: '没有匹配的成员' })
        continue
      }
      for (const member of targets) {
        try {
          await promptSession(member.sessionId, dispatchText(team, member, task.text), mode, signal)
          const seq = ++taskSeq
          assignments.push({
            id: `task-${Date.now()}-${seq}`,
            seq,
            teamId: team.id,
            sessionId: member.sessionId,
            name: member.name,
            subject: oneLine(task.text, 60),
            text: String(task.text ?? '').slice(0, 2000),
            dispatchedAt: Date.now(),
            state: 'dispatched',
            resumedAt: 0,
            resumeCount: 0,
            lastReportId: '',
          })
          scheduleLedgerSave()
          results.push({ sessionId: member.sessionId, name: member.name, ok: true, error: '' })
        } catch (error) {
          results.push({
            sessionId: member.sessionId,
            name: member.name,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    }
    return results
  }

  /** 恢复未完成任务。 */
  async function recoverAssignments(team, onlySessionId, dryRun, signal) {
    const summaries = await sessionSummaries(signal)
    const now = Date.now()
    const results = []
    const open = assignments.filter(task => task.teamId === team.id
      && (task.state === 'dispatched' || task.state === 'paused'))
    for (const task of open) {
      if (onlySessionId !== '' && task.sessionId !== onlySessionId) continue
      const member = team.members.find(candidate => candidate.sessionId === task.sessionId)
      if (member === undefined) {
        results.push({ sessionId: task.sessionId, name: task.name, subject: task.subject, ok: false, skipped: '', error: '成员已不在团队里' })
        continue
      }
      const stale = await assignmentStale(task, summaries, now)
      if (!stale) {
        results.push({ sessionId: task.sessionId, name: member.name, subject: task.subject, ok: true, skipped: 'running', error: '' })
        continue
      }
      if (dryRun) {
        results.push({ sessionId: task.sessionId, name: member.name, subject: task.subject, ok: true, skipped: 'dry-run', error: '' })
        continue
      }
      try {
        await promptSession(task.sessionId, recoveryText(team, member, task), 'queue', signal ?? idleSignal())
        task.state = 'dispatched'
        task.resumedAt = now
        task.resumeCount = Number(task.resumeCount ?? 0) + 1
        scheduleLedgerSave()
        results.push({ sessionId: task.sessionId, name: member.name, subject: task.subject, ok: true, skipped: '', error: '' })
      } catch (error) {
        results.push({
          sessionId: task.sessionId,
          name: member.name,
          subject: task.subject,
          ok: false,
          skipped: '',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return results
  }

  /** 恢复提示正文。 */
  function recoveryText(team, member, task) {
    const when = new Date(Number(task.dispatchedAt) || Date.now()).toLocaleString('zh-CN', { hour12: false })
    return `[团队恢复] 团队「${team.name}」：你手上还有一项任务「${task.subject}」（派发于 ${when}），`
      + '上一回合被中断或长时间没有进展（DSH 重启、回合中止都会这样）。\n'
      + '不要从头重做：先用 team_report 汇报你实际做到哪一步（state=progress|done|blocked），'
      + '再从停下的位置继续完成剩余部分；全部完成后用 state=done 汇报。\n'
      + `---\n${String(task.text ?? '').slice(0, 1200)}`
  }

  /** 一条台账任务是否可能被中断。 */
  async function assignmentStale(task, summaries, now) {
    const summary = summaries?.get(task.sessionId)
    if (summary?.running === true) return false
    if (summary !== undefined && summary.agentAvailable !== true) return true
    if (summary?.agentAvailable === true) {
      const exact = await sessionState(task.sessionId)
      if (exact !== null && exact.queued > 0) return false
    }
    return now - Number(task.dispatchedAt || 0) > config.resumeStaleMs
  }

  /** Lead 启动说明。 */
  function leadBrief(team) {
    const list = team.members
      .map((member, index) => `${index + 1}. ${memberLabel(member)} · 阶段 ${member.stage} · ${member.sessionId}`)
      .join('\n')
    return `[团队协作] 你是团队「${team.name}」的 Lead。\n成员：\n${list}\n\n`
      + '工具：team_roster 看全员状态；team_dispatch 派活（target 写成员名 / session id / all）；'
      + 'team_collect 读汇报。成员用 team_report 汇报，汇报会在我这里排队，只在你空闲时按「阶段→先后」成批送达，'
      + '不会插入你正在处理的回合。不要逐条回复汇报者；需要推动流程时用 team_dispatch。'
  }

  // ---- 新建团队 ----

  /** 新建团队：为每一行新建会话，可选设模型/改标题，最后落库。 */
  async function createTeam(request, signal) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.create !== 'function') {
      throw new Error('sessionController 不可用，无法新建会话')
    }
    const name = String(request?.name ?? request?.teamName ?? '').trim() || config.teamName || '新团队'
    const cwd = String(request?.cwd ?? '').trim()
    if (cwd === '') throw new Error('需要指定工作目录（cwd）')
    if (!cwd.startsWith('/')) throw new Error('工作目录必须是绝对路径')
    const rows = Array.isArray(request?.members) ? request.members : []
    if (rows.length === 0) throw new Error('至少需要一个成员')
    const workspace = await workspaceFor(cwd, name)
    const created = []
    for (const [index, row] of rows.entries()) {
      const memberName = String(row?.name ?? '').trim() || `成员 ${index + 1}`
      const role = String(row?.role ?? '').trim()
      const stage = Number.isFinite(row?.stage) ? Number(row.stage) : index + 1
      let sessionId
      try {
        const value = await controller.create({
          cwd,
          ...(workspace === null ? {} : { workspaceId: workspace.id }),
          ...(typeof row?.agentPreset === 'string' && row.agentPreset !== '' ? { agentPreset: row.agentPreset } : {}),
        })
        sessionId = value.sessionId
      } catch (error) {
        throw new Error(`创建成员「${memberName}」的会话失败：${error instanceof Error ? error.message : String(error)}`)
      }
      let modelError = ''
      if (typeof row?.provider === 'string' && row.provider !== ''
        && typeof row?.model === 'string' && row.model !== '') {
        try {
          await selectMemberModel({ sessionId, name: memberName }, row.provider, row.model, row.reasoningEffort ?? '', signal)
        } catch (error) {
          modelError = error instanceof Error ? error.message : String(error)
        }
      }
      if (typeof controller.rename === 'function') {
        try {
          await controller.rename({ sessionId, title: `${name} · ${memberName}` })
        } catch { /* 标题只是展示用 */ }
      }
      created.push({ sessionId, name: memberName, role, stage, lead: row?.lead === true, modelError })
    }
    const lead = created.find(item => item.lead)?.sessionId ?? created[0]?.sessionId ?? ''
    const team = normalizeTeam({
      id: `team-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      cwd,
      lead,
      members: created.map(item => ({
        sessionId: item.sessionId,
        name: item.name,
        role: item.role,
        stage: item.stage,
      })),
      createdAt: Date.now(),
    }, teams.length)
    teams.push(team)
    activeTeamId = team.id
    scheduleTeamsSave()
    if (workspace !== null) {
      await attachSessionsToWorkspace(workspace, created.map(item => item.sessionId))
    }
    scheduleDelivery(team, false)
    const leadName = team.members.find(member => member.sessionId === team.lead)?.name ?? ''
    queueRosterNotice(team, `团队已创建，Lead 是「${leadName}」。`, team.members.map(member => member.sessionId))
    return {
      team: { id: team.id, name: team.name, lead: team.lead, cwd: team.cwd },
      created: created.map(item => ({
        sessionId: item.sessionId,
        name: item.name,
        role: item.role,
        stage: item.stage,
        lead: item.sessionId === team.lead,
        modelError: item.modelError,
      })),
    }
  }

  /** 在已有团队里新建智能体角色（等价于新建 session，可批量）。 */
  async function createMembers(team, request, signal) {
    const controller = ctx.get('sessionController')
    if (!controller || typeof controller.create !== 'function') {
      throw new Error('sessionController 不可用，无法新建会话')
    }
    const rows = Array.isArray(request?.items)
      ? request.items
      : (request?.name !== undefined ? [request] : [])
    if (rows.length === 0) throw new Error('至少填一行成员')
    const cwd = String(request?.cwd ?? '').trim() || team.cwd
    if (cwd === '') throw new Error('需要指定工作目录（cwd）')
    if (!cwd.startsWith('/')) throw new Error('工作目录必须是绝对路径')
    if (team.cwd === '') team.cwd = cwd
    const workspace = await workspaceFor(cwd, team.name)
    const created = []
    let leadSessionId = ''
    for (const [index, row] of rows.entries()) {
      const name = String(row?.name ?? '').trim() || `成员 ${team.members.length + index + 1}`
      const role = String(row?.role ?? '').trim()
      const stage = Number.isFinite(row?.stage) ? Number(row.stage) : team.members.length + index + 1
      const value = await controller.create({
        cwd,
        ...(workspace === null ? {} : { workspaceId: workspace.id }),
        ...(typeof row?.agentPreset === 'string' && row.agentPreset !== '' ? { agentPreset: row.agentPreset } : {}),
      })
      const sessionId = value.sessionId
      let modelError = ''
      if (typeof row?.provider === 'string' && row.provider !== ''
        && typeof row?.model === 'string' && row.model !== '') {
        try {
          await selectMemberModel({ sessionId, name }, row.provider, row.model, row.reasoningEffort ?? '', signal)
        } catch (error) {
          modelError = error instanceof Error ? error.message : String(error)
        }
      }
      if (typeof controller.rename === 'function') {
        try {
          await controller.rename({ sessionId, title: `${team.name} · ${name}` })
        } catch { /* 标题只是展示用 */ }
      }
      team.members.push({ sessionId, name, role, stage })
      if (row?.lead === true && leadSessionId === '') leadSessionId = sessionId
      created.push({ sessionId, name, role, stage, modelError })
    }
    if (leadSessionId !== '') team.lead = leadSessionId
    scheduleTeamsSave()
    if (workspace !== null) {
      await attachSessionsToWorkspace(workspace, created.map(item => item.sessionId))
    }
    const names = created.map(item => `${item.name}${item.role === '' ? '' : `（${item.role}）`}`).join('、')
    queueRosterNotice(team, `新增成员：${names}。`, created.map(item => item.sessionId))
    return { created }
  }

  // ---- 工具 ----

  const leadOnly = context => teams.some(team => team.lead !== '' && team.lead === context.agent.id)
  const memberOnly = context => teams.some(team => team.lead !== context.agent.id
    && team.members.some(member => member.sessionId === context.agent.id))

  /** 从调用者解析团队；工具内部用。 */
  function requireTeam(agentId, toolName) {
    const team = teamForAgent(agentId)
    if (team === null) throw new Error(`${toolName}：当前会话不属于任何团队（先在面板里加入）`)
    return team
  }

  const rosterOutput = {
    type: 'object',
    additionalProperties: false,
    required: ['team', 'lead', 'pendingReports', 'members'],
    properties: {
      team: { type: 'string' },
      lead: { type: 'string' },
      pendingReports: { type: 'integer' },
      members: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['sessionId', 'name', 'role', 'stage', 'isLead', 'active', 'running', 'queued', 'pendingInput', 'reports'],
          properties: {
            sessionId: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            stage: { type: 'number' },
            isLead: { type: 'boolean' },
            active: { type: 'boolean' },
            running: { type: 'boolean' },
            queued: { type: 'integer' },
            pendingInput: { type: 'string' },
            reports: { type: 'integer' },
          },
        },
      },
    },
  }

  if (config.tool !== false && typeof ctx.get('tools')?.register === 'function') {
    const tools = ctx.get('tools')
    const register = (definition, label, when) => {
      ctx.effect(() => tools.register(definition, when === undefined ? {} : { when }), label)
    }

    register({
      name: 'team_roster',
      description: 'List the caller\'s team: the Lead, every member with live state, and how many reports are waiting.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: {
        schema: rosterOutput,
        render: (_args, value) => [{
          type: 'text',
          text: `Team "${value.team}" — lead ${value.lead}; ${value.members.length} members; ${value.pendingReports} unread reports.`,
        }],
      },
      async execute(_args, exec) {
        const team = requireTeam(exec.agent?.id, 'team_roster')
        if (exec.agent.id !== team.lead) throw new Error('team_roster 只对 Lead 开放')
        const members = []
        const summaries = await sessionSummaries(exec.signal)
        for (const member of team.members) {
          const state = await memberState(member.sessionId, summaries, exec.signal)
          members.push({
            sessionId: member.sessionId,
            name: member.name,
            role: member.role,
            stage: member.stage,
            isLead: member.sessionId === team.lead,
            active: state?.active ?? false,
            running: state?.running ?? false,
            queued: state?.queued ?? 0,
            pendingInput: (state?.pendingInput ?? []).join(', '),
            reports: pendingReportsOf(team).filter(report => report.sessionId === member.sessionId).length,
          })
        }
        return { team: team.name, lead: team.lead, pendingReports: pendingReportsOf(team).length, members }
      },
    }, 'session-team: tool team_roster', leadOnly)

    register({
      name: 'team_dispatch',
      description: 'Send work to team members. Tasks run as normal turns in their own sessions; `mode: queue` (default) waits for their current turn, `steer` joins it.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['tasks'],
        properties: {
          tasks: {
            type: 'array',
            description: 'One entry per assignment; `target` is a member name, a session id, or all.',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['target', 'text'],
              properties: {
                target: { type: 'string', description: 'Member name, session id, or "all" (every non-lead member).' },
                text: { type: 'string', description: 'Complete instruction for that member.' },
              },
            },
          },
          mode: { type: 'string', enum: ['queue', 'steer'], default: 'queue', description: 'Delivery mode: queue waits for the current turn, steer joins it.' },
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['results'],
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['sessionId', 'name', 'ok', 'error'],
                properties: {
                  sessionId: { type: 'string' },
                  name: { type: 'string' },
                  ok: { type: 'boolean' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: value.results.map(result => result.ok
            ? `sent to ${result.name}`
            : `failed for ${result.name}: ${result.error}`).join('\n'),
        }],
      },
      async execute(args, exec) {
        const team = requireTeam(exec.agent?.id, 'team_dispatch')
        if (exec.agent.id !== team.lead) throw new Error('team_dispatch 只对 Lead 开放')
        if (team.members.length === 0) throw new Error('团队还没有成员')
        const mode = args.mode === 'steer' ? 'steer' : 'queue'
        return { results: await dispatchTasks(team, args.tasks, mode, exec.signal) }
      },
    }, 'session-team: tool team_dispatch', leadOnly)

    register({
      name: 'team_collect',
      description: 'Read the reports queued by team members, oldest stage first. Reports are removed from the queue once listed.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          limit: { type: 'integer', default: 20, description: 'Maximum reports to return, 1-50.' },
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['reports', 'remaining'],
          properties: {
            reports: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['from', 'role', 'stage', 'state', 'subject', 'body', 'createdAt'],
                properties: {
                  from: { type: 'string' },
                  role: { type: 'string' },
                  stage: { type: 'number' },
                  state: { type: 'string' },
                  subject: { type: 'string' },
                  body: { type: 'string' },
                  createdAt: { type: 'string' },
                },
              },
            },
            remaining: { type: 'integer' },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: value.reports.length === 0
            ? 'No unread reports.'
            : value.reports.map((report, index) =>
              `${index + 1}. ${report.from} [${report.state}] ${report.subject}\n${report.body}`).join('\n\n'),
        }],
      },
      async execute(args, exec) {
        const team = requireTeam(exec.agent?.id, 'team_collect')
        if (exec.agent.id !== team.lead) throw new Error('team_collect 只对 Lead 开放')
        const limit = Math.min(50, Math.max(1, Number.isFinite(args.limit) ? Math.trunc(args.limit) : 20))
        const pending = pendingReportsOf(team).slice().sort(sortByOrder)
        const batch = pending.slice(0, limit)
        for (const report of batch) {
          report.delivered = true
          report.deliveredAt = Date.now()
        }
        scheduleLedgerSave()
        return {
          reports: batch.map(report => ({
            from: report.name,
            role: report.role,
            stage: report.stage,
            state: report.state,
            subject: report.subject,
            body: oneLine(report.body, 2000),
            createdAt: report.createdAt,
          })),
          remaining: pendingReportsOf(team).length,
        }
      },
    }, 'session-team: tool team_collect', leadOnly)

    register({
      name: 'team_report',
      description: 'Report progress or a result back to your team Lead. The report is queued here and reaches the Lead in order when it is idle; nobody interrupts its current turn.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['subject', 'body'],
        properties: {
          subject: { type: 'string', description: 'One-line summary of what you did or found.' },
          body: { type: 'string', description: 'Details the Lead needs: result, files, blockers, next step.' },
          state: { type: 'string', enum: ['progress', 'done', 'blocked'], default: 'done', description: 'progress keeps the task open; done finishes it; blocked needs a decision.' },
          stage: { type: 'integer', description: 'Optional stage override for delivery ordering; defaults to your member stage.' },
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['queued', 'position', 'pendingForLead'],
          properties: {
            queued: { type: 'boolean' },
            position: { type: 'integer' },
            pendingForLead: { type: 'integer' },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: value.queued
            ? `Report queued for the Lead (${value.position} ahead of it). It is delivered when the Lead is idle.`
            : 'Report was not queued.',
        }],
      },
      async execute(args, exec) {
        if (!exec.agent) throw new Error('team_report 需要一个会话上下文')
        const team = requireTeam(exec.agent.id, 'team_report')
        if (exec.agent.id === team.lead) throw new Error('Lead 不需要用 team_report 汇报给自己')
        const member = team.members.find(item => item.sessionId === exec.agent.id)
        if (!member) throw new Error(`当前会话 ${exec.agent.id} 不在团队名单里`)
        const subject = String(args.subject ?? '').trim()
        const body = String(args.body ?? '').trim()
        if (subject === '') throw new Error('subject 不能为空')
        const stage = Number.isFinite(args.stage) ? Number(args.stage) : member.stage
        const report = {
          id: `report-${Date.now()}-${++reportSeq}`,
          seq: reportSeq,
          teamId: team.id,
          sessionId: member.sessionId,
          name: member.name,
          role: member.role,
          stage,
          state: ['progress', 'done', 'blocked'].includes(args.state) ? args.state : 'done',
          subject,
          body,
          createdAt: new Date().toISOString(),
          delivered: false,
          deliveredAt: 0,
        }
        reports.push(report)
        if (reports.length > MAX_REPORTS) reports.splice(0, reports.length - MAX_REPORTS)
        linkReportToAssignment(team, report)
        scheduleLedgerSave()
        scheduleDelivery(team, false)
        return {
          queued: true,
          position: pendingReportsOf(team).filter(item => item !== report).length,
          pendingForLead: pendingReportsOf(team).length,
        }
      },
    }, 'session-team: tool team_report', memberOnly)

    register({
      name: 'team_recover',
      description: 'Resume assignments that were interrupted (DSH restart, aborted turn) or stopped without a report. Sends each affected member a "report where you are, then continue from there" message.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          member: { type: 'string', description: 'Member name or session id to recover only that member.' },
          dry_run: { type: 'boolean', default: false, description: 'Report which assignments would be resumed without sending anything.' },
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['results'],
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['sessionId', 'name', 'subject', 'ok', 'skipped', 'error'],
                properties: {
                  sessionId: { type: 'string' },
                  name: { type: 'string' },
                  subject: { type: 'string' },
                  ok: { type: 'boolean' },
                  skipped: { type: 'string' },
                  error: { type: 'string' },
                },
              },
            },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: value.results.length === 0
            ? 'No open assignments to recover.'
            : value.results.map(result => result.ok
              ? (result.skipped === '' ? `resumed ${result.name}: ${result.subject}` : `skipped ${result.name} (${result.skipped})`)
              : `failed for ${result.name}: ${result.error}`).join('\n'),
        }],
      },
      async execute(args, exec) {
        const team = requireTeam(exec.agent?.id, 'team_recover')
        if (exec.agent.id !== team.lead) throw new Error('team_recover 只对 Lead 开放')
        const wanted = typeof args.member === 'string' ? args.member.trim() : ''
        const only = wanted === '' ? '' : (resolveTargets(team, wanted)[0]?.sessionId ?? '')
        if (wanted !== '' && only === '') throw new Error(`没有匹配的成员：${wanted}`)
        return { results: await recoverAssignments(team, only, args.dry_run === true, exec.signal) }
      },
    }, 'session-team: tool team_recover', leadOnly)

    register({
      name: 'team_models',
      description: 'List the models this deployment can currently route (provider, model, reasoning efforts). Pass member + provider + model to switch one member session to that model for its next turn.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          member: { type: 'string', description: 'Member name or session id to switch; required together with provider and model.' },
          provider: { type: 'string', description: 'Provider id from the listed catalog.' },
          model: { type: 'string', description: 'Model id under that provider.' },
          reasoning_effort: { type: 'string', description: 'Optional reasoning effort id accepted by that model.' },
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['providers'],
          properties: {
            providers: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['id', 'name', 'models'],
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  models: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['id', 'name', 'efforts'],
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        efforts: { type: 'array', items: { type: 'string' } },
                      },
                    },
                  },
                },
              },
            },
            defaultModel: {
              type: 'object',
              additionalProperties: false,
              required: ['provider', 'model'],
              properties: { provider: { type: 'string' }, model: { type: 'string' } },
            },
            assigned: {
              type: 'object',
              additionalProperties: false,
              required: ['sessionId', 'name', 'provider', 'model'],
              properties: {
                sessionId: { type: 'string' },
                name: { type: 'string' },
                provider: { type: 'string' },
                model: { type: 'string' },
                reasoningEffort: { type: 'string' },
              },
            },
          },
        },
        render: (_args, value) => [{
          type: 'text',
          text: (value.assigned === undefined
            ? `Available models:\n${value.providers.map(provider =>
              `${provider.name} (${provider.id}): ${provider.models.map(model => model.id).join(', ')}`).join('\n')}`
            : `Switched ${value.assigned.name} to ${value.assigned.provider}/${value.assigned.model}${value.assigned.reasoningEffort === undefined ? '' : ` (${value.assigned.reasoningEffort})`}; it applies from that session's next turn.`),
        }],
      },
      async execute(args, exec) {
        const team = requireTeam(exec.agent?.id, 'team_models')
        if (exec.agent.id !== team.lead) throw new Error('team_models 只对 Lead 开放')
        const snapshot = await modelSnapshot(false)
        if (snapshot === null) throw new Error('模型目录不可用：当前部署没有提供 modelCatalog')
        const providers = snapshot.providers.map(provider => ({
          id: provider.id,
          name: provider.name,
          models: provider.models.map(model => ({
            id: model.id,
            name: model.name,
            efforts: model.efforts.map(effort => effort.id),
          })),
        }))
        const wanted = typeof args.member === 'string' ? args.member.trim() : ''
        const provider = typeof args.provider === 'string' ? args.provider.trim() : ''
        const model = typeof args.model === 'string' ? args.model.trim() : ''
        if (wanted === '' && provider === '' && model === '') {
          return { providers, defaultModel: snapshot.default }
        }
        if (wanted === '' || provider === '' || model === '') {
          throw new Error('切换模型需要同时给出 member、provider、model')
        }
        const member = resolveTargets(team, wanted)[0]
        if (!member) throw new Error(`没有匹配的成员：${wanted}`)
        const selected = await selectMemberModel(
          member,
          provider,
          model,
          typeof args.reasoning_effort === 'string' ? args.reasoning_effort : '',
          exec.signal,
        )
        return {
          providers,
          defaultModel: snapshot.default,
          assigned: {
            sessionId: member.sessionId,
            name: member.name,
            provider: selected.provider,
            model: selected.model,
            ...(selected.reasoningEffort === '' ? {} : { reasoningEffort: selected.reasoningEffort }),
          },
        }
      },
    }, 'session-team: tool team_models', leadOnly)
  }

  // ---- Web 路由 ----

  /** 读取 JSON 请求体。 */
  async function readJsonBody(req) {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (chunks.length === 0) return {}
    const text = Buffer.concat(chunks).toString('utf8')
    return text === '' ? {} : JSON.parse(text)
  }

  if (config.routePath !== '') {
    ctx.inject(['webServer'], webCtx => {
      const route = (path, handle, label) => {
        webCtx.effect(
          () => webCtx.webServer.register({
            kind: 'exact',
            path,
            handler: async (req, res) => {
              const controller = new AbortController()
              res.once('close', () => {
                if (!res.writableEnded) controller.abort(new Error('client closed'))
              })
              let payload
              try {
                payload = await handle(req, controller.signal)
              } catch (error) {
                payload = {
                  ok: false,
                  error: {
                    code: 'SESSION_TEAM_FAILED',
                    message: error instanceof Error ? error.message : String(error),
                  },
                }
              }
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
              res.end(JSON.stringify(payload))
            },
          }),
          label,
        )
      }

      const catalogCache = { at: 0, value: null }
      const CATALOG_TTL_MS = 20_000

      /** 选择器数据：id + 标题 + 目录 + 是否在线。 */
      async function sessionCatalog(signal, force) {
        if (!force && catalogCache.value !== null && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
          return catalogCache.value
        }
        const value = await readSessionCatalog(signal)
        catalogCache.at = Date.now()
        catalogCache.value = value
        return value
      }

      /** 真正读取选择器数据。 */
      async function readSessionCatalog(signal) {
        const query = ctx.get('sessionQuery')
        const controller = ctx.get('sessionController')
        let ids = []
        const records = new Map()
        if (query && typeof query.listSessions === 'function') {
          try {
            for (const record of await query.listSessions(signal)) {
              ids.push(record.header.id)
              records.set(record.header.id, record)
            }
          } catch { /* 退回 controller.list */ }
        }
        if (ids.length === 0 && controller && typeof controller.list === 'function') {
          try {
            const value = await controller.list({}, signal)
            ids = value.items.map(item => item.sessionId)
            for (const item of value.items) {
              records.set(item.sessionId, { header: { id: item.sessionId, cwd: item.cwd }, live: item.agentAvailable })
            }
          } catch { /* 保持空列表 */ }
        }
        ids = ids.slice(0, 300)
        const titles = new Map()
        if (query && typeof query.readTitleSnapshots === 'function' && ids.length > 0) {
          try {
            for (const result of await query.readTitleSnapshots(ids, signal)) {
              if (result.status === 'fulfilled' && result.value.title) titles.set(result.sessionId, result.value.title.title)
            }
          } catch { /* 标题读不到就不显示 */ }
        }
        const memberIds = new Set(teams.flatMap(team => team.members.map(member => member.sessionId)))
        const leadIds = new Set(teams.map(team => team.lead).filter(Boolean))
        return ids.map(sessionId => {
          const record = records.get(sessionId)
          return {
            sessionId,
            title: titles.get(sessionId) ?? '',
            cwd: record?.header?.cwd ?? '',
            live: record?.live === true,
            member: memberIds.has(sessionId),
            lead: leadIds.has(sessionId),
          }
        })
      }

      /** 某个团队的详细快照。 */
      async function teamDetail(team, signal) {
        const summaries = await sessionSummaries(signal)
        const members = []
        for (const member of team.members) {
          const state = await memberState(member.sessionId, summaries, signal)
          members.push({
            sessionId: member.sessionId,
            name: member.name,
            role: member.role,
            stage: member.stage,
            lead: member.sessionId === team.lead,
            active: state?.active ?? false,
            running: state?.running ?? false,
            queued: state?.queued ?? 0,
            pendingInput: state?.pendingInput ?? [],
            model: await memberModel(member.sessionId, signal),
            unread: pendingReportsOf(team).filter(report => report.sessionId === member.sessionId).length,
          })
        }
        const nowMs = Date.now()
        const teamTasks = assignments.filter(task => task.teamId === team.id)
        const tasks = await Promise.all(teamTasks
          .slice(-50)
          .map(async task => {
            const summary = summaries?.get(task.sessionId)
            const open = task.state === 'dispatched' || task.state === 'paused'
            return {
              id: task.id,
              sessionId: task.sessionId,
              name: task.name,
              subject: task.subject,
              state: task.state,
              running: summary?.running === true,
              stale: open ? await assignmentStale(task, summaries, nowMs) : false,
              dispatchedAt: new Date(Number(task.dispatchedAt) || 0).toISOString(),
              resumedAt: Number(task.resumedAt) > 0 ? new Date(Number(task.resumedAt)).toISOString() : '',
              resumeCount: Number(task.resumeCount ?? 0),
            }
          }))
        return {
          id: team.id,
          name: team.name,
          cwd: team.cwd,
          lead: team.lead,
          members,
          openTasks: teamTasks.filter(task => task.state === 'dispatched' || task.state === 'paused').length,
          taskTotal: teamTasks.length,
          tasks,
          pendingReports: pendingReportsOf(team).length,
          reportTotal: reports.filter(report => report.teamId === team.id).length,
          pendingNotices: pendingNoticesOf(team).length,
          notices: notices.filter(notice => notice.teamId === team.id).slice(-10).map(notice => ({
            createdAt: notice.createdAt,
            delivered: notice.delivered,
            text: oneLine(notice.text, 300),
          })),
          reports: reports.filter(report => report.teamId === team.id).slice(-50).map(report => ({
            sessionId: report.sessionId,
            from: report.name,
            role: report.role,
            stage: report.stage,
            state: report.state,
            subject: report.subject,
            body: oneLine(report.body, 400),
            createdAt: report.createdAt,
            delivered: report.delivered,
          })),
        }
      }

      /** 团队列表摘要。 */
      async function teamSummaries(signal) {
        const summaries2 = await sessionSummaries(signal)
        return teams.map(team => {
          const leadMember = team.members.find(member => member.sessionId === team.lead)
          const running = team.members.filter(member => summaries2?.get(member.sessionId)?.running === true).length
          return {
            id: team.id,
            name: team.name,
            cwd: team.cwd,
            lead: team.lead,
            leadName: leadMember?.name ?? '',
            memberCount: team.members.length,
            runningCount: running,
            openTasks: assignments.filter(task => task.teamId === team.id
              && (task.state === 'dispatched' || task.state === 'paused')).length,
            pendingReports: pendingReportsOf(team).length,
          }
        })
      }

      /** 面板快照。 */
      async function buildState(signal, probe, teamId) {
        const started = Date.now()
        const teamsStarted = Date.now()
        const list = await teamSummaries(signal)
        const selected = teamById(teamId) ?? activeTeam()
        const models = await modelSnapshot(probe === true)
        const team = selected === null ? null : await teamDetail(selected, signal)
        let workspaces = []
        try {
          const registry = ctx.get('workspaceRegistry')
          if (registry && typeof registry.list === 'function') {
            workspaces = registry.list().map(workspace => ({
              id: workspace.id,
              title: workspace.title,
              path: workspace.path,
              sessions: (workspace.sessionIds ?? []).length,
            }))
          }
        } catch { /* 保持空 */ }
        let defaultCwd = selected?.cwd ?? ''
        if (defaultCwd === '') defaultCwd = workspaces[0]?.path ?? ''
        if (defaultCwd === '') {
          try {
            const directory = ctx.get('workingDirectory')
            if (directory && typeof directory.defaultDirectory === 'string') defaultCwd = directory.defaultDirectory
          } catch { /* 保持空 */ }
        }
        return {
          ok: true,
          activeTeamId: selected?.id ?? '',
          teams: list,
          team,
          defaultCwd,
          workspaces,
          models,
          presets: await presetCatalog(),
          sessions: await sessionCatalog(signal, probe === true),
          creations: {
            canCreate: typeof ctx.get('sessionController')?.create === 'function',
            canRename: typeof ctx.get('sessionController')?.rename === 'function',
          },
          timings: { teamsMs: teamsStarted - started, detailMs: Date.now() - teamsStarted },
          writable: true,
          version: await readVersion(),
          debug: {
            teams: teams.length,
            ledgerReports: reports.length,
            assignments: assignments.length,
            ...(lastLayout === null ? {} : { layout: lastLayout }),
          },
          limits: { maxReportsPerDigest: config.maxReportsPerDigest, deliverOnIdle: config.deliverOnIdle },
        }
      }

      /** 解析操作目标团队。 */
      function targetTeam(body) {
        const id = typeof body?.teamId === 'string' && body.teamId !== '' ? body.teamId : activeTeamId
        const team = teamById(id)
        if (team === null) throw new Error('没有这个团队')
        return team
      }

      /** 保存团队清单并同步 activeTeamId。 */
      function persistActive(id) {
        if (teamById(id) !== null) activeTeamId = id
        scheduleTeamsSave()
      }

      /** 名单类操作。 */
      async function rosterAction(team, body) {
        const members = team.members.map(member => ({ ...member }))
        const find = sessionId => members.find(member => member.sessionId === sessionId)
        switch (body.kind) {
          case 'add-member':
          case 'add-members': {
            const items = body.kind === 'add-member'
              ? [body]
              : (Array.isArray(body.items) ? body.items : [])
            const added = []
            for (const item of items) {
              const sessionId = String(item?.sessionId ?? '').trim()
              if (sessionId === '' || find(sessionId)) continue
              const member = {
                sessionId,
                name: (typeof item?.name === 'string' ? item.name.trim() : '') || `成员 ${members.length + 1}`,
                role: typeof item?.role === 'string' ? item.role.trim() : '',
                stage: Number.isFinite(item?.stage) ? Number(item.stage) : members.length + 1,
              }
              members.push(member)
              added.push(member)
            }
            team.members = members
            if (team.lead === '' && members.length > 0) team.lead = members[0].sessionId
            scheduleTeamsSave()
            if (added.length > 0) {
              const names = added.map(member => `${member.name}${member.role === '' ? '' : `（${member.role}）`}`).join('、')
              queueRosterNotice(team, `有已有会话加入团队：${names}。`, added.map(member => member.sessionId))
              const workspace = await workspaceFor(team.cwd, team.name)
              await attachSessionsToWorkspace(workspace, added.map(member => member.sessionId))
            }
            return { changed: true, members: members.length, lead: team.lead }
          }
          case 'update-member': {
            const member = find(String(body.sessionId ?? ''))
            if (!member) throw new Error('该会话不在团队里')
            if (typeof body.name === 'string' && body.name.trim() !== '') member.name = body.name.trim()
            if (typeof body.role === 'string') member.role = body.role.trim()
            if (Number.isFinite(body.stage)) member.stage = Number(body.stage)
            team.members = members
            scheduleTeamsSave()
            queueRosterNotice(team, `成员信息更新：${member.name}${member.role === '' ? '' : `（${member.role}）`}。`, [member.sessionId])
            return { changed: true }
          }
          case 'remove-member': {
            const sessionId = String(body.sessionId ?? '')
            const index = members.findIndex(member => member.sessionId === sessionId)
            if (index < 0) throw new Error('该会话不在团队里')
            const removed = members[index]
            members.splice(index, 1)
            team.members = members
            if (team.lead === sessionId) team.lead = members[0]?.sessionId ?? ''
            scheduleTeamsSave()
            queueRosterNotice(team, `成员已移除：${removed.name}。`)
            return { changed: true, members: members.length, lead: team.lead }
          }
          case 'set-lead': {
            const sessionId = String(body.sessionId ?? '')
            if (body.clear === true || sessionId === '') {
              team.lead = ''
            } else {
              if (!find(sessionId)) throw new Error('Lead 必须是团队成员')
              team.lead = sessionId
            }
            scheduleTeamsSave()
            return { changed: true, lead: team.lead }
          }
          default:
            throw new Error(`未知的名单操作 ${body.kind}`)
        }
      }

      /** 面板操作分发。 */
      async function action(body) {
        switch (body.kind) {
          case 'select-team': {
            const id = String(body.teamId ?? '')
            if (teamById(id) === null) throw new Error('没有这个团队')
            persistActive(id)
            return { ok: true, activeTeamId: id }
          }
          case 'create-team': {
            const created = await createTeam(body, idleSignal())
            return { ok: true, ...created }
          }
          case 'watch': {
            const sessionId = String(body.sessionId ?? '').trim()
            if (sessionId === '') throw new Error('缺少 sessionId')
            return startWatch(sessionId)
          }
          case 'unwatch': {
            return stopWatch(String(body.sessionId ?? '').trim())
          }
          case 'message': {
            const sessionId = String(body.sessionId ?? '').trim()
            if (sessionId === '') throw new Error('缺少 sessionId')
            return sendMessage(sessionId, body.text, body.mode, idleSignal())
          }
          case 'cancel': {
            const sessionId = String(body.sessionId ?? '').trim()
            if (sessionId === '') throw new Error('缺少 sessionId')
            const controller = ctx.get('sessionController')
            if (!controller || typeof controller.cancel !== 'function') throw new Error('sessionController.cancel 不可用')
            await controller.cancel({ sessionId })
            return { ok: true, sessionId }
          }
          case 'rename-session': {
            const sessionId = String(body.sessionId ?? '').trim()
            const title = String(body.title ?? '').trim()
            if (sessionId === '' || title === '') throw new Error('需要 sessionId 和 title')
            const controller = ctx.get('sessionController')
            if (!controller || typeof controller.rename !== 'function') throw new Error('sessionController.rename 不可用')
            const value = await controller.rename({ sessionId, title })
            return { ok: true, title: value?.title ?? title }
          }
          case 'archive-session': {
            const sessionId = String(body.sessionId ?? '').trim()
            if (sessionId === '') throw new Error('缺少 sessionId')
            const registry = ctx.get('workspaceRegistry')
            if (!registry || typeof registry.archiveSession !== 'function') throw new Error('workspaceRegistry.archiveSession 不可用')
            await registry.archiveSession(sessionId, { stopActivity: true })
            return { ok: true, sessionId }
          }
          case 'layout': {
            // 面板实机尺寸回传（仅用于排查布局问题，不参与业务）。
            if (body.metrics !== undefined && body.metrics !== null) lastLayout = body.metrics
            return { ok: true }
          }
          case 'attach-workspace': {
            const team = targetTeam(body)
            if (team.cwd === '') throw new Error('团队还没有工作目录')
            const workspace = await workspaceFor(team.cwd, team.name)
            if (workspace === null) throw new Error('workspaceRegistry 不可用，无法归入项目分组')
            const result = await attachSessionsToWorkspace(workspace, team.members.map(member => member.sessionId))
            return { ok: true, workspaceId: workspace.id, title: workspace.title, ...result }
          }
          case 'delete-team': {
            const id = String(body.teamId ?? '')
            const index = teams.findIndex(team => team.id === id)
            if (index < 0) throw new Error('没有这个团队')
            teams.splice(index, 1)
            if (activeTeamId === id) activeTeamId = teams[0]?.id ?? ''
            for (const report of reports) if (report.teamId === id) report.delivered = true
            for (const notice of notices) if (notice.teamId === id) notice.delivered = true
            for (const task of assignments) {
              if (task.teamId === id && (task.state === 'dispatched' || task.state === 'paused')) task.state = 'done'
            }
            scheduleTeamsSave()
            scheduleLedgerSave()
            return { ok: true, activeTeamId }
          }
          case 'rename-team': {
            const team = targetTeam(body)
            const name = String(body.name ?? '').trim()
            if (name === '') throw new Error('团队名不能为空')
            team.name = name
            scheduleTeamsSave()
            return { ok: true, name }
          }
          case 'reorder-members': {
            const team = targetTeam(body)
            const order = Array.isArray(body.order) ? body.order.filter(id => typeof id === 'string') : []
            if (order.length === 0) throw new Error('order 不能为空')
            const remaining = new Map(team.members.map(member => [member.sessionId, member]))
            const next = []
            for (const id of order) {
              const member = remaining.get(id)
              if (member !== undefined) {
                next.push(member)
                remaining.delete(id)
              }
            }
            for (const member of remaining.values()) next.push(member)
            next.forEach((member, index) => { member.stage = index })
            team.members = next
            scheduleTeamsSave()
            return {
              ok: true,
              members: next.map(member => ({ sessionId: member.sessionId, name: member.name, stage: member.stage })),
            }
          }
          case 'create-member':
          case 'create-members': {
            // 在已有团队里新建智能体角色（等价于新建 session，可批量）。
            const team = targetTeam(body)
            const items = body.kind === 'create-members' && Array.isArray(body.items) ? body.items : [body]
            return { ok: true, ...(await createMembers(team, { cwd: body.cwd, items }, idleSignal())) }
          }
          case 'select-model': {
            const team = targetTeam(body)
            const member = team.members.find(candidate => candidate.sessionId === String(body.sessionId ?? ''))
            if (!member) throw new Error('该会话不在团队里')
            const provider = String(body.provider ?? '').trim()
            const model = String(body.model ?? '').trim()
            if (provider === '' || model === '') throw new Error('provider / model 不能为空')
            const selected = await selectMemberModel(
              member,
              provider,
              model,
              typeof body.reasoningEffort === 'string' ? body.reasoningEffort : '',
              idleSignal(),
            )
            return { ok: true, selected }
          }
          case 'recover': {
            const team = targetTeam(body)
            const only = typeof body.sessionId === 'string' ? body.sessionId : ''
            const results = await recoverAssignments(team, only, body.dryRun === true, idleSignal())
            return { ok: true, results }
          }
          case 'record-task': {
            const team = targetTeam(body)
            const sessionId = String(body.sessionId ?? '')
            const member = team.members.find(candidate => candidate.sessionId === sessionId)
            if (!member) throw new Error('该会话不在团队里')
            const seq = ++taskSeq
            const dispatchedAt = Number(body.dispatchedAt) > 0 ? Number(body.dispatchedAt) : Date.now()
            assignments.push({
              id: `task-${Date.now()}-${seq}`,
              seq,
              teamId: team.id,
              sessionId,
              name: member.name,
              subject: String(body.subject ?? '').trim() || '（未命名任务）',
              text: String(body.text ?? '').slice(0, 2000),
              dispatchedAt,
              state: 'dispatched',
              resumedAt: 0,
              resumeCount: 0,
              lastReportId: '',
            })
            scheduleLedgerSave()
            return { ok: true }
          }
          case 'dispatch': {
            const team = targetTeam(body)
            const tasks = (Array.isArray(body.tasks) ? body.tasks : []).map(task => ({
              target: String(task?.target ?? ''),
              text: String(task?.text ?? ''),
            }))
            if (tasks.length === 0) throw new Error('tasks 不能为空')
            const mode = body.mode === 'steer' ? 'steer' : 'queue'
            return { ok: true, results: await dispatchTasks(team, tasks, mode, idleSignal()) }
          }
          case 'collect': {
            const team = targetTeam(body)
            const pending = pendingReportsOf(team).slice().sort(sortByOrder)
            const limit = Math.min(100, Math.max(1, Number.isFinite(body.limit) ? Math.trunc(body.limit) : 50))
            const batch = pending.slice(0, limit)
            if (body.markRead === true) {
              for (const report of batch) {
                report.delivered = true
                report.deliveredAt = Date.now()
              }
              scheduleLedgerSave()
            }
            return {
              ok: true,
              reports: batch.map(report => ({
                from: report.name,
                role: report.role,
                stage: report.stage,
                state: report.state,
                subject: report.subject,
                body: report.body,
                createdAt: report.createdAt,
              })),
              remaining: pendingReportsOf(team).length,
            }
          }
          case 'flush': {
            const team = targetTeam(body)
            const reportsResult = await flushReports(team, true)
            const noticesResult = await flushNotices(team, true)
            return { ok: true, ...reportsResult, notices: noticesResult }
          }
          case 'brief-lead': {
            const team = targetTeam(body)
            if (team.lead === '') throw new Error('还没有 Lead')
            await promptSession(team.lead, leadBrief(team), 'queue', idleSignal())
            return { ok: true }
          }
          case 'add-member':
          case 'add-members':
          case 'update-member':
          case 'remove-member':
          case 'set-lead':
            return { ok: true, ...(await rosterAction(targetTeam(body), body)) }
          default:
            throw new Error(`未知操作 ${body.kind}`)
        }
      }

      route(`${config.routePath}/state`, async (req, signal) => {
        if (req.method !== 'GET') return { ok: false, error: 'GET only' }
        const probe = typeof req.url === 'string' && req.url.includes('probe=1')
        const query = typeof req.url === 'string' ? req.url.split('?')[1] ?? '' : ''
        const params = new URLSearchParams(query)
        const teamId = params.get('team') ?? ''
        return buildState(signal, probe, teamId)
      }, `session-team: GET ${config.routePath}/state`)

      route(`${config.routePath}/transcript`, async (req, signal) => {
        if (req.method !== 'GET') return { ok: false, error: 'GET only' }
        const query = typeof req.url === 'string' ? req.url.split('?')[1] ?? '' : ''
        const params = new URLSearchParams(query)
        const sessionId = String(params.get('session') ?? '').trim()
        if (sessionId === '') return { ok: false, error: '缺少 session 参数' }
        const limit = Math.min(60, Math.max(5, Number(params.get('limit') ?? 30) || 30))
        try {
          const value = await transcriptOf(sessionId, limit, signal)
          return { ok: true, ...value }
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) }
        }
      }, `session-team: GET ${config.routePath}/transcript`)

      route(`${config.routePath}/live`, async (req, signal) => {
        if (req.method !== 'GET') return { ok: false, error: 'GET only' }
        const query = typeof req.url === 'string' ? req.url.split('?')[1] ?? '' : ''
        const params = new URLSearchParams(query)
        const sessionId = String(params.get('session') ?? '').trim()
        if (sessionId === '') return { ok: false, error: '缺少 session 参数' }
        try {
          return await liveState(sessionId, signal)
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) }
        }
      }, `session-team: GET ${config.routePath}/live`)

      route(`${config.routePath}/action`, async req => {
        if (req.method !== 'POST') return { ok: false, error: 'POST only' }
        let body
        try {
          body = await readJsonBody(req)
        } catch {
          return { ok: false, error: 'invalid json body' }
        }
        return action(body)
      }, `session-team: POST ${config.routePath}/action`)
    })
  }
}
