/**
 * 只读技能扫描器。
 *
 * 识别两类形态：
 *  - 目录-bundle：`<dir>/SKILL.md`（主流）
 *  - 平铺 .md：根目录下的 `*.md`
 *
 * 「启用」的口径对齐 DSH 的真实加载逻辑（dsh-skill-filesystem 的 roots）：
 *   <project>/.dsh/skills、<project>/.agents/skills、~/.dsh/skills、
 *   ~/.agents/skills、DSH_BUNDLED_SKILL_DIR —— 这些根下被发现的技能，
 *   DSH 下一回合就能用，状态即 enabled。
 * 其它 agent 目录（claude/omp/pi/opencode/codex）只读展示，算 disabled，
 * 导入方式是在 ~/.dsh/skills 建软链。
 *
 * 全程只读，不写任何源目录。
 */
import { promises as fs } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve, sep } from 'node:path'

/** 扫描时跳过的目录名：体积大或与本功能无关。 */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', 'commands', 'agents'])

/** 单个扫描根的命中上限，防止异常目录拖死面板。 */
const MAX_HITS_PER_ROOT = 500

/** 来源优先级（越小越靠前），用于同名冲突时选主记录。 */
const AGENT_ORDER = ['dsh', 'agents', 'local', 'claude', 'omp', 'pi', 'opencode', 'codex']

/** DSH 自己的家目录，对齐 dsh-home-paths 的优先级（空白覆盖视为未设置）。 */
export function dshHome() {
  const override = process.env.DSH_HOME
  return (override && override.trim()) ? resolve(override.trim()) : join(homedir(), '.dsh')
}

/** 已导入技能的落地目录：软链即「导入/启用」。 */
export function dshSkillsDir() {
  return join(dshHome(), 'skills')
}

/** DSH 的 agents 家目录（user-agents 技能根），对齐 dsh-home-paths 的优先级。 */
export function agentsHome() {
  const override = process.env.DSH_AGENTS_HOME
  return (override && override.trim()) ? resolve(override.trim()) : join(homedir(), '.agents')
}

/**
 * 扫描根清单。
 *  - active：DSH 会真实加载的根，命中即 enabled。
 *  - external：其它 agent 的目录，命中即 disabled（可导入）。
 * @param {string} projectDir 当前工作区目录
 */
export function scanRoots(projectDir) {
  const home = homedir()
  const bundled = process.env.DSH_BUNDLED_SKILL_DIR
  const active = [
    { dir: join(projectDir, '.dsh/skills'), depth: 3, label: '项目 .dsh/skills' },
    { dir: join(projectDir, '.agents/skills'), depth: 3, label: '项目 .agents/skills' },
    { dir: join(dshHome(), 'skills'), depth: 3, label: '用户 ~/.dsh/skills' },
    { dir: join(agentsHome(), 'skills'), depth: 3, label: '用户 ~/.agents/skills' },
  ]
  if (typeof bundled === 'string' && bundled !== '') {
    active.push({ dir: resolve(bundled), depth: 3, label: '内置技能' })
  }
  const external = [
    { agent: 'claude', dir: join(home, '.claude/plugins/cache'), depth: 7, label: 'claude plugins' },
    { agent: 'claude', dir: join(home, '.claude/skills'), depth: 3, label: 'claude skills' },
    { agent: 'omp', dir: join(home, '.omp/agent/skills'), depth: 3, label: 'omp skills' },
    { agent: 'pi', dir: join(home, '.pi/agent/skills'), depth: 3, label: 'pi skills' },
    { agent: 'opencode', dir: join(projectDir, '.opencode/skills'), depth: 3, label: 'opencode (项目)' },
    { agent: 'opencode', dir: join(home, '.opencode/skills'), depth: 3, label: 'opencode (全局)' },
    { agent: 'codex', dir: join(home, '.codex/skills'), depth: 3, label: 'codex skills' },
  ]
  return { active, external }
}

/**
 * 极简 frontmatter 解析：只认 `key: value` 与 `key: >` / `key: |`。
 * SKILL.md 的 frontmatter 约定很窄，不引入 yaml 依赖。
 * @param {string} text 文件全文
 */
export function parseFrontmatter(text) {
  const out = {}
  if (typeof text !== 'string' || !text.startsWith('---')) return out
  const end = text.indexOf('\n---', 3)
  if (end === -1) return out
  const lines = text.slice(3, end).split('\n')
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(lines[i])
    if (!match) continue
    const key = match[1]
    let value = match[2].trim()
    if (value === '>' || value === '|' || value === '>-' || value === '|-') {
      const parts = []
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        parts.push(lines[i + 1].trim())
        i += 1
      }
      out[key] = parts.join(value.startsWith('>') ? ' ' : '\n').trim()
      continue
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
      if (match[2].trim().startsWith('"')) value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
    out[key] = value
  }
  return out
}

