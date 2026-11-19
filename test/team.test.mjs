/**
 * dsh-session-team Host 半的行为测试：名单、汇报排序、空闲投递、工具与面板路由。
 * 用假的 Cordis 上下文驱动，不接触任何真实会话。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, Config } from '../index.js'

/** 构造一个只实现插件用到的服务的假上下文。 */
async function harness(configInput, options = {}) {
  const stateDir = options.stateDir ?? await mkdtemp(join(tmpdir(), 'session-team-test-'))
  const config = Config({ stateDir, ...configInput })
  const prompts = []
  const tools = []
  const routes = new Map()
  const listeners = new Map()
  const status = new Map()
  let currentConfig = {}
  let savedConfig = null

  const selections = new Map()
  const cancels = []
  const createdRequests = []
  let createdSessions = 0
  const presetList = [
    { id: 'ptc', name: 'PTC 模式', order: 2 },
    { id: 'standard', name: '标准模式', order: 1 },
  ]
  const catalog = {
    default: { provider: 'p1', model: 'm1' },
    routableProviders: ['p1'],
    groups: [
      {
        id: 'p1',
        name: 'Provider 1',
        models: [
          { id: 'm1', name: 'Model 1', reasoning: { efforts: [{ id: 'high', name: 'High' }], defaultEffort: 'high' } },
          { id: 'm2', name: 'Model 2' },
        ],
      },
    ],
    failures: [],
  }
  const controller = {
    async modelCatalog() {
      return catalog
    },
    async projections({ sessionId }) {
      return {
        kind: 'sequenced',
        asOfSeq: 0,
        values: selections.has(sessionId)
          ? { modelSelection: { lastUsed: selections.get(sessionId), next: null } }
          : {},
      }
    },
    async create(request = {}) {
      createdRequests.push(request)
      createdSessions += 1
      return { sessionId: `session-new-${createdSessions}` }
    },
    async rename(request) {
      return { title: request.title, seq: 0 }
    },
    async resolveAgent(sessionId) {
      return {
        agent: {
          id: sessionId,
          model: {
            select(selection) {
              selections.set(sessionId, selection)
            },
          },
        },
      }
    },
    async state({ sessionId }) {
      const entry = status.get(sessionId) ?? { active: false, running: false }
      return {
        active: entry.active,
        running: entry.running,
        pendingInput: entry.pendingInput ?? [],
        queue: entry.queue ?? [],
      }
    },
    async prompt(request) {
      prompts.push(request)
      return { accepted: true }
    },
    async cancel(request) {
      cancels.push(request)
      return { accepted: true }
    },
    follow(_request, signal) {
      return (async function* generate() {
        yield {
          type: 'snapshot',
          header: { id: 'x' },
          cursor: 0,
          records: [],
          hasMore: false,
          projections: { asOfSeq: 0, values: {} },
          assistantStream: {
            revision: 1,
            activeAttempt: {
              attemptId: 'a1',
              startedAfterSeq: 0,
              turn: 1,
              step: 1,
              nextIndex: 0,
              stream: [{ type: 'text-delta', index: 0, text: '流式片段' }]
            }
          }
        }
        yield { type: 'assistant-stream', frame: { type: 'start', attemptId: 'a2', revision: 1, startedAfterSeq: 0, turn: 1, step: 1 } }
        yield { type: 'assistant-stream', frame: { type: 'chunk', attemptId: 'a2', revision: 1, index: 0, time: 1, chunk: { type: 'text-delta', index: 0, text: '输出中' } } }
        yield { type: 'assistant-stream', frame: { type: 'chunk', attemptId: 'a2', revision: 1, index: 1, time: 2, chunk: { type: 'tool-call-delta', index: 1, id: 'c9', name: 'read', argumentsDelta: '{}' } } }
        await new Promise(resolve => {
          if (signal.aborted) { resolve(); return }
          signal.addEventListener('abort', resolve)
          setTimeout(resolve, 200)
        })
      })()
    },
    async events() {
      return {
        records: [
          { type: 'event', event: { type: 'user/message', seq: 1, time: 1795000000000, data: { content: [{ type: 'text', text: '开始做首页' }] } } },
          {
            type: 'event',
            event: {
              type: 'assistant/message',
              seq: 2,
              time: 1795000001000,
              data: { message: { content: [{ type: 'text', text: '收到，先看目录' }, { type: 'tool-call', id: 'c1', name: 'read', arguments: '{}' }] } }
            }
          },
          { type: 'event', event: { type: 'tool/call', seq: 3, time: 1795000002000, data: { name: 'bash', arguments: '{"command":"ls"}' } } },
        ],
        cursor: 3,
        hasMore: false,
      }
    },
    async list() {
      return {
        items: [...status.entries()].map(([sessionId, entry]) => ({
          sessionId,
          agentAvailable: entry.active === true,
          running: entry.running === true,
          updatedAt: 0,
          blank: false,
        })),
      }
    },
  }
  const workspaces = []
  const workspaceRegistry = {
    async create(path, title) {
      const existing = workspaces.find(item => item.path === path)
      if (existing !== undefined) return existing
      const workspace = {
        id: `ws-${workspaces.length + 1}`,
        path,
        title: title ?? path,
        sessionIds: [],
        async attachSession(sessionId) {
          if (!this.sessionIds.includes(sessionId)) this.sessionIds.push(sessionId)
        },
      }
      workspaces.push(workspace)
      return workspace
    },
    list() {
      return workspaces
    },
  }
  const registrations = []
  const toolsService = {
    register(definition, options = {}) {
      tools.push(definition)
      registrations.push({ definition, options })
      return () => {}
    },
  }
  const webServer = {
    register(route) {
      routes.set(route.path, route.handler)
      return () => {}
    },
  }
  const editor = {
    entries: () => [{ id: 'session-team', name: 'dsh-session-team' }],
    async edit(_entry, change) {
      savedConfig = change(currentConfig, {})
      currentConfig = savedConfig
    },
  }
  const webCtx = {
    effect(fn) { return fn() },
    webServer,
  }
  const exposeEditor = options.editor !== false
  const ctx = {
    webServer,
    configEditor: exposeEditor ? editor : undefined,
    get(name) {
      if (name === 'tools') return toolsService
      if (name === 'sessionController') return controller
      if (name === 'configEditor') return exposeEditor ? editor : undefined
      if (name === 'webServer') return webServer
      if (name === 'agentPresets') return { async list() { return presetList } }
      if (name === 'workspaceRegistry') return workspaceRegistry
      return undefined
    },
    effect(fn) {
      const disposer = fn()
      return () => disposer?.()
    },
    on(name, fn) {
      listeners.set(name, fn)
      return () => {}
    },
    inject(names, callback) {
      if (Array.isArray(names) && names.includes('configEditor') && !exposeEditor) return
      callback(ctx)
    },
  }

  await apply(ctx, config)

  const tool = name => {
    const definition = tools.find(candidate => candidate.name === name)
    assert.ok(definition, `tool ${name} must be registered`)
    return definition
  }
  const whenOf = name => registrations.find(item => item.definition.name === name)?.options?.when
  const exec = sessionId => ({ agent: { id: sessionId }, signal: new AbortController().signal })
  const setStatus = (sessionId, entry) => status.set(sessionId, entry)
  const emit = (name, payload) => {
    const listener = listeners.get(name)
    if (listener) listener(payload)
  }

  async function callRoute(path, options = {}) {
    const [routePath, query = ''] = path.split('?')
    const handler = routes.get(routePath)
    assert.ok(handler, `route ${path} must be registered`)
    const req = { method: options.method ?? 'GET', url: query === '' ? routePath : `${routePath}?${query}` }
    if (options.body !== undefined) {
      req[Symbol.asyncIterator] = async function* iterator() {
        yield Buffer.from(JSON.stringify(options.body))
      }
    }
    const res = {
      writableEnded: false,
      once() {},
      writeHead() {},
      end(text) {
        this.payload = text === undefined || text === '' ? null : JSON.parse(text)
      },
    }
    await handler(req, res)
    return res.payload
  }

  return {
    config,
    stateDir,
    teamsFile: join(stateDir, 'teams.json'),
    ledgerFile: join(stateDir, 'ledger.json'),
    registrations,
    selections,
    cancels,
    workspaces,
    createdRequests,
    prompts,
    tools,
    routes,
    tool,
    whenOf,
    exec,
    setStatus,
    emit,
    callRoute,
    async readTeams() {
      await tick(400)
      return JSON.parse(await readFile(join(stateDir, 'teams.json'), 'utf8'))
    },
    async readLedger() {
      await tick(400)
      return JSON.parse(await readFile(join(stateDir, 'ledger.json'), 'utf8'))
    },
  }
}

