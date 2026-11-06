/**
 * 软链操作：开关 / 卸载 / 安装。
 *
 * 核心机制对齐 D1：启用 = 在 ~/.dsh/skills/<name> 建软链，禁用/卸载 = 移除软链
 * （源目录永远保留）。DSH 的文件系统 provider 会监听软链变化，下一回合自动生效。
 */
import { promises as fs } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { basename, dirname, join, resolve } from 'node:path'
import { dshHome, dshSkillsDir, parseFrontmatter } from './scanner.js'

const execFileAsync = promisify(execFile)

/** DSH 技能名规范：小写 kebab-case（与 dsh-skill 的 SKILL_NAME 一致）。 */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 用户输入导致的错误 → 400，而不是 500。 */
function userError(message) {
  const error = new Error(message)
  error.status = 400
  return error
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache', '.DS_Store'])

/** 安装（git clone）落地根。 */
function installRoot() {
  return join(dshHome(), 'storages', 'dsh-studio', 'installs')
}

async function ensureSkillsDir() {
  await fs.mkdir(dshSkillsDir(), { recursive: true })
}

/** 读目录里 SKILL.md 的 frontmatter：name + description。 */
async function readSkillMeta(dir) {
  let text = ''
  try {
    text = await fs.readFile(join(dir, 'SKILL.md'), 'utf8')
  } catch {
    text = ''
  }
  const meta = parseFrontmatter(text)
  const name = String(meta.name || '').trim() || basename(dir)
  if (!SKILL_NAME.test(name)) {
    throw userError(`技能名不合法：${JSON.stringify(name)}（需小写 kebab-case）`)
  }
  return { name, description: String(meta.description || '').trim() }
}

/** 读目录里 SKILL.md 的技能名，缺省用目录名。 */
async function readSkillName(dir) {
  return (await readSkillMeta(dir)).name
}

/** 校验源目录：存在、是目录、含 SKILL.md，返回规范化后的绝对路径。 */
async function assertSkillDir(source) {
  if (typeof source !== 'string' || source.trim() === '') {
    throw userError('缺少源目录')
  }
  const dir = resolve(source.trim())
  let stat
  try {
    stat = await fs.stat(dir)
  } catch {
    throw userError(`源目录不存在：${dir}`)
  }
  if (!stat.isDirectory()) throw userError(`源路径不是目录：${dir}`)
  try {
    await fs.access(join(dir, 'SKILL.md'))
  } catch {
    throw userError(`目录里没有 SKILL.md：${dir}`)
  }
  return dir
}

/** 建软链：~/.dsh/skills/<name> -> source。 */
async function linkSkill(source, name) {
  if (!SKILL_NAME.test(name)) {
    throw userError(`技能名不合法：${JSON.stringify(name)}（需小写 kebab-case）`)
  }
  await ensureSkillsDir()
  const target = join(dshSkillsDir(), name)
  const absoluteSource = resolve(source)
  let existing = null
  try {
    existing = await fs.lstat(target)
  } catch {
    existing = null
  }
  if (existing) {
    if (existing.isSymbolicLink()) {
      await fs.unlink(target)
    } else if (existing.isDirectory()) {
      throw userError(`~/.dsh/skills/${name} 已是一个真实目录，拒绝覆盖`)
    } else {
      throw userError(`~/.dsh/skills/${name} 已存在同名文件，拒绝覆盖`)
    }
  }
  await fs.symlink(absoluteSource, target, 'dir')
  return { name, source: absoluteSource, target }
}

/** 移除软链：只删软链，绝不删真实目录。 */
async function unlinkSkill(name) {
  if (!SKILL_NAME.test(name)) {
    throw userError(`技能名不合法：${JSON.stringify(name)}`)
  }
  const target = join(dshSkillsDir(), name)
  let stat = null
  try {
    stat = await fs.lstat(target)
  } catch {
    return { name, removed: false }
  }
  if (stat.isSymbolicLink()) {
    await fs.unlink(target)
    return { name, removed: true }
  }
  if (stat.isDirectory()) {
    throw userError(`~/.dsh/skills/${name} 是真实目录，不会删除`)
  }
  throw userError(`~/.dsh/skills/${name} 不是软链，拒绝删除`)
}

/** 在仓库/目录里找技能目录：根 SKILL.md，或 skills/、一级子目录，跳过 node_modules/.git。 */
async function findSkillDirs(root) {
  const found = []
  const pushIfSkill = async (dir) => {
    try {
      await fs.access(join(dir, 'SKILL.md'))
      found.push(resolve(dir))
    } catch {
      /* ignore */
    }
  }
  await pushIfSkill(root)
  let entries
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    if (entry.isDirectory()) {
      await pushIfSkill(join(root, entry.name))
      const skillsDir = join(root, entry.name, 'skills')
      try {
        const sub = await fs.readdir(skillsDir, { withFileTypes: true })
        for (const child of sub) {
          if (child.isDirectory() && !SKIP_DIRS.has(child.name)) await pushIfSkill(join(skillsDir, child.name))
        }
      } catch {
        /* ignore */
      }
    }
  }
  return found
}