/** 读文件前 64KiB：够 frontmatter 用，也不怕超大文件。 */
async function readHead(file) {
  let handle
  try {
    handle = await fs.open(file, 'r')
    const buffer = Buffer.allocUnsafe(64 * 1024)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    return buffer.subarray(0, bytesRead).toString('utf8')
  } catch {
    return ''
  } finally {
    if (handle) await handle.close().catch(() => {})
  }
}

/**
 * 判断一个目录项的真实类型。`~/.dsh/skills` 下的技能全是软链，
 * Dirent 只会告诉我们「这是软链」，所以软链要 stat 一次才知是不是目录。
 */
async function entryKind(dir, entry) {
  if (entry.isDirectory()) return 'dir'
  if (entry.isFile()) return 'file'
  if (!entry.isSymbolicLink()) return 'other'
  try {
    const stat = await fs.stat(join(dir, entry.name))
    return stat.isDirectory() ? 'dir' : 'file'
  } catch {
    return 'broken'
  }
}

/**
 * 广度优先递归，找出所有含 SKILL.md 的目录（命中即止，不再下钻），
 * 以及根目录下平铺的 *.md。
 */
async function walkRoot(root, maxDepth) {
  const bundles = []
  const flat = []
  const queue = [{ dir: root, depth: 0 }]
  while (queue.length > 0 && bundles.length < MAX_HITS_PER_ROOT) {
    const { dir, depth } = queue.shift()
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }
    if (entries.some((entry) => entry.isFile() && entry.name === 'SKILL.md')) {
      bundles.push(dir)
      continue
    }
    for (const entry of entries) {
      const kind = await entryKind(dir, entry)
      if (kind === 'dir') {
        if (depth >= maxDepth) continue
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
        queue.push({ dir: join(dir, entry.name), depth: depth + 1 })
        continue
      }
      if (depth === 0 && kind === 'file' && entry.name.toLowerCase().endsWith('.md')) {
        flat.push(join(dir, entry.name))
      }
    }
  }
  return { bundles, flat }
}

/** 读一个技能目录/平铺文件，产出原始候选。 */
async function readCandidate(source, dir, file, agent) {
  const text = await readHead(file)
  const meta = parseFrontmatter(text)
  const fallback = basename(dir || file).replace(/\.md$/i, '')
  const name = String(meta.name || '').trim() || fallback
  return {
    name,
    description: String(meta.description || '').trim(),
    sourceAgent: agent,
    path: dir || file,
    modelInvocable: String(meta['disable-model-invocation'] || '').toLowerCase() !== 'true',
    _origin: source,
  }
}

/**
 * 读取 ~/.dsh/skills 的现状：软链集合 + 断链集合。
 * 软链目标同时用来反推上游来源（例如 pm-skills 指向 claude 的 cache）。
 */
async function readLinks() {
  const dir = dshSkillsDir()
  const map = new Map()
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return map
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    const isLink = entry.isSymbolicLink()
    let target = null
    let broken = false
    if (isLink) {
      try {
        target = await fs.readlink(full)
      } catch {
        target = null
      }
      try {
        await fs.stat(full)
      } catch {
        broken = true
      }
    }
    map.set(entry.name, { name: entry.name, path: full, target, broken, isLink })
  }
  return map
}

/** 把软链目标解析成绝对路径（相对软链按软链所在目录解析）。 */
function resolveLinkTarget(link) {
  if (!link || typeof link.target !== 'string' || link.target === '') return null
  if (link.target.startsWith('/')) return link.target
  return resolve(dirname(link.path), link.target)
}

/** 从物理路径推断来源 agent；不在任何 agent 目录下的算 local。 */
function agentFromTarget(realTarget) {
  if (typeof realTarget !== 'string') return null
  if (realTarget.includes('/.claude/')) return 'claude'
  if (realTarget.includes('/.omp/')) return 'omp'
  if (realTarget.includes('/.pi/')) return 'pi'
  if (realTarget.includes('/.opencode/')) return 'opencode'
  if (realTarget.includes('/.codex/')) return 'codex'
  if (realTarget.includes('/.agents/skills/')) return 'agents'
  if (realTarget.startsWith(homedir() + sep) || realTarget.startsWith('/')) return 'local'
  return null
}

const orderOf = (agent) => {
  const index = AGENT_ORDER.indexOf(agent)
  return index === -1 ? AGENT_ORDER.length : index
}

/** 扫一个根，把候选 push 进 out，返回命中数。 */
async function scanOneRoot(root, agent, out) {
  let exists = true
  try {
    await fs.access(root.dir)
  } catch {
    exists = false
  }
  if (!exists) return { dir: root.dir, label: root.label, agent, exists: false, found: 0 }
  const { bundles, flat } = await walkRoot(root.dir, root.depth)
  let found = 0
  for (const dir of bundles) {
    out.push(await readCandidate(root.label, dir, join(dir, 'SKILL.md'), agent))
    found += 1
  }
  for (const file of flat) {
    out.push(await readCandidate(root.label, null, file, agent))
    found += 1
  }
  return { dir: root.dir, label: root.label, agent, exists: true, found }
}