/** 等一个宏任务窗口，让 0ms 的防抖定时器跑完。 */
function tick(ms = 10) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const TEAM = {
  teamName: '演示团队',
  leadSessionId: 'session-lead',
  digestDebounceMs: 0,
  members: [
    { sessionId: 'session-lead', name: 'lead', role: '统筹', stage: 0, lead: true },
    { sessionId: 'session-a', name: 'backend', role: '实现', stage: 2, lead: false },
    { sessionId: 'session-b', name: 'qa', role: '验收', stage: 1, lead: false },
  ],
}

test('Config 提供可用的默认值', () => {
  const defaults = Config({})
  assert.equal(defaults.teamName, '新团队')
  assert.deepEqual(defaults.members, [])
  assert.equal(defaults.deliverOnIdle, true)
  assert.equal(defaults.routePath, '/session-team')
})

test('注册四个工具：编排类给 Lead，汇报类给成员', async () => {
  const h = await harness(TEAM)
  assert.deepEqual(h.tools.map(definition => definition.name).sort(),
    ['team_collect', 'team_dispatch', 'team_models', 'team_recover', 'team_report', 'team_roster'])
})

test('工具可见性按角色分流：Lead 看编排类，成员只看汇报', async () => {
  const h = await harness(TEAM)
  const leadContext = { agent: { id: 'session-lead' } }
  const memberContext = { agent: { id: 'session-b' } }
  for (const name of ['team_roster', 'team_dispatch', 'team_collect', 'team_models', 'team_recover']) {
    assert.equal(h.whenOf(name)(leadContext), true, `${name} 对 Lead 可见`)
    assert.equal(h.whenOf(name)(memberContext), false, `${name} 对成员隐藏`)
  }
  assert.equal(h.whenOf('team_report')(memberContext), true)
  assert.equal(h.whenOf('team_report')(leadContext), false)
})