/**
 * 开关：enable=true 建软链（需 source 源目录），enable=false 移除软链。
 */
export async function toggleSkill({ name, source, enable }) {
  if (enable) {
    const dir = await assertSkillDir(source)
    const skillName = await readSkillName(dir)
    await linkSkill(dir, skillName)
    return { action: 'enabled', name: skillName }
  }
  const result = await unlinkSkill(name)
  return { action: 'disabled', name, removed: result.removed }
}

/** 卸载：移除软链（源目录保留）。 */
export async function uninstallSkill({ name }) {
  const result = await unlinkSkill(name)
  return { action: 'uninstalled', name, removed: result.removed }
}

/** 在系统文件管理器里打开技能所在文件夹。 */
export async function openFolder({ path }) {
  if (typeof path !== 'string' || path.trim() === '') throw userError('缺少路径')
  const target = resolve(path.trim())

  let dir = null
  try {
    const stat = await fs.stat(target)
    if (stat.isDirectory()) dir = target
  } catch {
    /* ignore */
  }
  if (!dir) {
    try {
      const stat = await fs.stat(dirname(target))
      if (stat.isDirectory()) dir = dirname(target)
    } catch {
      /* ignore */
    }
  }
  if (!dir) throw userError('目录不存在：' + target)

  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'
  try {
    await execFileAsync(command, [dir], { timeout: 10000 })
    return { opened: dir }
  } catch (cause) {
    throw userError('打开文件夹失败：' + String(cause?.message || cause))
  }
}

/** 判定是否为权限类错误（EPERM / EACCES / npm root-owned cache）。 */
function isPermissionError(error) {
  const code = error?.code
  const text = String(error?.stderr || error?.message || error).toLowerCase()
  return code === 'EACCES' || code === 'EPERM' || text.includes('eperm') || text.includes('eacces') || text.includes('root-owned')
}

/** npx 的 npm 缓存目录：绕开可能被 root 占用的 ~/.npm。 */
function npmCacheDir() {
  return join(dshHome(), 'storages', 'dsh-studio', 'npm-cache')
}

/** 调生态包管理器：npx skills add <pkg> -g -y（全局 + 跳过确认）。 */
async function npxSkillsAdd(pkg) {
  const cache = npmCacheDir()
  await fs.mkdir(cache, { recursive: true })
  const env = { ...process.env, NPM_CONFIG_CACHE: cache }
  try {
    const result = await execFileAsync('npx', ['--yes', 'skills', 'add', pkg, '-g', '-y'], { env, timeout: 180000 })
    return { pkg, stdout: String(result.stdout || ''), stderr: String(result.stderr || '') }
  } catch (error) {
    if (isPermissionError(error)) {
      const err = userError('npm/npx 缓存权限不足（~/.npm 存在 root-owned 文件）')
      err.needPermission = true
      err.hint = 'sudo chown -R $(id -u):$(id -g) ~/.npm'
      throw err
    }
    const message = String(error?.stderr || error?.message || error).trim()
    throw userError('npx skills add 失败：' + message.slice(0, 400))
  }
}

/** 从 npx 输入里解析出要安装的包名。 */
function parseNpxTarget(raw) {
  const rest = raw.replace(/^npx\s+/i, '').trim()
  if (rest === '') throw userError('npx 后面缺少包名，例如：npx skills add owner/repo')
  const match = rest.match(/^skills(?:\s+add)?\s+(.+)$/i)
  if (match) return match[1].trim()
  if (/^skills\b/i.test(rest)) throw userError('暂只支持安装命令：npx skills add <包名>')
  return rest
}

/** 探测本地技能目录：存在且含 SKILL.md 才返回路径，否则 null。 */
async function maybeSkillDir(source) {
  if (typeof source !== 'string' || source.trim() === '') return null
  const dir = resolve(source.trim())
  try {
    const stat = await fs.stat(dir)
    if (!stat.isDirectory()) return null
    await fs.access(join(dir, 'SKILL.md'))
    return dir
  } catch {
    return null
  }
}

/** 去掉浏览器网页路径里的 /tree/<ref>... 与 /blob/<ref>...，还原成可 clone 的仓库地址。 */
function normalizeGitUrl(raw) {
  let url = String(raw || '').trim()
  url = url.replace(/\/(tree|blob)\/[^/]+(?:\/.*)?$/, '')
  url = url.replace(/\/+$/, '')
  return url
}

/** 已 clone 仓库的会话缓存：url -> { dest, skills: [{name, description, dir}] }。 */
const cloneCache = new Map()

