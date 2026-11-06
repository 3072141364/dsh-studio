# 方案设计 — dsh-studio · Skill 管理功能

> 需求见 [PRD-skill-management.md](./PRD-skill-management.md)。本文档是阶段②的方案设计与技术方案，聚焦 v1（F1 扫描 / F2 卡片与安装 / F3 分组 / F7 入口）。

## 1. 总体架构

dsh-studio 是一个 DSH cordis 插件包（npm，TS/ESM），**双端**：host 端跑在 DSH 主进程，client 端注入 web GUI。

```
各 agent 技能目录 ──只读扫描──▶ 工作台面板(卡片) ──开关/安装──▶ ~/.dsh/skills(软链) ──DSH自动热载──▶ 下一回合生效
  claude / omp / pi            ▲ 侧栏「技能」按钮呼出        软链增删即状态
  opencode / codex             └ 分组标签 · 模式切换
```

- **host 端**：技能扫描器、状态存储（分组/标签/模式/来源）、软链操作服务。
- **client 端**：侧栏「技能」按钮 + 技能管理面板（React，经 `dsh.client` 注入）。
- **核心机制复用**：不改 DSH 加载逻辑；只通过「软链增删」驱动 DSH 文件系统 provider，后者用 chokidar 监听 + `agent/pre-step` 每回合重扫，**下一回合自动生效，无需重启**（已查证）。

## 2. 关键设计决策（ADR 摘要）

- **D1 · 开关 = 软链增删，不改 frontmatter**：DSH 原生热载软链变更；改写源 SKILL.md 会污染 claude/omp 等源目录，且这些目录未必可写。启用 = `~/.dsh/skills/<name>` 软链存在，禁用/卸载 = 移除软链（源目录保留）。
- **D2 · 扫描只读，导入用软链**：面板只读扫描各 agent 目录展示；「安装/导入」= 软链进 `~/.dsh/skills`，不复制、不删除源目录。
- **D3 · 分组/标签/模式存工作台自身状态**：落一个 JSON 状态文件（`~/.dsh/storages/dsh-studio.json`），不写进任何 SKILL.md。
- **D4 · 模式切换 = 批量软链差异**：每个模式绑定一组「组 + 技能」；切换时计算目标集与当前软链集的差集，批量增删。
- **D5 · 来源标签自动打**：扫描时按 agent 目录打来源标签（`claude`/`omp`/`pi`/`opencode`/`codex`），每标签内置颜色。

## 3. 技能数据模型（SkillCard）

| 字段 | 含义 | 来源 |
|---|---|---|
| `name` | kebab-case 技能名（DSH 规范） | SKILL.md frontmatter |
| `description` | 摘要 | frontmatter |
| `sourceAgent` | claude / omp / pi / opencode / codex / dsh / bundled / local | 扫描目录判定 |
| `status` | enabled（软链存在）/ disabled（源在、无软链）/ orphan（软链断） | 软链状态 |
| `groups` | 自定义分组（标签），含颜色 | 工作台状态 |
| `path` | 源目录绝对路径 | 扫描 |
| `modelInvocable` | frontmatter `disable-model-invocation` 解析 | frontmatter |
| `installed` | 是否已导入 `~/.dsh/skills` | 软链/目录判断 |

## 4. 扫描器设计

统一识别两类形态：**目录-bundle**（`<dir>/SKILL.md`）与**平铺 .md**（根下 `*.md`），解析 frontmatter 的 `name`/`description`。实测本机路径：

| agent | 扫描根 | 形态 | 现状 |
|---|---|---|---|
| claude | `~/.claude/plugins`（marketplaces + `cache/*/<ver>/skills/*`），兜底 `~/.claude/skills` | 目录-bundle | 已装 pm-skills 等 |
| omp | `~/.omp/agent/skills` | 目录-bundle | 有 `nio-niofs` |
| pi | `~/.pi/agent/extensions` + `~/.pi/agent/npm` | 扩展/包（待方案细化） | 有 auth/extensions |
| opencode | `<project>/.opencode/skills`（项目级），兜底 `~/.opencode/skills` | 目录-bundle | 项目级存在 |
| codex | `~/.codex/skills` | 目录-bundle | 未装（空），仍需支持 |

去重规则：同名技能按 `sourceAgent` 优先级（dsh > 本地导入 > 各 agent）取其一；展示时保留全部来源，冲突打标。

## 5. 安装 / 卸载 / 开关

- **安装**（本地目录 / git 地址 / GitHub URL）：`git clone` 或定位目录 → 解析出 skill 目录 → `ln -s <源> ~/.dsh/skills/<name>`。
- **卸载**：删除 `~/.dsh/skills/<name>` 软链（源目录保留，可一键恢复）。
- **开关**：软链存在 ⇄ 移除。v1「禁用」即移除软链；「禁用但保留可恢复」用状态文件记录源路径。
- **刷新兜底**：改动后 DSH 自动热载；面板的「刷新」按钮仅显式重扫一次兜底（非必需）。

