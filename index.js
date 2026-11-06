/**
 * Host half of dsh-studio.
 *
 * 经 web server 暴露一组路由给 Web 端「技能」面板：
 *  - GET  /dsh-studio/scan        —— 只读扫描
 *  - POST /dsh-studio/toggle      —— 开关（软链增删）
 *  - POST /dsh-studio/uninstall   —— 卸载（移除软链，源目录保留）
 *  - POST /dsh-studio/install     —— 安装（本地目录 / git / GitHub）
 *  - GET  /dsh-studio/groups      —— 读取分组 + 归属
 *  - POST /dsh-studio/groups/set  —— 设置某技能的归属分组
 *  - POST /dsh-studio/groups/add  —— 新增分组
 */
import { scanSkills } from './lib/scanner.js'
import { toggleSkill, uninstallSkill, installSkill, openFolder } from './lib/skills.js'
import { getGroups, setSkillGroups, addGroup, renameGroup, deleteGroup } from './lib/groups.js'
import { getModes, addMode, saveMode, deleteMode, applyMode, applyModes } from './lib/modes.js'
import { autoTagSkills, listLlmRoutes } from './lib/autotag.js'
import { getTranslations, translateSkills } from './lib/translate.js'

const ROUTES = {
  scan: '/dsh-studio/scan',
  toggle: '/dsh-studio/toggle',
  uninstall: '/dsh-studio/uninstall',
  install: '/dsh-studio/install',
  openFolder: '/dsh-studio/open-folder',
  groups: '/dsh-studio/groups',
  groupsSet: '/dsh-studio/groups/set',
  groupsAdd: '/dsh-studio/groups/add',
  groupsRename: '/dsh-studio/groups/rename',
  groupsDelete: '/dsh-studio/groups/delete',
  modes: '/dsh-studio/modes',
  modesApply: '/dsh-studio/modes/apply',
  modesApplyMulti: '/dsh-studio/modes/apply-multi',
  modesAdd: '/dsh-studio/modes/add',
  modesSave: '/dsh-studio/modes/save',
  modesDelete: '/dsh-studio/modes/delete',
  autotag: '/dsh-studio/autotag',
  llmRoutes: '/dsh-studio/llm-routes',
  translate: '/dsh-studio/translate',
  translateRun: '/dsh-studio/translate-run',
}

const MAX_BODY = 64 * 1024

/** 只接受来自本机、同源的请求：本路由会暴露本机路径信息。 */
function isTrustedRequest(req) {
  const host = req.headers?.host
  if (typeof host !== 'string' || host === '') return false
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (!isLoopbackHost(hostUrl.hostname)) return false
  if (req.headers?.['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers?.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === hostUrl.host
  } catch {
    return false
  }
}

function isLoopbackHost(name) {
  return name === 'localhost' || name === '127.0.0.1' || name === '::1' || name === '[::1]'
}

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY) {
      const error = new Error('请求体过大')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(text)
  } catch {
    const error = new Error('请求体不是合法 JSON')
    error.status = 400
    throw error
  }
}

/**
 * 包一个路由处理器：统一鉴权、方法校验、异常兜底。
 * @param {(req, res) => Promise<any>} action 返回要写回给客户端的 payload。
 */
function makeHandler(method, action) {
  return async (req, res) => {
    if (!isTrustedRequest(req)) {
      json(res, 403, { ok: false, error: 'forbidden' })
      return
    }
    if (req.method !== method) {
      res.writeHead(405, { allow: method }).end()
      return
    }
    try {
      const payload = await action(req, res)
      json(res, 200, { ok: true, ...payload })
    } catch (error) {
      const status = error?.status || 500
      if (status >= 500) console.error(`[dsh-studio] ${method} ${req.url} failed: ${error?.stack ?? error}`)
      const payload = { ok: false, error: String(error?.message ?? error) }
      if (error?.needPermission) {
        payload.needPermission = true
        payload.hint = String(error?.hint || '')
      }
      json(res, status, payload)
    }
  }
}

