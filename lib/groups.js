/**
 * 分组 / 标签：技能 → 分组 的归属关系。
 * 持久化到 ~/.dsh/storages/dsh-studio/groups.json；预置 5 个分组。
 */
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { dshHome } from './scanner.js'

/** 技能名 / 分组 id 规范：小写 kebab-case。 */
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const DEFAULT_GROUPS = [
  { id: 'pm-skill', label: 'pm-skill', color: '#14b8a6' },
  { id: 'gitnexus', label: 'gitnexus', color: '#0ea5e9' },
  { id: 'program', label: 'program', color: '#f59e0b' },
  { id: 'obsidian', label: 'obsidian', color: '#8b5cf6' },
  { id: 'uiux', label: 'uiux', color: '#ec4899' },
]

function userError(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

function storeFile() {
  return join(dshHome(), 'storages', 'dsh-studio', 'groups.json')
}

async function readStore() {
  try {
    const raw = await fs.readFile(storeFile(), 'utf8')
    const data = JSON.parse(raw)
    return {
      groups: Array.isArray(data.groups) && data.groups.length > 0 ? data.groups : DEFAULT_GROUPS,
      assignments: data.assignments && typeof data.assignments === 'object' ? data.assignments : {},
    }
  } catch {
    return { groups: DEFAULT_GROUPS, assignments: {} }
  }
}

async function writeStore(data) {
  await fs.mkdir(dirname(storeFile()), { recursive: true })
  await fs.writeFile(storeFile(), JSON.stringify(data, null, 2))
}

/** 读取分组清单 + 技能归属。 */
export async function getGroups() {
  return readStore()
}

/** 覆盖某个技能的归属分组（空数组 = 清空该技能的所有标签）。 */
export async function setSkillGroups({ name, groups }) {
  if (typeof name !== 'string' || !NAME_RE.test(name)) throw userError('技能名不合法')
  const store = await readStore()
  const known = new Set(store.groups.map((group) => group.id))
  const clean = [...new Set((Array.isArray(groups) ? groups : []).map(String))].filter((id) => known.has(id))
  if (clean.length > 0) store.assignments[name] = clean
  else delete store.assignments[name]
  await writeStore(store)
  return { name, groups: clean }
}

/** 新增一个分组。 */
export async function addGroup({ id, label, color }) {
  if (typeof id !== 'string' || !NAME_RE.test(id)) throw userError('分组 id 不合法（需小写 kebab-case）')
  const store = await readStore()
  if (store.groups.some((group) => group.id === id)) throw userError('分组已存在：' + id)
  store.groups.push({ id, label: String(label || id).trim() || id, color: String(color || '#64748b') })
  await writeStore(store)
  return { id, groups: store.groups }
}

/** 重命名 / 换色一个分组（id 不变）。 */
export async function renameGroup({ id, label, color }) {
  if (typeof id !== 'string' || !NAME_RE.test(id)) throw userError('分组 id 不合法（需小写 kebab-case）')
  const store = await readStore()
  const group = store.groups.find((item) => item.id === id)
  if (!group) throw userError('分组不存在：' + id)
  if (label !== undefined) group.label = String(label).trim() || group.label
  if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)) group.color = color
  await writeStore(store)
  return { groups: store.groups }
}

/** 删除一个分组，并从所有技能的归属里移除它。 */
export async function deleteGroup({ id }) {
  if (typeof id !== 'string' || id === '') throw userError('缺少分组 id')
  const store = await readStore()
  const idx = store.groups.findIndex((item) => item.id === id)
  if (idx < 0) throw userError('分组不存在：' + id)
  store.groups.splice(idx, 1)
  for (const name of Object.keys(store.assignments)) {
    store.assignments[name] = store.assignments[name].filter((item) => item !== id)
    if (store.assignments[name].length === 0) delete store.assignments[name]
  }
  await writeStore(store)
  return { groups: store.groups, assignments: store.assignments }
}

const GROUP_COLORS = ['#14b8a6', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#ef4444', '#6366f1', '#f97316', '#64748b']

/**
 * 批量应用自动打标结果：确保新分组存在（缺色自动补），并一次性写回归属。
 * @param {{tags: Record<string, string[]>}} input tags: 技能名 -> 分组 id 数组
 */
export async function applyAutoTags({ tags }) {
  const store = await readStore()
  const known = new Set(store.groups.map((group) => group.id))
  const usedColors = new Set(store.groups.map((group) => group.color))
  const newGroups = []
  const ensureGroup = (id) => {
    if (known.has(id)) return
    if (!NAME_RE.test(id)) return
    const color = GROUP_COLORS.find((c) => !usedColors.has(c)) || GROUP_COLORS[newGroups.length % GROUP_COLORS.length]
    store.groups.push({ id, label: id, color })
    known.add(id)
    usedColors.add(color)
    newGroups.push(id)
  }
  for (const ids of Object.values(tags || {})) {
    for (const id of ids || []) ensureGroup(String(id))
  }
  for (const [name, ids] of Object.entries(tags || {})) {
    if (typeof name !== 'string' || !NAME_RE.test(name)) continue
    const clean = [...new Set((ids || []).map(String).filter((id) => known.has(id)))]
    if (clean.length > 0) store.assignments[name] = clean
  }
  await writeStore(store)
  return { groups: store.groups, assignments: store.assignments, newGroups }
}
