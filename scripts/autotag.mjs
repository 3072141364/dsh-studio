// 一次性自动打标脚本：按技能名/描述归类到 5 个分组，写入 groups.json。
// 用法：node scripts/autotag.mjs（需要 ~/.dsh 写权限）
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { scanSkills, dshHome } from '../lib/scanner.js'

// 显式归类表（基于技能名 + 描述语义）。
const MAP = {
  // —— 产品 / 战略 / 增长 / 研究 / 分析 ——
  'ab-test-analysis': ['pm-skill'],
  'analyze-feature-requests': ['pm-skill'],
  'ansoff-matrix': ['pm-skill'],
  'beachhead-segment': ['pm-skill'],
  'brainstorm-experiments-existing': ['pm-skill'],
  'brainstorm-experiments-new': ['pm-skill'],
  'brainstorm-ideas-existing': ['pm-skill'],
  'brainstorm-ideas-new': ['pm-skill'],
  'brainstorm-okrs': ['pm-skill'],
  'business-model': ['pm-skill'],
  'cohort-analysis': ['pm-skill'],
  'competitive-battlecard': ['pm-skill'],
  'competitor-analysis': ['pm-skill'],
  'create-prd': ['pm-skill'],
  'customer-journey-map': ['pm-skill'],
  'draft-nda': ['pm-skill'],
  'growth-loops': ['pm-skill'],
  'gtm-motions': ['pm-skill'],
  'gtm-strategy': ['pm-skill'],
  'ideal-customer-profile': ['pm-skill'],
  'identify-assumptions-existing': ['pm-skill'],
  'identify-assumptions-new': ['pm-skill'],
  'interview-script': ['pm-skill'],
  'job-stories': ['pm-skill'],
  'lean-canvas': ['pm-skill'],
  'market-segments': ['pm-skill'],
  'market-sizing': ['pm-skill'],
  'marketing-ideas': ['pm-skill'],
  'metrics-dashboard': ['pm-skill'],
  'monetization-strategy': ['pm-skill'],
  'north-star-metric': ['pm-skill'],
  'opportunity-solution-tree': ['pm-skill'],
  'outcome-roadmap': ['pm-skill'],
  'pestle-analysis': ['pm-skill'],
  'porters-five-forces': ['pm-skill'],
  'positioning-ideas': ['pm-skill'],
  'pre-mortem': ['pm-skill'],
  'pricing-strategy': ['pm-skill'],
  'prioritization-frameworks': ['pm-skill'],
  'prioritize-assumptions': ['pm-skill'],
  'prioritize-features': ['pm-skill'],
  'privacy-policy': ['pm-skill'],
  'product-name': ['pm-skill'],
  'product-strategy': ['pm-skill'],
  'product-vision': ['pm-skill'],
  'release-notes': ['pm-skill'],
  'retro': ['pm-skill'],
  'review-resume': ['pm-skill'],
  'sentiment-analysis': ['pm-skill'],
  'sprint-plan': ['pm-skill'],
  'stakeholder-map': ['pm-skill'],
  'startup-canvas': ['pm-skill'],
  'strategy-red-team': ['pm-skill'],
  'summarize-interview': ['pm-skill'],
  'summarize-meeting': ['pm-skill'],
  'swot-analysis': ['pm-skill'],
  'test-scenarios': ['pm-skill'],
  'user-personas': ['pm-skill'],
  'user-segmentation': ['pm-skill'],
  'user-stories': ['pm-skill'],
  'value-prop-statements': ['pm-skill'],
  'value-proposition': ['pm-skill'],
  'wwas': ['pm-skill'],
  'traft-requirements': ['pm-skill'],

  // —— GitNexus ——
  'gitnexus-cli': ['gitnexus'],
  'gitnexus-debugging': ['gitnexus'],
  'gitnexus-exploring': ['gitnexus'],
  'gitnexus-guide': ['gitnexus'],
  'gitnexus-impact-analysis': ['gitnexus'],
  'gitnexus-pr-review': ['gitnexus'],
  'gitnexus-refactoring': ['gitnexus'],

  // —— 编程 / 开发工具 ——
  'claude-md-improver': ['program'],
  'dummy-dataset': ['program'],
  'sql-queries': ['program'],
  'archify': ['program'],
  'traft-code-comment': ['program'],
  'traft-code-debug': ['program'],
  'traft-code-git': ['program'],
  'traft-code-graph': ['program'],
  'traft-code-implement': ['program'],
  'traft-code-intelligence': ['program'],
  'traft-code-make': ['program'],
  'traft-code-review': ['program'],
  'traft-create-skill': ['program'],
  'traft-guideline': ['program'],
  'traft-perfetto-trace': ['program'],
  'nio-dev': ['program'],
  'nio-niofs': ['program'],
  'skill-creator': ['program'],

  // —— Obsidian / 知识库 ——
  'traft-code-docs': ['obsidian'],
  'traft-homepage': ['obsidian'],
  'traft-obsidian': ['obsidian'],
  'traft-obsidian-cli': ['obsidian'],
  'traft-obsidian-emoji': ['obsidian'],
  'traft-query': ['obsidian'],
  'traft-task': ['obsidian'],
  'traft-todos': ['obsidian'],

  // —— UI / UX / 设计 ——
  'banner-design': ['uiux'],
  'brand': ['uiux'],
  'design': ['uiux'],
  'design-system': ['uiux'],
  'slides': ['uiux'],
  'ui-styling': ['uiux'],
  'ui-ux-pro-max': ['uiux'],
  'frontend-design': ['uiux'],
}

const storeFile = () => join(dshHome(), 'storages', 'dsh-studio', 'groups.json')

const scan = await scanSkills()
const scannedNames = scan.skills.map((s) => s.name)

// 校验：扫描到的技能是否都被覆盖
const unmapped = scannedNames.filter((n) => !(n in MAP))
const stale = Object.keys(MAP).filter((n) => !scannedNames.includes(n))

// 读现有 store（保留 groups 列表 + 未覆盖的既有手打标签）
let store
try {
  store = JSON.parse(await fs.readFile(storeFile(), 'utf8'))
} catch {
  store = { groups: [], assignments: {} }
}

const assignments = {}
for (const name of scannedNames) {
  if (name in MAP) assignments[name] = MAP[name]
  else if (Array.isArray(store.assignments?.[name])) assignments[name] = store.assignments[name]
}
store.assignments = assignments

await fs.mkdir(dirname(storeFile()), { recursive: true })
await fs.writeFile(storeFile(), JSON.stringify(store, null, 2) + '\n')

// 汇总
const count = {}
for (const groups of Object.values(assignments)) {
  for (const g of groups) count[g] = (count[g] || 0) + 1
}
console.log('已写入 assignments，共', scannedNames.length, '个技能')
console.log('分组计数:', JSON.stringify(count))
if (unmapped.length) console.log('未打标（无匹配规则）:', unmapped.join(', '))
if (stale.length) console.log('规则里有但当前未安装:', stale.join(', '))