test('汇报按阶段排序，且只在 Lead 空闲时成批投递', async () => {
  const h = await harness(TEAM)
  h.setStatus('session-lead', { active: true, running: true })

  await h.tool('team_report').execute({ subject: 'A 完成', body: '后端接口', state: 'done' }, h.exec('session-a'))
  await h.tool('team_report').execute({ subject: 'B 完成', body: '验收通过', state: 'done' }, h.exec('session-b'))
  await tick()
  assert.equal(h.prompts.length, 0, 'Lead 运行中不得投递')

  h.setStatus('session-lead', { active: true, running: false })
  h.emit('agent/status', { agent: { id: 'session-lead' }, status: 'idle' })
  await tick()

  assert.equal(h.prompts.length, 1, '空闲后合并成一条摘要')
  const [message] = h.prompts
  assert.equal(message.sessionId, 'session-lead')
  assert.equal(message.mode, 'queue')
  assert.match(message.content[0].text, /qa/)
  assert.match(message.content[0].text, /backend/)
  assert.ok(
    message.content[0].text.indexOf('B 完成') < message.content[0].text.indexOf('A 完成'),
    '阶段小的先出现',
  )
})

test('team_collect 自己按阶段消费汇报', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false })
  await h.tool('team_report').execute({ subject: '后端', body: 'ok', state: 'done', stage: 3 }, h.exec('session-a'))
  await h.tool('team_report').execute({ subject: '验收', body: 'ok', state: 'done', stage: 1 }, h.exec('session-b'))

  const first = await h.tool('team_collect').execute({ limit: 1 }, h.exec('session-lead'))
  assert.equal(first.reports.length, 1)
  assert.equal(first.reports[0].subject, '验收')
  assert.equal(first.remaining, 1)

  const second = await h.tool('team_collect').execute({}, h.exec('session-lead'))
  assert.equal(second.reports[0].subject, '后端')
  assert.equal(second.remaining, 0)
  assert.equal(h.prompts.length, 0, '主动收集不应触发自动投递')
})

