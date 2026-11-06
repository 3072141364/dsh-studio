/**
 * 模式（skill 子集）：
 *  - `all` 是虚拟全集：永远 = 扫描到的全部技能，不落盘清单，不可删除，无启用/禁用概念。
 *  - 其它模式是 `all` 的真子集，每个模式保存一份「技能名清单」（只存存在的技能名）。
 *  - 切换模式 = 应用该子集：清单内建软链（激活），清单外删软链（不激活）。
 *  - 允许空模式（激活 0 个技能）。
 *  - 预设（内置）模式 coding/research/product/uiux/debug：可编辑成员、不可删除，缺失时自动补齐。
 *
 * 存盘：~/.dsh/storages/dsh-studio/modes.json
 *   { active, initialized, modes: { id: { label, skills: [name], color } } }
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { dshHome, scanSkills } from './scanner.js'
import { toggleSkill } from './skills.js'

const ALL_ID = 'all'
const PRESETS = [
  { id: 'coding', label: 'coding', color: '#818cf8' },
  { id: 'research', label: 'research', color: '#f59e0b' },
  { id: 'product', label: 'product', color: '#10b981' },
  { id: 'uiux', label: 'uiux', color: '#ec4899' },
  { id: 'debug', label: 'debug', color: '#ef4444' },
]
/** 自定义模式自动配色（避开预设固定色）。 */
const MODE_COLORS = ['#0ea5e9', '#10b981', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1', '#ef4444', '#f59e0b', '#64748b']

function userError(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function storeFile() {
  return join(dshHome(), 'storages', 'dsh-studio', 'modes.json')
}

/** 归一化技能清单：只保留非空字符串，去重。 */
function cleanSkills(list) {
  return Array.isArray(list)
    ? [...new Set(list.filter((item) => typeof item === 'string' && item !== ''))]
    : []
}

/** 给自定义模式挑一个未被占用的颜色；都占用则按 id 哈希兜底。 */
function pickColor(store, id) {
  const used = new Set(Object.values(store.modes).map((mode) => mode && mode.color).filter(Boolean))
  for (const color of MODE_COLORS) {
    if (!used.has(color)) return color
  }
  let hash = 0
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return MODE_COLORS[hash % MODE_COLORS.length]
}

/** 从显示名生成 kebab-case 片段；中文等非 ASCII 会得到空串。 */
function slugify(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** 后台自动生成唯一 id：优先用显示名的 slug，冲突或为空则加后缀 / 用 mode 兜底。 */
function generateId(store, label) {
  const base = slugify(label) || 'mode'
  if (base !== ALL_ID && !store.modes[base]) return base
  let n = 2
  while (store.modes[`${base}-${n}`]) n += 1
  return `${base}-${n}`
}

async function readStore() {
  try {
    const raw = await readFile(storeFile(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      // 旧格式：存在 default 键（旧 BUILTIN 全量快照）。迁移：default 丢弃为虚拟 all。
      const legacy = parsed.modes && typeof parsed.modes === 'object' && Object.prototype.hasOwnProperty.call(parsed.modes, 'default')
      const modes = {}
      if (parsed.modes && typeof parsed.modes === 'object') {
        for (const [rawId, value] of Object.entries(parsed.modes)) {
          if (rawId === 'default' || rawId === ALL_ID) continue
          if (!value || typeof value !== 'object') continue
          // 历史笔误：早期把 research 建成了 search，统一归并为 research。
          const id = rawId === 'search' ? 'research' : rawId
          const preset = PRESETS.find((item) => item.id === id)
          const isPreset = Boolean(preset)
          // 旧格式只有 enabled：预设模式的全量快照已无意义 → 清空；自定义模式保留子集。
          const skills = Array.isArray(value.skills)
            ? cleanSkills(value.skills)
            : isPreset
              ? []
              : cleanSkills(value.enabled)
          modes[id] = {
            label: preset ? preset.label : String(value.label || id),
            skills,
            color: typeof value.color === 'string' && value.color !== '' ? value.color : undefined,
          }
        }
      }
      const chatModes = Array.isArray(parsed.chatModes)
        ? [...new Set(parsed.chatModes.filter((item) => typeof item === 'string' && item !== ''))]
        : []
      let active = typeof parsed.active === 'string' ? parsed.active : ALL_ID
      if (active === 'search') active = 'research'
      if (active === 'default' || legacy) active = ALL_ID
      if (active !== ALL_ID && !modes[active]) active = ALL_ID
      return { active, chatModes, initialized: parsed.initialized === true, modes }
    }
  } catch {
    /* ignore */
  }
  return { active: ALL_ID, chatModes: [], initialized: false, modes: {} }
}

async function writeStore(store) {
  await mkdir(dirname(storeFile()), { recursive: true })
  await writeFile(storeFile(), JSON.stringify(store, null, 2), 'utf8')
}

/** 补齐缺失的预设模式（首次启动 + 后续新增预设都幂等生效）；预设不可删、可编辑成员。 */
async function ensureModes() {
  const store = await readStore()
  for (const preset of PRESETS) {
    if (!store.modes[preset.id]) store.modes[preset.id] = { label: preset.label, skills: [], color: preset.color }
  }
  store.initialized = true
  // 补颜色：预设固定色；自定义自动分配。
  for (const [id, mode] of Object.entries(store.modes)) {
    const preset = PRESETS.find((item) => item.id === id)
    if (preset) mode.color = preset.color
    else if (!mode.color) mode.color = pickColor(store, id)
  }
  if (store.active !== ALL_ID && !store.modes[store.active]) store.active = ALL_ID
  return store
}

function toPayload(store) {
  const ids = Object.keys(store.modes).sort((a, b) => {
    const ai = PRESETS.findIndex((preset) => preset.id === a)
    const bi = PRESETS.findIndex((preset) => preset.id === b)
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    }
    return a.localeCompare(b)
  })
  return {
    active: store.active,
    chatModes: Array.isArray(store.chatModes) && store.chatModes.length ? store.chatModes : [ALL_ID],
    modes: ids.map((id) => ({
      id,
      label: store.modes[id].label,
      skills: store.modes[id].skills || [],
      color: store.modes[id].color || MODE_COLORS[0],
      builtin: PRESETS.some((preset) => preset.id === id),
    })),
  }
}

/** 读取全部模式 + 当前激活模式。 */
export async function getModes() {
  const store = await ensureModes()
  await writeStore(store)
  return toPayload(store)
}

/** 新增自定义模式：只传显示名，id 后台自动生成（slug 或 mode-N）。 */
export async function addMode({ label, skills }) {
  const store = await ensureModes()
  const id = generateId(store, label)
  store.modes[id] = { label: String(label || '').trim() || id, skills: cleanSkills(skills), color: pickColor(store, id) }
  await writeStore(store)
  return toPayload(store)
}

/** 编辑模式：更新显示名与技能子集。 */
export async function saveMode({ id, label, skills }) {
  if (typeof id !== 'string' || id === '') throw userError('缺少模式 id')
  if (id === ALL_ID) throw userError('all 不可编辑')
  const store = await ensureModes()
  const mode = store.modes[id]
  if (!mode) throw userError('模式不存在：' + id)
  mode.label = String(label || '').trim() || id
  mode.skills = cleanSkills(skills)
  await writeStore(store)
  return toPayload(store)
}

/** 删除模式（all 与内置预设 coding/search 不可删）。 */
export async function deleteMode({ id }) {
  if (typeof id !== 'string' || id === '') throw userError('缺少模式 id')
  if (id === ALL_ID || PRESETS.some((preset) => preset.id === id)) throw userError('内置模式不可删除')
  const store = await ensureModes()
  if (!store.modes[id]) throw userError('模式不存在：' + id)
  delete store.modes[id]
  if (store.active === id) store.active = ALL_ID
  await writeStore(store)
  return toPayload(store)
}

/** 共享的「应用技能子集」：want=null 表示全集，否则只激活 want 里的技能名，其余不激活。 */
async function applyWant(store, want) {
  const snapshot = await scanSkills()
  const errors = []
  for (const skill of snapshot.skills) {
    if (skill.status === 'orphan') continue
    const shouldEnable = want === null ? true : want.has(skill.name)
    if (shouldEnable) {
      if (skill.status !== 'enabled') {
        try {
          await toggleSkill({ name: skill.name, source: skill.path, enable: true })
        } catch (cause) {
          errors.push(`${skill.name}: ${cause?.message || cause}`)
        }
      }
    } else if (skill.status === 'enabled') {
      try {
        await toggleSkill({ name: skill.name, enable: false })
      } catch (cause) {
        errors.push(`${skill.name}: ${cause?.message || cause}`)
      }
    }
  }
  await writeStore(store)
  // 重新扫描，返回切换后的最终状态（激活 / 未激活总数），而非本次切换的增量。
  const after = await scanSkills()
  const skills = after.skills.filter((skill) => skill.status !== 'orphan')
  const enabled = skills.filter((skill) => skill.status === 'enabled').length
  return { enabled, disabled: skills.length - enabled, errors }
}

/** 切换单个模式（面板 tab 用）：应用该子集（all = 激活全部），并把 active 记为该模式。 */
export async function applyMode({ id }) {
  if (typeof id !== 'string' || id === '') throw userError('缺少模式 id')
  const store = await ensureModes()
  if (id !== ALL_ID && !store.modes[id]) throw userError('模式不存在：' + id)

  const want = id === ALL_ID ? null : new Set(store.modes[id].skills || [])
  store.active = id
  const stats = await applyWant(store, want)
  return { active: id, ...stats }
}

/** 多选应用（聊天输入框的模式选择用）：激活所选模式的技能并集，保存 chatModes。 */
export async function applyModes({ ids }) {
  const store = await ensureModes()
  const list = Array.isArray(ids)
    ? [...new Set(ids.map((item) => String(item).trim()).filter(Boolean))]
    : []

  // 空选择或包含 all → 全集。
  if (list.length === 0 || list.includes(ALL_ID)) {
    store.chatModes = [ALL_ID]
    const stats = await applyWant(store, null)
    return { selection: [ALL_ID], ...stats }
  }

  const want = new Set()
  for (const id of list) {
    if (!store.modes[id]) throw userError('模式不存在：' + id)
    for (const name of store.modes[id].skills || []) want.add(name)
  }
  store.chatModes = list
  const stats = await applyWant(store, want)
  return { selection: list, ...stats }
}
