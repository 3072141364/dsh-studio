/**
 * 描述翻译：把「非中文」的技能介绍批量交给大模型翻译成简体中文，
 * 存到 translations.json，前端卡片仍显示原文，hover 时弹出中文。
 *
 * 存盘：~/.dsh/storages/dsh-studio/translations.json
 * 形状：{ "<skill-name>": "<中文介绍>" }
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { dshHome, scanSkills } from './scanner.js'
import { resolveRoute, callLlm, extractJson } from './autotag.js'

const CJK_RE = /[\u4e00-\u9fff]/

const SYSTEM = [
  'You translate agent-skill descriptions from any language into Simplified Chinese (简体中文).',
  'You receive a list of skills (name + description) and return a JSON mapping of skill-name -> Chinese description.',
  'Keep technical terms, product names, commands, identifiers and tool names in English where natural.',
  'Be concise: one sentence is enough; preserve the original meaning.',
  'Return strict JSON only — no markdown fences, no commentary — exactly this shape:',
  '{"<skill-name>": "<中文介绍>"}',
].join('\n')

function storeFile() {
  return join(dshHome(), 'storages', 'dsh-studio', 'translations.json')
}

async function readStore() {
  try {
    const raw = await readFile(storeFile(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clean = {}
      for (const [name, value] of Object.entries(parsed)) {
        if (typeof value === 'string' && value.trim()) clean[name] = value.trim()
      }
      return clean
    }
  } catch {
    /* ignore */
  }
  return {}
}

async function writeStore(store) {
  await mkdir(dirname(storeFile()), { recursive: true })
  await writeFile(storeFile(), JSON.stringify(store, null, 2), 'utf8')
}

/** 非空且不含中文 → 需要翻译。 */
function needsTranslation(description) {
  const text = String(description || '').trim()
  return text !== '' && !CJK_RE.test(text)
}

/** 读取已翻译的中文介绍。 */
export async function getTranslations() {
  return readStore()
}

/**
 * 给所有「介绍非中文且尚未翻译」的技能批量翻译成中文。
 * 无可用路由 / 模型失败 / 输出不可解析时跳过并返回 warning（不抛错）。
 * @param {object} ctx - 已注入 llm + agentDefaultModel 的 Cordis 作用域。
 * @param {{provider?:string, model?:string}} [opts] 用户选择的模型路由。
 */
export async function translateSkills(ctx, opts = {}) {
  const scan = await scanSkills()
  const store = await readStore()
  const pending = scan.skills.filter((skill) => needsTranslation(skill.description) && !store[skill.name])
  const base = { total: scan.skills.length, translated: 0 }
  if (pending.length === 0) return base

  let route
  try {
    route = opts.provider && opts.model
      ? { provider: opts.provider, model: opts.model }
      : await resolveRoute(ctx)
  } catch (cause) {
    return { ...base, skipped: true, warning: String(cause?.message || cause) }
  }

  const BATCH = 20
  let translatedCount = 0
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH)
    const lines = batch.map((skill) => `- ${skill.name}: ${String(skill.description || '').slice(0, 300)}`).join('\n')
    const input = `Translate these skill descriptions to Simplified Chinese:\n${lines}\n\nReturn the JSON mapping now.`

    let text
    try {
      text = await callLlm(ctx, SYSTEM, input, route)
    } catch (cause) {
      if (translatedCount === 0) return { ...base, skipped: true, warning: String(cause?.message || cause) }
      break
    }

    let parsed
    try {
      parsed = extractJson(text)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('模型返回的 JSON 结构不对')
    } catch (cause) {
      if (translatedCount === 0) return { ...base, skipped: true, warning: '解析模型输出失败：' + String(cause?.message || cause) }
      break
    }

    for (const skill of batch) {
      const value = parsed[skill.name]
      if (typeof value === 'string' && value.trim()) {
        store[skill.name] = value.trim()
        translatedCount += 1
      }
    }
  }

  if (translatedCount > 0) await writeStore(store)
  return { total: scan.skills.length, translated: translatedCount }
}