test('team_dispatch 给所有非 Lead 成员派活，并附带身份说明', async () => {
  const h = await harness({ ...TEAM, briefOnDispatch: true })
  const result = await h.tool('team_dispatch').execute(
    { tasks: [{ target: 'all', text: '实现登录接口' }], mode: 'queue' },
    h.exec('session-lead'),
  )
  assert.equal(result.results.length, 2)
  assert.deepEqual(result.results.map(item => item.name).sort(), ['backend', 'qa'])
  assert.equal(h.prompts.length, 2)
  for (const message of h.prompts) {
    const text = message.content[0].text
    assert.match(text, /演示团队/)
    assert.match(text, /team_report/)
    assert.match(text, /实现登录接口/)
  }
  assert.equal(h.prompts[0].mode, 'queue')
})

test('team_roster 汇总每个成员的在线状态与待读汇报', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false })
  h.setStatus('session-a', { active: true, running: true })
  await h.tool('team_report').execute({ subject: '进度', body: '一半', state: 'progress' }, h.exec('session-b'))
  const view = await h.tool('team_roster').execute({}, h.exec('session-lead'))
  assert.equal(view.pendingReports, 1)
  assert.equal(view.lead, 'session-lead')
  assert.equal(view.members.length, 3)
  const backend = view.members.find(member => member.name === 'backend')
  assert.equal(backend.running, true)
  const qa = view.members.find(member => member.name === 'qa')
  assert.equal(qa.reports, 1)
})

test('一次投递的条数受 maxReportsPerDigest 限制', async () => {
  const h = await harness({ ...TEAM, maxReportsPerDigest: 1 })
  h.setStatus('session-lead', { active: true, running: false })
  for (const [index, sessionId] of ['session-a', 'session-b'].entries()) {
    await h.tool('team_report').execute({ subject: `第 ${index + 1} 条`, body: 'x', state: 'progress' }, h.exec(sessionId))
  }
  h.emit('agent/status', { agent: { id: 'session-lead' }, status: 'idle' })
  await tick()
  assert.equal(h.prompts.length, 1)
  assert.match(h.prompts[0].content[0].text, /还剩 1 条/)

  h.emit('agent/status', { agent: { id: 'session-lead' }, status: 'idle' })
  await tick()
  assert.equal(h.prompts.length, 2)
})

test('面板路由：读取快照、改名单、指定 Lead', async () => {
  const h = await harness(TEAM)
  const state = await h.callRoute('/session-team/state')
  assert.equal(state.ok, true)
  assert.equal(state.team.lead, 'session-lead')
  assert.equal(state.team.members.length, 3)

  const lead = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'set-lead', sessionId: 'session-b' },
  })
  assert.equal(lead.ok, true)
  const savedLead = await h.readTeams()
  const legacyTeam = savedLead.teams.find(team => team.id === 'team-legacy')
  assert.equal(legacyTeam.lead, 'session-b')

  const added = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'add-member', sessionId: 'session-c', name: 'docs', role: '文档', stage: 3 },
  })
  assert.equal(added.ok, true)
  const savedAdded = await h.readTeams()
  assert.equal(savedAdded.teams.find(team => team.id === 'team-legacy').members.length, 4)

  const after = await h.callRoute('/session-team/state')
  assert.equal(after.team.members.length, 4)
  assert.equal(after.team.members[3].name, 'docs')

  const removed = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'remove-member', sessionId: 'session-c' },
  })
  assert.equal(removed.ok, true)
  const savedRemoved = await h.readTeams()
  assert.equal(savedRemoved.teams.find(team => team.id === 'team-legacy').members.length, 3)
})

test('名单与台账都写进插件私有数据文件（与 configEditor 无关）', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'session-team-file-'))
  const h = await harness({ ...TEAM, deliverOnIdle: false }, { stateDir: dir })
  const added = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'add-member', sessionId: 'session-file-only', name: 'file-only' },
  })
  assert.equal(added.ok, true)
  await tick(400)
  const saved = JSON.parse(await readFile(h.teamsFile, 'utf8'))
  assert.equal(saved.teams[0].members.length, 4)
  assert.equal(saved.teams[0].members[3].sessionId, 'session-file-only')
  const state = await h.callRoute('/session-team/state')
  assert.equal(state.team.members.length, 4)
  await rm(dir, { recursive: true, force: true })
})

