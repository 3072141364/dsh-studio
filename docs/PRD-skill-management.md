# PRD — dsh-studio · Skill 管理功能

## 1. Summary

dsh-studio 是 DSH 的个人工作台插件，第一个模块做「Skill 管理」：自动扫描机器上 claude / omp / pi / opencode / gpt 等 agent 的技能，统一进一个图形化面板，用卡片完成安装、卸载、启停、分组，并按「模式」（coding / office …）一键切换激活的技能集合。目标是把跨 agent 的技能管理从敲命令变成点按钮，一眼看清当前哪些技能可用。

## 2. Contacts

单人自用项目，暂无协作联系人（省略）。

## 3. Background

- 现状：DSH 的技能由 `~/.dsh/skills` 软链 + 内置 preset + 插件自带技能组成，管理全靠命令行软链（如手动链 66 个 pm-skills）。
- 痛点：claude / omp / pi / opencode / gpt 等 agent 各有独立技能目录（已实测：`~/.claude/plugins`、`~/.omp/agent`、`~/.pi/agent`、`~/.opencode/skills`、ChatGPT 桌面目录），互不可见、管理分散；启停、分组、按场景切换都没有 UI。
- Why now：dsh-studio 工作台立项，skill 管理是最高频、最痛的起点；后续周报 / obsidian / 论文模块会复用同一工作台容器。

## 4. Objective

- 目标：在 DSH 里图形化统一管理所有 agent 的技能，一键按场景激活。
- 对齐：dsh-studio 工作台第一个落地模块，同时验证「工作台容器 + 插件化」框架。
- Key Results：
  - KR1：面板能列出 ≥5 个 agent（claude / omp / pi / opencode / gpt）的全部技能，并标注来源与状态。
  - KR2：安装 / 卸载 / 启停单个技能全程不离开 GUI、无需命令行，单技能 ≤3 次点击。
  - KR3：可创建分组并按「模式」一键切换激活集合，切换后下一回合自动生效（免重启）。

## 5. Market Segment(s)

- 唯一段：DSH 个人用户（v1 先自用 = 作者本人）。
- job：在多 agent 间管理技能，并按场景（coding / office）切换当前激活技能。
- 约束：本机、单用户；不做多用户 / 云同步 / 公开发布。

## 6. Value Proposition

- Who：DSH 个人用户（作者）。
- Why：技能散在多个 agent，装 / 卸 / 启停要敲命令，无法按场景一键切换。
- What before：手动 find + `ln -s` 管理 `~/.dsh/skills`；其他 agent 的技能靠记忆和手抄路径。
- How：一个工作台面板自动扫描各 agent 技能目录，卡片化展示，点开关 / 卸载 / 安装，标签分组 + 模式切换。
- What after：秒级看清并切换当前激活技能集合，无需命令行；跨 agent 技能统一可见可管。
- Alternatives：继续命令行软链；或各 agent 各自的技能 UI（无统一视图）。
- 一句话 VP：让 DSH 用户把「跨 agent 管理技能」从敲命令变成点按钮，并按场景一键切换。

## 7. Solution

### 7.1 UX / Prototypes

暂无原型（方案阶段补）。核心入口：左侧栏「插件」下方新增「技能」按钮 → 呼出技能管理面板。

### 7.2 Key Features

- **F1 自动扫描与来源识别**：扫描 claude / omp / pi / opencode / gpt 的技能目录并纳入面板；识别每个技能的归属 agent，卡片上标注来源。
- **F2 技能卡片 + 图形化操作**：卡片显示名称、描述、来源 agent、状态、所属分组；一键启用 / 禁用（开关）、卸载、查看 SKILL.md 内容；支持从本地目录 / git 地址 / GitHub URL 安装。
- **F3 分组（标签）**：给技能添加分组（标签）；按组激活 / 停用；每组一个颜色；自动打来源标签（如 claude 技能默认带 `claude` 标签）；按标签检索。
- **F4 模式**：自定义模式（如 coding、office），每个模式绑定一组 skill 组或单个 skill；一键切换模式，激活对应技能集合。
- **F5 一键安装 / 导入**：支持 GitHub 地址或 skill 包名，一键安装 / 导入到 DSH。
- **F6 对话内激活提示**：对话时在界面提示当前激活了哪些 skill（及来自哪个模式 / 组）。
- **F7 UI 入口**：左侧栏「插件」下方新增「技能」按钮，呼出 skill 管理面板。