/** git 安装：clone 到本地；单技能直接装，多技能返回候选清单等用户勾选。 */
async function installFromGit(url, label) {
  const slug = (url.split('/').pop() || '').replace(/\.git$/, '') || label
  const stamp = Date.now()
  const dest = join(installRoot(), `${slug}-${stamp}`)
  await fs.mkdir(dirname(dest), { recursive: true })
  try {
    await execFileAsync('git', ['clone', '--depth', '1', url, dest], { timeout: 120000 })
  } catch (error) {
    await fs.rm(dirname(dest), { recursive: true, force: true }).catch(() => {})
    if (isPermissionError(error)) {
      const err = userError('git clone 权限不足')
      err.needPermission = true
      err.hint = '检查当前用户对该目录 / 远程仓库的读写权限'
      throw err
    }
    const message = String(error?.stderr || error?.message || error).trim()
    throw userError(`git clone 失败：${message.slice(0, 300)}`)
  }

  const dirs = await findSkillDirs(dest)
  if (dirs.length === 0) {
    await fs.rm(dirname(dest), { recursive: true, force: true }).catch(() => {})
    throw userError('仓库里没找到 SKILL.md（技能目录）')
  }

  const skills = []
  for (const dir of dirs) {
    const meta = await readSkillMeta(dir).catch(() => ({ name: basename(dir), description: '' }))
    skills.push({ name: meta.name, description: meta.description, dir })
  }

  if (skills.length === 1) {
    const single = skills[0]
    await linkSkill(single.dir, single.name)
    return { action: 'installed', skills: [single.name], via: 'git' }
  }

  cloneCache.set(url, { dest, skills })
  return {
    needSelect: true,
    candidates: skills.map(({ name, description }) => ({ name, description })),
  }
}

/** 从已 clone 的仓库里按名字批量安装选中技能。 */
async function installSelected(url, names) {
  const entry = cloneCache.get(url)
  if (!entry) throw userError('会话已失效，请重新输入地址后再安装')
  const wanted = new Set((names || []).map((name) => String(name)))
  const installed = []
  for (const skill of entry.skills) {
    if (wanted.has(skill.name)) {
      await linkSkill(skill.dir, skill.name)
      installed.push(skill.name)
    }
  }
  if (installed.length === 0) throw userError('没有选中的技能')
  return { action: 'installed', skills: installed, via: 'git' }
}

const GIT_URL_RE = /^(https?:\/\/|ssh:\/\/|git@)/i
const SHORTHAND_RE = /^[A-Za-z0-9-][A-Za-z0-9_.-]*\/[A-Za-z0-9_.-]+$/
const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/** 安装：单输入自动识别 —— 本地目录 / git / GitHub 简写 / npx 包名；多技能时批量选择。 */
export async function installSkill({ source, names }) {
  const raw = String(source || '').trim()
  if (raw === '') throw userError('请输入要安装的内容（本地目录 / git 地址 / npx 包名）')

  try {
    // 0) 多技能批量安装：第二次请求，带上 names
    if (Array.isArray(names) && names.length > 0) {
      const isShorthand = SHORTHAND_RE.test(raw)
      const url = normalizeGitUrl(isShorthand ? `https://github.com/${raw}` : raw)
      return installSelected(url, names)
    }

    // 1) npx / npm 包名（显式 npx 前缀）
    if (/^npx\s+/i.test(raw)) {
      const pkg = parseNpxTarget(raw)
      await npxSkillsAdd(pkg)
      return { action: 'installed', skills: [pkg], via: 'npx' }
    }

    // 2) 本地目录（存在且含 SKILL.md，优先于 git 简写）
    const dir = await maybeSkillDir(raw)
    if (dir) {
      const name = await readSkillName(dir)
      await linkSkill(dir, name)
      return { action: 'installed', skills: [name], via: 'local' }
    }

    // 3) git URL / GitHub 简写
    const isUrl = GIT_URL_RE.test(raw)
    const isShorthand = SHORTHAND_RE.test(raw)
    if (isUrl || isShorthand) {
      const url = normalizeGitUrl(isShorthand ? `https://github.com/${raw}` : raw)
      return installFromGit(url, raw)
    }

    // 4) 裸 npm 包名 → 走 npx skills add
    if (NPM_NAME_RE.test(raw)) {
      await npxSkillsAdd(raw)
      return { action: 'installed', skills: [raw], via: 'npx' }
    }

    throw userError('无法识别该输入：不是本地技能目录、git 地址，也不是 npm 包名')
  } catch (error) {
    if (error?.needPermission) throw error
    if (isPermissionError(error)) {
      const err = userError('缺少写入权限：' + String(error?.message || error))
      err.needPermission = true
      err.hint = '检查 ~/.dsh、~/.agents、~/.npm 的读写权限（ls -ld ~/.dsh ~/.agents ~/.npm）'
      throw err
    }
    throw error
  }
}