test('读取可用模型，并按成员切换（只改该会话）', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false })
  const state = await h.callRoute('/session-team/state')
  assert.equal(state.models.providers.length, 1)
  assert.equal(state.models.providers[0].models.length, 2)
  assert.equal(state.models.default.model, 'm1')
  assert.equal(state.team.members.find(member => member.name === 'qa').model, null)

  const switched = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'select-model', sessionId: 'session-b', provider: 'p1', model: 'm2' },
  })
  assert.equal(switched.ok, true)
  assert.equal(switched.selected.model, 'm2')
  assert.equal(h.selections.get('session-b').model, 'm2')

  const after = await h.callRoute('/session-team/state')
  assert.equal(after.team.members.find(member => member.name === 'qa').model.model, 'm2')
})

test('team_models 列出目录，也能给成员指派模型', async () => {
  const h = await harness(TEAM)
  const listed = await h.tool('team_models').execute({}, h.exec('session-lead'))
  assert.equal(listed.providers[0].models.length, 2)
  assert.equal(listed.defaultModel.model, 'm1')
  assert.equal(listed.assigned, undefined)

  const assigned = await h.tool('team_models').execute(
    { member: 'qa', provider: 'p1', model: 'm1', reasoning_effort: 'high' },
    h.exec('session-lead'),
  )
  assert.equal(assigned.assigned.model, 'm1')
  assert.equal(assigned.assigned.reasoningEffort, 'high')
  assert.equal(h.selections.get('session-b').reasoningEffort, 'high')
})

test('派活记入任务台账，done 汇报后关闭', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false })
  await h.tool('team_dispatch').execute(
    { tasks: [{ target: 'qa', text: '做验收清单' }], mode: 'queue' },
    h.exec('session-lead'),
  )
  const state = await h.callRoute('/session-team/state')
  assert.ok(state.team)
  assert.equal(state.team.openTasks, 1)
  const task = state.team.tasks.find(item => item.name === 'qa')
  assert.match(task.subject, /验收清单/)
  assert.equal(task.state, 'dispatched')

  await h.tool('team_report').execute({ subject: '验收完成', body: 'ok', state: 'done' }, h.exec('session-b'))
  const after = await h.callRoute('/session-team/state')
  assert.equal(after.team.openTasks, 0)
  assert.equal(after.team.tasks.find(item => item.name === 'qa').state, 'done')
})

test('中断后可恢复：dry-run 只报告，恢复会发「先汇报再继续」提示', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false, resumeStaleMs: 0 })
  await h.tool('team_dispatch').execute({ tasks: [{ target: 'backend', text: '实现接口' }] }, h.exec('session-lead'))
  await tick(20)

  const dry = await h.callRoute('/session-team/action', { method: 'POST', body: { kind: 'recover', dryRun: true } })
  assert.equal(dry.ok, true)
  assert.equal(dry.results.length, 1)
  assert.equal(dry.results[0].skipped, 'dry-run')
  assert.equal(h.prompts.filter(message => message.content[0].text.includes('团队恢复')).length, 0)

  const resumed = await h.callRoute('/session-team/action', { method: 'POST', body: { kind: 'recover' } })
  assert.equal(resumed.ok, true)
  assert.equal(resumed.results[0].skipped, '')
  const recovery = h.prompts.filter(message => message.content[0].text.includes('团队恢复'))
  assert.equal(recovery.length, 1)
  assert.match(recovery[0].content[0].text, /不要从头重做/)
})

test('重启后从台账恢复未送达汇报与未完成任务', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'session-team-ledger-'))
  const first = await harness({ ...TEAM, deliverOnIdle: false }, { stateDir: dir })
  await first.tool('team_dispatch').execute({ tasks: [{ target: 'backend', text: '实现接口' }] }, first.exec('session-lead'))
  await first.tool('team_report').execute({ subject: '进行中', body: 'x', state: 'progress' }, first.exec('session-a'))
  await tick(500)
  const second = await harness({ ...TEAM, deliverOnIdle: false }, { stateDir: dir })
  const state = await second.callRoute('/session-team/state')
  assert.equal(state.team.pendingReports, 1)
  assert.equal(state.team.openTasks, 1)
  assert.equal(state.team.tasks[0].name, 'backend')
  assert.match(second.teamsFile, /teams.json/)
  await rm(dir, { recursive: true, force: true })
})

