/**
 * 自动打标：扫描技能，把「没有标签」的技能交给大模型按描述归类，
 * 复用已有分组，或按需新建分组，最后一次性写回 groups.json。
 *
 * 不 import 任何 @deepseek-ai/* 包：通过 Cordis 注入的 ctx.llm /
 * ctx.agentDefaultModel 服务直接调模型，message 手工构造。
 */
import { randomUUID } from 'node:crypto'
import { scanSkills } from './scanner.js'
import { getGroups, applyAutoTags } from './groups.js'

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const SYSTEM = [
  'You classify agent skills into tags.',
  'You receive a list of existing tags and a list of skills (name + description).',
  'Assign 0 to 3 tags per skill. Prefer existing tag ids. Invent a new lowercase-kebab-case tag id only when no existing tag fits, and only when clearly justified.',
  'Return strict JSON only — no markdown fences, no commentary — exactly this shape:',
  '{"<skill-name>": ["tag-id", ...]}',
  'Use an empty array for a skill that fits no tag. Every tag id must match /^[a-z0-9]+(-[a-z0-9]+)*$/.',
].join('\n')

/** 已注册 provider 里，默认模型若确有 adapter，优先返回它；否则退回首个有模型的 provider。 */
export async function resolveRoute(ctx) {
  const registered = ctx.llm.listProviders()
  try {
    const selection = ctx.agentDefaultModel?.currentSelection?.()
    if (selection && selection.provider && selection.model) {
      if (registered.some((provider) => provider.id === selection.provider)) {
        return { provider: selection.provider, model: selection.model }
      }
    }
  } catch {
    /* ignore */
  }
  for (const provider of registered) {
    try {
      const models = await ctx.llm.listModels(provider.id)
      if (models.length > 0) return { provider: provider.id, model: models[0].id }
    } catch {
      /* ignore */
    }
  }
  throw new Error('没有可用的模型路由（llm 未就绪或没有已注册的 provider）')
}

/**
 * 列出可供选择的模型路由（provider/model），并给出默认选择。
 * @returns {{routes: {provider:string,model:string,label:string}[], defaultRoute:{provider:string,model:string}|null}}
 */
export async function listLlmRoutes(ctx) {
  const routes = []
  const seen = new Set()
  const registered = ctx.llm.listProviders()

  let defaultSel = null
  try {
    const selection = ctx.agentDefaultModel?.currentSelection?.()
    if (selection && selection.provider && selection.model && registered.some((p) => p.id === selection.provider)) {
      defaultSel = { provider: selection.provider, model: selection.model }
    }
  } catch {
    /* ignore */
  }

  const push = (provider, model) => {
    const key = provider.id + '\u0000' + model.id
    if (seen.has(key)) return
    seen.add(key)
    routes.push({
      provider: provider.id,
      model: model.id,
      label: `${provider.name || provider.id} · ${model.name || model.id}`,
    })
  }

  for (const provider of registered) {
    try {
      const models = await ctx.llm.listModels(provider.id)
      for (const model of models) push(provider, model)
    } catch {
      /* ignore */
    }
  }

  // 默认模型若没在目录里，仍补上一条供选择。
  if (defaultSel) {
    const provider = registered.find((p) => p.id === defaultSel.provider)
    if (provider) push(provider, { id: defaultSel.model, name: defaultSel.model })
  }

  // 默认优先 DeepSeek 账号的 flash 模型，其次 agentDefaultModel，最后第一个路由。
  const flash = routes.find((r) => /deepseek/i.test(r.provider) && /flash/i.test(r.model))
  const firstDeepSeek = routes.find((r) => /deepseek/i.test(r.provider))
  const defaultRoute = flash
    ? { provider: flash.provider, model: flash.model }
    : defaultSel
      ? { provider: defaultSel.provider, model: defaultSel.model }
      : firstDeepSeek
        ? { provider: firstDeepSeek.provider, model: firstDeepSeek.model }
        : routes.length > 0
          ? { provider: routes[0].provider, model: routes[0].model }
          : null

  return { routes, defaultRoute }
}

/** 一次无状态文本补全：返回模型输出的文本。 */
export async function callLlm(ctx, system, input, route, timeoutMs = 180000) {
  console.log(`[dsh-studio] llm → ${route.provider}/${route.model}`)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const call = await ctx.llm.prepareCall({ provider: route.provider, model: route.model, maxTokens: 4096 }, controller.signal)
    const messages = [
      {
        id: randomUUID(),
        role: 'user',
        content: [{ type: 'text', text: input }],
        source: { kind: 'dsh-studio-autotag' },
      },
    ]
    const options = { ...call.config, messages, system, signal: controller.signal }
    let text = ''
    for await (const chunk of call.stream(options)) {
      if (chunk.type === 'text-delta') text += chunk.text
    }
    if (text.trim() === '') throw new Error('模型没有返回文本')
    return text
  } finally {
    clearTimeout(timer)
  }
}

/** 从模型输出里抠出 JSON（容忍 ```json 围栏与前后杂散说明）。 */
export function extractJson(text) {
  const trimmed = String(text || '').trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('模型输出里没有 JSON')
  return JSON.parse(candidate.slice(start, end + 1))
}

/**
 * 给所有「未打标」的技能自动打标。
 * 无可用路由 / 模型调用失败 / 输出不可解析时，直接跳过并返回 warning（不抛错）。
 * @param {object} ctx - 已注入 llm + agentDefaultModel 的 Cordis 作用域。
 * @param {{provider?:string, model?:string}} [opts] 用户选择的模型路由。
 */
export async function autoTagSkills(ctx, opts = {}) {
  const scan = await scanSkills()
  const store = await getGroups()
  const assigned = new Set(Object.keys(store.assignments))
  const untagged = scan.skills.filter((skill) => !assigned.has(skill.name))
  const base = { total: scan.skills.length, tagged: 0, newGroups: [] }
  if (untagged.length === 0) return base

  let route
  try {
    route = opts.provider && opts.model
      ? { provider: opts.provider, model: opts.model }
      : await resolveRoute(ctx)
  } catch (cause) {
    return { ...base, skipped: true, warning: String(cause?.message || cause) }
  }

  const groupsLine = store.groups.map((group) => `${group.id}（${group.label}）`).join(', ') || '（无）'
  const skillsText = untagged.map((skill) => `- ${skill.name}: ${String(skill.description || '').slice(0, 200)}`).join('\n')
  const input = `Existing tags: ${groupsLine}\n\nSkills to tag:\n${skillsText}\n\nReturn the JSON mapping now.`

  let text
  try {
    text = await callLlm(ctx, SYSTEM, input, route)
  } catch (cause) {
    return { ...base, skipped: true, warning: String(cause?.message || cause) }
  }

  let parsed
  try {
    parsed = extractJson(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('模型返回的 JSON 结构不对')
  } catch (cause) {
    return { ...base, skipped: true, warning: '解析模型输出失败：' + String(cause?.message || cause) }
  }

  const tags = {}
  for (const skill of untagged) {
    const raw = Array.isArray(parsed[skill.name]) ? parsed[skill.name].map((value) => String(value)) : []
    tags[skill.name] = raw.filter((id) => NAME_RE.test(id))
  }

  const result = await applyAutoTags({ tags })
  const taggedCount = Object.values(tags).filter((ids) => ids.length > 0).length
  return { total: scan.skills.length, tagged: taggedCount, newGroups: result.newGroups }
}