### 7.3 Technology

- dsh-studio = DSH cordis 插件（npm 包，TS/ESM），注册进 profile 的 `dsh.profile.bundles`；`dsh.bundle.patch` 指向 `cordis.patch.yml`（参考已装 `@tt-a1i/archify-dsh` / `@liustack/modlens`）。
- 面板作为 DSH web GUI 的一个页面 / 路由；数据层读写 `~/.dsh/skills` 及各 agent 技能目录。
- 技能提供侧复用 `@deepseek-ai/dsh-skill-filesystem`（参考 archify-dsh 的 `bundledSkillDir` 用法）。

### 7.4 技术可行性结论（已查证 DSH 源码）与待定项

- ✅ **激活过滤器**：DSH 技能自带 `invocation` 策略（`modelInvocable` / `userInvocable`），frontmatter 支持 `disable-model-invocation` / `user-invocable`；模型侧目录过滤 `modelInvocable`，会话 UI 目录过滤 `userInvocable`。→「一键开关」= 写回 SKILL.md 的 `disable-model-invocation`（或删软链）。
- ✅ **刷新会话（免重启）**：DSH 文件系统 provider 用 chokidar 监听全部技能根目录（含软链），改动即失效缓存并发 `skills/change`；`agent/pre-step` 每回合重扫，变化时自动注入「技能目录已变化」提醒。→ 增删软链后**下一回合自动生效，无需重启**。「确认按钮」仅作显式重扫兜底，非必需。
- ✅ **UI 扩展点**：插件经 package.json `dsh.client` + `exports["./client"]` 注入 web UI；已有 `dsh-plugin-manager`（侧栏「插件」）、`dsh-client-ui-skill`（技能工具行/引用面板）、`dsh-client-ui-sidebar-*`/`slots` 等。→ F7「技能按钮」、F6「对话内提示」都有现成挂载位。
- ⚠️ **扫描其他 agent**：DSH 默认只扫 `~/.dsh/skills`、`~/.agents/skills`、项目 `.dsh/skills`/`.agents/skills`、`customSkillDirs`、插件 bundled 目录；**不直接扫 claude/omp/pi/opencode/codex**。→ 工作台自行只读扫描这些目录 + 软链导入 `~/.dsh/skills`（DSH 即自动加载），或注册 `customSkillDirs`/自定义 provider。
- 【待定】`gpt` = codex（`~/.codex/skills`，本机可能尚未安装，仍需支持）；各 agent 精确路径枚举留到方案阶段。
- 【待定】「包名安装」的 registry 来源；v1 只做 GitHub URL + git + 本地目录。
- 【假设】扫描其他 agent 只读 + 可导入，不回写、不删除源目录。

## 8. Release

- **v1（先交付）**：F1（扫描 + 来源识别）、F2（卡片 + 启停 / 卸载 / 查看 + 本地目录 / git / GitHub 安装）、F3（分组 / 标签 / 颜色 / 检索）、F7（UI 入口）。
- **v2（后续）**：F4（模式系统）、F6（对话内激活提示）、F5 的包名一键装、marketplace 解析。
- **明确不做（防蔓延）**：不做技能编辑器（复用 `traft-create-skill`）；不做多用户 / 云同步 / 公开发布；v1 不做 marketplace.json 完整解析。
- 工期：相对量级——v1 约 1–2 周（单人），v2 视 DSH 技能激活机制复杂度另估。