test('可以手动登记已在进行的任务，并参与恢复', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false, resumeStaleMs: 100_000 })
  const recorded = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'record-task', sessionId: 'session-b', subject: '历史任务', text: '旧任务正文' },
  })
  assert.equal(recorded.ok, true)
  const state = await h.callRoute('/session-team/state')
  assert.equal(state.team.openTasks, 1)
  assert.equal(state.team.tasks[0].subject, '历史任务')
  await tick(20)
  assert.equal(state.team.tasks[0].stale, false)
  // done 汇报后自动关闭
  await h.tool('team_report').execute({ subject: '收尾', body: 'ok', state: 'done' }, h.exec('session-b'))
  const after = await h.callRoute('/session-team/state')
  assert.equal(after.team.openTasks, 0)
})

test('可以从零创建团队成员并设置模型', async () => {
  const h = await harness({ ...TEAM, members: [], leadSessionId: '' })
  const result = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: {
      kind: 'create-team',
      teamName: '新队',
      cwd: '/tmp/proj',
      members: [
        { name: 'lead', role: '统筹', stage: 0, lead: true, provider: 'p1', model: 'm1' },
        { name: 'dev', role: '实现', stage: 1, provider: 'p1', model: 'm2', reasoningEffort: 'high' },
      ],
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.created.length, 2)
  assert.equal(result.team.lead, 'session-new-1')
  assert.equal(h.selections.get('session-new-1').model, 'm1')
  assert.equal(h.selections.get('session-new-2').reasoningEffort, 'high')

  const saved = await h.readTeams()
  assert.equal(saved.teams.length, 1)
  const newTeam = saved.teams.find(team => team.id === result.team.id)
  assert.equal(newTeam.members.length, 2)
  assert.equal(saved.activeTeamId, result.team.id)

  const state = await h.callRoute('/session-team/state')
  assert.equal(state.team.members.length, 2)
  assert.equal(state.team.lead, 'session-new-1')
  assert.equal(state.creations.canCreate, true)
})

test('成员还有排队输入时不算「待恢复」', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false, resumeStaleMs: 0 })
  await h.tool('team_dispatch').execute({ tasks: [{ target: 'backend', text: '实现接口' }] }, h.exec('session-lead'))
  await tick(20)

  h.setStatus('session-a', { active: true, running: false, queue: [{}] })
  const state = await h.callRoute('/session-team/state')
  assert.equal(state.team.tasks[0].stale, false)

  h.setStatus('session-a', { active: true, running: false, queue: [] })
  await tick(10)
  const after = await h.callRoute('/session-team/state')
  assert.equal(after.team.tasks[0].stale, true)
})

test('多团队：工具与会话按调用者所在团队隔离', async () => {
  const h = await harness({ ...TEAM, members: [], leadSessionId: '' })
  const teamA = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: {
      kind: 'create-team',
      name: 'Team A',
      cwd: '/tmp/a',
      members: [
        { name: 'leadA', role: '统筹', stage: 0, lead: true },
        { name: 'devA', role: '实现', stage: 1 },
      ],
    },
  })
  const teamB = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: {
      kind: 'create-team',
      name: 'Team B',
      cwd: '/tmp/b',
      members: [
        { name: 'leadB', role: '统筹', stage: 0, lead: true },
        { name: 'devB', role: '验收', stage: 1 },
      ],
    },
  })
  assert.equal(teamA.ok, true)
  assert.equal(teamB.ok, true)
  assert.notEqual(teamA.team.id, teamB.team.id)

  const rosterA = await h.tool('team_roster').execute({}, h.exec(teamA.team.lead))
  assert.equal(rosterA.team, 'Team A')
  assert.deepEqual(rosterA.members.map(member => member.name).sort(), ['devA', 'leadA'])
  const rosterB = await h.tool('team_roster').execute({}, h.exec(teamB.team.lead))
  assert.equal(rosterB.team, 'Team B')
  assert.deepEqual(rosterB.members.map(member => member.name).sort(), ['devB', 'leadB'])

  await h.tool('team_report').execute({ subject: 'A 进度', body: 'x', state: 'progress' }, h.exec('session-new-2'))
  const stateA = await h.callRoute(`/session-team/state?team=${teamA.team.id}`)
  assert.equal(stateA.team.pendingReports, 1)
  const stateB = await h.callRoute(`/session-team/state?team=${teamB.team.id}`)
  assert.equal(stateB.team.pendingReports, 0)

  const selected = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'select-team', teamId: teamA.team.id },
  })
  assert.equal(selected.activeTeamId, teamA.team.id)
})