## 6. 分组 / 标签 / 模式

- **分组 = 标签**：一技能多组；每组一个颜色。来源 agent 是内建标签（自动打、不可删）。
- **检索**：按名称 + 标签组合过滤。
- **模式**（v2，但模型先行）：`{ name, groups[], skills[] }`；切换模式 = 对目标集与当前软链集求差，批量增删。coding / office 为预置示例，用户可自定义。

## 7. UI MVP 设计

### 7.1 界面布局（wireframe）

```
┌─ DSH Web GUI ──────────────────────────────────────────────────────┐
│ [侧栏]           │  工作台 · 技能管理                                │
│  会话            │  ┌─────────────────────────────────────────────┐ │
│  插件            │  │ 模式: [coding▾] [office▾] [＋自定义]          │ │
│  ┌─ 技能 ◀新    │  │ [＋ 安装] [⟳ 刷新]  搜索: [____________]      │ │
│  └────────       │  │ 标签: ●claude ●omp ●pi ●opencode ●codex      │ │
│                  │  │       ●自定义组…   状态:[全部|已启用|已禁用]   │ │
│                  │  ├─────────────────────────────────────────────┤ │
│                  │  │ ┌──────────┐ ┌──────────┐ ┌──────────┐      │ │
│                  │  │ │create-prd │ │swot-analysis│ │retro    │     │ │
│                  │  │ │claude ●开 │ │omp   ●开  │ │codex ●关 │     │ │
│                  │  │ │[开关][卸载]│ │[开关][卸载]│ │[开关][卸载]│   │ │
│                  │  │ └──────────┘ └──────────┘ └──────────┘      │ │
│                  │  │                    …(卡片网格)               │ │
└──────────────────┴─────────────────────────────────────────────────┘
```

### 7.2 交互流程

1. 点击侧栏「技能」→ 打开面板。
2. 首次打开自动扫描各 agent 目录，产出卡片（含来源标签 + 状态）。
3. 卡片操作：开关（软链增删）、卸载、查看 SKILL.md、加入分组（点标签）。
4. 「＋ 安装」→ 弹层输入 git/GitHub/本地目录 → 导入软链 → 卡片状态更新。
5. 顶部模式下拉切换 coding/office → 批量开关对应组/技能。

### 7.3 挂载点（DSH 原生，已查证）

- 侧栏入口：`dsh-client-ui-sidebar`（插件下方新增按钮/行）。
- 面板：`dsh.client`（package.json `dsh.client.inject` + `exports["./client"]`，`window.__ModuleLoader__.load`），或 `shell.overlay`/`slots`。
- 参考实现：`@deepseek-ai/dsh-client-ui-skill`（已有技能工具行 + 引用面板）。

## 8. 包目录结构

```
dsh-studio/
├── package.json          # dsh.bundle.patch + dsh.client
├── cordis.patch.yml      # 插入 dsh-studio bundle
├── lib/
│   ├── index.js          # host apply()：注册扫描/状态/软链服务
│   ├── scanner.js        # 各 agent 目录扫描（只读）
│   ├── state.js          # 分组/标签/模式状态 JSON 读写
│   └── skills.js         # 软链 install/uninstall/toggle
├── client.js             # web UI（React，经 __ModuleLoader__ 注入）
└── locale/{en,zh}.json
```

## 9. 里程碑（v1 任务拆解）

1. M1 骨架：cordis 插件包 + 侧栏「技能」按钮 + 空面板（验证双端注入）。
2. M2 扫描器：claude/omp/pi/opencode/codex 扫描 + 卡片列表（来源标签/状态）。
3. M3 操作闭环：开关 / 卸载 / 安装（git/GitHub/本地）+ 软链写入 `~/.dsh/skills`。
4. M4 分组与检索：自定义分组 + 颜色 + 标签检索 + 来源自动标签。
5. M5 验收：对照 PRD 的 KR1–KR3 跑通，确认「软链改动下一回合生效」。

## 10. 风险与缓解

| 风险 | 缓解 |
|---|---|
| pi / opencode 技能形态不确定（扩展/项目级） | 扫描器做成「探测式」：目录缺失或形态未知时静默跳过，兜底全局目录 |
| 同名技能冲突 | 按 sourceAgent 优先级去重 + 面板冲突标注 |
| 软链断链（源被删/移动） | status=orphan 识别，提示重装 |
| 开关高频改动触发大量 watcher 事件 | 依赖 DSH 已有防抖（stabilityThreshold）；v1 不做额外优化 |