/**
 * 扫描全部来源，产出去重后的卡片列表。
 *
 * 除固定根外，还会从 `~/.dsh/skills` 的软链目标反推来源根：
 * 已导入技能所在的 `skills/` 目录一并扫描，才能发现「同仓但未导入」的兄弟技能。
 * @param {{ projectDir?: string }} [options]
 */
export async function scanSkills(options = {}) {
  const projectDir = options.projectDir || process.env.DSH_WORKSPACE || process.cwd()
  const links = await readLinks()
  const { active, external } = scanRoots(projectDir)
  const rootReports = []

  // 1) 已导入技能：软链目标反推来源根。
  const explicitDirs = [...active, ...external].map((root) => root.dir)
  const covered = (dir) => explicitDirs.some((known) => dir === known || dir.startsWith(known + sep))
  const derived = new Map()
  for (const link of links.values()) {
    const real = resolveLinkTarget(link)
    if (real === null) continue
    const parent = dirname(real)
    if (parent === '.' || parent === '/' || covered(parent) || derived.has(parent)) continue
    derived.set(parent, {
      agent: agentFromTarget(real) || 'local',
      dir: parent,
      depth: 2,
      label: 'local · ' + basename(dirname(parent)) + '/' + basename(parent),
    })
  }

  // 2) 扫 active 根：命中即「DSH 现在就能加载」。
  const activeCards = new Map()
  for (const root of active) {
    const candidates = []
    rootReports.push(await scanOneRoot(root, 'dsh', candidates))
    for (const candidate of candidates) {
      if (activeCards.has(candidate.name)) {
        const existing = activeCards.get(candidate.name)
        if (!existing.description && candidate.description) existing.description = candidate.description
        continue
      }
      const link = links.get(candidate.name)
      const real = link ? resolveLinkTarget(link) : null
      const origin = agentFromTarget(real) || (root.dir.includes('/.agents/') ? 'agents' : 'dsh')
      activeCards.set(candidate.name, {
        name: candidate.name,
        description: candidate.description,
        sourceAgent: 'dsh',
        originAgent: origin,
        sources: origin === 'dsh' ? ['dsh'] : ['dsh', origin],
        status: 'enabled',
        active: true,
        installed: true,
        path: real || candidate.path,
        linkPath: link ? link.path : null,
        root: root.label,
        modelInvocable: candidate.modelInvocable,
      })
    }
  }

  // 3) 扫 external 根：同名补来源，异名算「未启用」。
  const externalCandidates = []
  for (const root of [...external, ...derived.values()]) {
    rootReports.push(await scanOneRoot(root, root.agent, externalCandidates))
  }

  const cards = new Map(activeCards)
  for (const candidate of externalCandidates) {
    const existing = cards.get(candidate.name)
    if (existing) {
      // 同名：已启用的保持 enabled，只补来源标签与描述。
      if (!existing.description && candidate.description) existing.description = candidate.description
      if (!existing.sources.includes(candidate.sourceAgent)) existing.sources.push(candidate.sourceAgent)
      if (!existing.originAgent) existing.originAgent = candidate.sourceAgent
      continue
    }
    cards.set(candidate.name, {
      name: candidate.name,
      description: candidate.description,
      sourceAgent: candidate.sourceAgent,
      originAgent: candidate.sourceAgent,
      sources: [candidate.sourceAgent],
      status: 'disabled',
      active: false,
      installed: false,
      path: candidate.path,
      linkPath: null,
      root: candidate._origin,
      modelInvocable: candidate.modelInvocable,
    })
  }

  // 4) 断链：~/.dsh/skills 里有软链但目标不存在，且没有其他可用来源。
  for (const link of links.values()) {
    if (!link.broken) continue
    const existing = cards.get(link.name)
    if (existing) {
      existing.status = existing.active ? existing.status : 'orphan'
      continue
    }
    cards.set(link.name, {
      name: link.name,
      description: '',
      sourceAgent: 'dsh',
      originAgent: null,
      sources: ['dsh'],
      status: 'orphan',
      active: false,
      installed: false,
      path: resolveLinkTarget(link) || link.path,
      linkPath: link.path,
      root: '用户 ~/.dsh/skills',
      modelInvocable: true,
    })
  }

  const skills = [...cards.values()].sort((left, right) => {
    const rank = (card) => (card.status === 'enabled' ? 0 : card.status === 'orphan' ? 1 : 2)
    return rank(left) - rank(right) || left.name.localeCompare(right.name)
  })

  const counts = { total: skills.length, enabled: 0, disabled: 0, orphan: 0 }
  for (const skill of skills) counts[skill.status] += 1

  return {
    scannedAt: new Date().toISOString(),
    projectDir,
    dshSkillsDir: dshSkillsDir(),
    counts,
    roots: rootReports.sort((left, right) => Number(right.exists) - Number(left.exists)),
    skills,
  }
}