test('已有团队中可以新建智能体角色（等价于新建 session）', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false })
  const result = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: {
      kind: 'create-members',
      cwd: '/tmp/proj',
      items: [
        { name: 'designer', role: '设计', stage: 9, provider: 'p1', model: 'm1' },
        { name: 'docs', role: '文档', stage: 10, lead: true },
      ],
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.created.length, 2)
  assert.equal(h.selections.get(result.created[0].sessionId).model, 'm1')

  const state = await h.callRoute('/session-team/state')
  assert.equal(state.team.members.length, 5)
  assert.equal(state.team.lead, result.created[1].sessionId)

  const saved = await h.readTeams()
  assert.equal(saved.teams[0].cwd, '/tmp/proj')
  assert.equal(saved.teams[0].members.length, 5)
})

test('新建成员时可选择 Agent 模式，状态里暴露模式目录', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false })
  const state = await h.callRoute('/session-team/state')
  assert.equal(state.presets.length, 2)
  assert.equal(state.presets[0].id, 'standard')
  assert.equal(state.presets[1].id, 'ptc')

  await h.callRoute('/session-team/action', {
    method: 'POST',
    body: {
      kind: 'create-team',
      name: 'M',
      cwd: '/tmp/m',
      members: [
        { name: 'lead', lead: true, agentPreset: 'standard' },
        { name: 'dev', agentPreset: 'ptc' },
      ],
    },
  })
  assert.equal(h.createdRequests[0].agentPreset, 'standard')
  assert.equal(h.createdRequests[1].agentPreset, 'ptc')

  await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'create-members', cwd: '/tmp/m', items: [{ name: 'qa', agentPreset: 'standard' }] },
  })
  assert.equal(h.createdRequests[2].agentPreset, 'standard')
})

test('状态里的 version 直接来自 package.json', async () => {
  const h = await harness(TEAM)
  const state = await h.callRoute('/session-team/state')
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(state.version, pkg.version)
})

test('拖动排序：reorder-members 重写成员顺序与优先级', async () => {
  const h = await harness(TEAM)
  const order = ['session-b', 'session-lead', 'session-a']
  const result = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'reorder-members', order },
  })
  assert.equal(result.ok, true)
  assert.deepEqual(result.members.map(member => member.sessionId), order)
  assert.deepEqual(result.members.map(member => member.stage), [0, 1, 2])

  const state = await h.callRoute('/session-team/state')
  assert.deepEqual(state.team.members.map(member => member.sessionId), order)
  assert.deepEqual(state.team.members.map(member => member.stage), [0, 1, 2])

  const saved = await h.readTeams()
  assert.deepEqual(saved.teams[0].members.map(member => member.sessionId), order)
})

test('新增成员/新建团队会向 Lead 发送成员变动通知（含角色）', async () => {
  const h = await harness({ digestDebounceMs: 0 })
  const created = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: {
      kind: 'create-team',
      name: '通知团队',
      cwd: '/tmp/notify',
      members: [
        { name: 'lead', role: '统筹', lead: true },
        { name: 'dev', role: '实现' },
      ],
    },
  })
  await new Promise(resolve => setTimeout(resolve, 20))
  const state = await h.callRoute('/session-team/state')
  assert.ok(state.team.pendingNotices >= 1, '创建团队后应有成员变动通知')
  h.setStatus(created.created[0].sessionId, { active: true, running: false })
  const flush = await h.callRoute('/session-team/action', { method: 'POST', body: { kind: 'flush' } })
  assert.equal(flush.notices.delivered >= 1, true)
  const text = h.prompts.at(-1).content[0].text
  assert.match(text, /dev（实现）/, '通知里要带新成员的名字与角色')
  const after = await h.callRoute('/session-team/state')
  assert.equal(after.team.pendingNotices, 0)

  await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'create-members', cwd: '/tmp/notify', items: [{ name: 'qa', role: '验收', stage: 3 }] },
  })
  await new Promise(resolve => setTimeout(resolve, 20))
  const ledger = await h.readLedger()
  const texts = ledger.notices.map(notice => notice.text).join('\n')
  assert.match(texts, /qa（验收）/, '新增成员通知里要有新成员角色')
})