/** 注册路由：route 结构 { name, path, handler }。 */
function register(scope, route) {
  scope.webServer.register({ name: route.name, kind: 'exact', path: route.path, handler: route.handler })
}

export function apply(ctx) {
  // webServer 只在 web profile 下存在；不需要它的环境安静跳过。
  try {
    if (typeof ctx.inject !== 'function') return
    ctx.inject(['webServer'], (scope) => {
      try {
        register(scope, {
          name: 'dsh-studio-scan',
          path: ROUTES.scan,
          handler: makeHandler('GET', async () => scanSkills()),
        })
        register(scope, {
          name: 'dsh-studio-toggle',
          path: ROUTES.toggle,
          handler: makeHandler('POST', async (req) => toggleSkill(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-uninstall',
          path: ROUTES.uninstall,
          handler: makeHandler('POST', async (req) => uninstallSkill(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-install',
          path: ROUTES.install,
          handler: makeHandler('POST', async (req) => installSkill(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-open-folder',
          path: ROUTES.openFolder,
          handler: makeHandler('POST', async (req) => openFolder(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-groups',
          path: ROUTES.groups,
          handler: makeHandler('GET', async () => getGroups()),
        })
        register(scope, {
          name: 'dsh-studio-groups-set',
          path: ROUTES.groupsSet,
          handler: makeHandler('POST', async (req) => setSkillGroups(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-groups-add',
          path: ROUTES.groupsAdd,
          handler: makeHandler('POST', async (req) => addGroup(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-groups-rename',
          path: ROUTES.groupsRename,
          handler: makeHandler('POST', async (req) => renameGroup(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-groups-delete',
          path: ROUTES.groupsDelete,
          handler: makeHandler('POST', async (req) => deleteGroup(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-modes',
          path: ROUTES.modes,
          handler: makeHandler('GET', async () => getModes()),
        })
        register(scope, {
          name: 'dsh-studio-modes-apply',
          path: ROUTES.modesApply,
          handler: makeHandler('POST', async (req) => applyMode(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-modes-apply-multi',
          path: ROUTES.modesApplyMulti,
          handler: makeHandler('POST', async (req) => applyModes(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-modes-add',
          path: ROUTES.modesAdd,
          handler: makeHandler('POST', async (req) => addMode(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-modes-save',
          path: ROUTES.modesSave,
          handler: makeHandler('POST', async (req) => saveMode(await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-modes-delete',
          path: ROUTES.modesDelete,
          handler: makeHandler('POST', async (req) => deleteMode(await readJsonBody(req))),
        })
      } catch (error) {
        console.error(`[dsh-studio] routes skipped: ${error?.message ?? error}`)
      }
    })

    // 自动打标需要 llm + agentDefaultModel；单独注入，避免这些服务缺失时拖垮上面的基础路由。
    ctx.inject(['webServer', 'llm', 'agentDefaultModel'], (scope) => {
      try {
        register(scope, {
          name: 'dsh-studio-llm-routes',
          path: ROUTES.llmRoutes,
          handler: makeHandler('GET', async () => listLlmRoutes(scope)),
        })
        register(scope, {
          name: 'dsh-studio-autotag',
          path: ROUTES.autotag,
          handler: makeHandler('POST', async (req) => autoTagSkills(scope, await readJsonBody(req))),
        })
        register(scope, {
          name: 'dsh-studio-translate',
          path: ROUTES.translate,
          handler: makeHandler('GET', async () => getTranslations()),
        })
        register(scope, {
          name: 'dsh-studio-translate-run',
          path: ROUTES.translateRun,
          handler: makeHandler('POST', async (req) => translateSkills(scope, await readJsonBody(req))),
        })
      } catch (error) {
        console.error(`[dsh-studio] autotag route skipped: ${error?.message ?? error}`)
      }
    })
  } catch (error) {
    // 插件激活失败会让整个 App 起不来，这里必须兜住。
    console.error(`[dsh-studio] apply failed: ${error?.stack ?? error}`)
  }
}