test('新建的会话会带上 workspaceId，落到项目分组', async () => {
  const h = await harness({ digestDebounceMs: 0 })
  await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'create-team', name: '分组团队', cwd: '/tmp/ws-team', members: [{ name: 'lead', lead: true }, { name: 'dev' }] },
  })
  assert.equal(h.createdRequests.length, 2)
  assert.equal(h.createdRequests[0].workspaceId, 'ws-1', '新建团队时必须带项目分组 id')
  assert.equal(h.createdRequests[1].workspaceId, 'ws-1')
  assert.equal(h.workspaces[0].sessionIds.length, 2, '新会话要挂进项目分组')

  await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'create-members', cwd: '/tmp/ws-team', items: [{ name: 'qa', role: '验收' }] },
  })
  assert.equal(h.createdRequests[2].workspaceId, 'ws-1', '团队内新增角色也要落进同一分组')
})

test('attach-workspace 会补齐未归组的成员', async () => {
  const h = await harness({ digestDebounceMs: 0 })
  await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'create-team', name: '整理团队', cwd: '/tmp/ws-team2', members: [{ name: 'lead', lead: true }, { name: 'dev' }] },
  })
  const workspace = h.workspaces.find(item => item.path === '/tmp/ws-team2')
  assert.equal(workspace.sessionIds.length, 2, '新建时已经归组')
  workspace.sessionIds.length = 0 // 模拟修复前的老成员：还没挂进分组
  const result = await h.callRoute('/session-team/action', { method: 'POST', body: { kind: 'attach-workspace' } })
  assert.equal(result.ok, true)
  assert.equal(result.attached, 2)
  assert.equal(result.skipped, 0)
  assert.equal(workspace.sessionIds.length, 2, '补齐后成员都归组')
})

test('transcript 路由返回精简对话（用户/助手/工具）', async () => {
  const h = await harness(TEAM)
  const payload = await h.callRoute('/session-team/transcript?session=session-a&limit=10')
  assert.equal(payload.ok, true)
  assert.equal(payload.messages.length, 3)
  assert.deepEqual(payload.messages.map(item => item.role), ['user', 'assistant', 'tool'])
  assert.match(payload.messages[0].text, /开始做首页/)
  assert.deepEqual(payload.messages[1].tools, ['read'])
  assert.match(payload.messages[2].text, /bash/)
  const missing = await h.callRoute('/session-team/transcript')
  assert.equal(missing.ok, false)
})

test('派活可以把 Lead 作为目标', async () => {
  const h = await harness({ ...TEAM, deliverOnIdle: false })
  const result = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'dispatch', mode: 'queue', tasks: [{ target: 'lead', text: '汇总进度' }] },
  })
  assert.equal(result.ok, true)
  assert.equal(result.results.length, 1)
  assert.equal(result.results[0].sessionId, 'session-lead')
  const prompt = h.prompts.at(-1)
  assert.equal(prompt.sessionId, 'session-lead')
  assert.match(prompt.content[0].text, /汇总进度/)
})

test('给角色发消息 / 中断 / 订阅流式输出', async () => {
  const h = await harness(TEAM)
  const sent = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'message', sessionId: 'session-a', text: '看一下登录页', mode: 'steer' },
  })
  assert.equal(sent.ok, true)
  const prompt = h.prompts.at(-1)
  assert.equal(prompt.sessionId, 'session-a')
  assert.equal(prompt.mode, 'steer')
  assert.match(prompt.content[0].text, /登录页/)

  const cancelled = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'cancel', sessionId: 'session-a' },
  })
  assert.equal(cancelled.ok, true)
  assert.equal(h.cancels.length, 1)
  assert.equal(h.cancels[0].sessionId, 'session-a')

  await h.callRoute('/session-team/action', { method: 'POST', body: { kind: 'watch', sessionId: 'session-a' } })
  await new Promise(resolve => setTimeout(resolve, 30))
  const live = await h.callRoute('/session-team/live?session=session-a')
  assert.equal(live.ok, true)
  assert.equal(live.watching, true)
  assert.match(live.streamText, /输出中/)
  assert.deepEqual(live.tools, ['read'])

  await h.callRoute('/session-team/action', { method: 'POST', body: { kind: 'unwatch', sessionId: 'session-a' } })
  const after = await h.callRoute('/session-team/live?session=session-a')
  assert.equal(after.watching, false)
})

test('未知操作返回错误而不是抛出面板路由', async () => {
  const h = await harness(TEAM)
  const payload = await h.callRoute('/session-team/action', {
    method: 'POST',
    body: { kind: 'nope' },
  })
  assert.equal(payload.ok, false)
  assert.match(payload.error.message, /未知操作/)
})
