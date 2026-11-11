import { getSupabase, isSyncConfigured } from './supabase'

const TABLE = 'user_progress'
/** Supabase Auth 底层仍要 email 字段；用户只填账号，映射为内部地址 */
const ACCOUNT_EMAIL_DOMAIN = 'fangji.local'
let pushTimer = null
let pushing = false

function errMsg(e, fallback = '操作失败') {
  if (!e) return fallback
  if (typeof e === 'string') return e
  return e.message || e.error_description || fallback
}

/** 账号规则：3–32 位，字母数字下划线（不区分大小写） */
export function normalizeAccount(raw) {
  const account = String(raw || '').trim().toLowerCase()
  if (!account) throw new Error('请填写账号')
  if (account.includes('@')) throw new Error('请使用账号登录，不要填邮箱')
  if (!/^[a-z0-9_]{3,32}$/.test(account)) {
    throw new Error('账号需为 3–32 位字母、数字或下划线')
  }
  return account
}

export function accountToAuthEmail(account) {
  return `${normalizeAccount(account)}@${ACCOUNT_EMAIL_DOMAIN}`
}

export function authEmailToAccount(email) {
  const e = String(email || '').trim().toLowerCase()
  const suffix = `@${ACCOUNT_EMAIL_DOMAIN}`
  if (e.endsWith(suffix)) return e.slice(0, -suffix.length)
  return e || ''
}

export function syncAvailable() {
  return isSyncConfigured()
}

export async function getSession() {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.auth.getSession()
  if (error) throw error
  return data.session || null
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user || null
}

/** 当前登录显示用账号名（非邮箱） */
export async function getCurrentAccount() {
  const u = await getCurrentUser()
  if (!u?.email) return ''
  return authEmailToAccount(u.email)
}

export async function signUp(account, password) {
  const sb = getSupabase()
  if (!sb) throw new Error('未配置云同步（缺少 VITE_SUPABASE_*）')
  const email = accountToAuthEmail(account)
  const pwd = String(password || '')
  if (pwd.length < 6) throw new Error('密码至少 6 位')
  const { data, error } = await sb.auth.signUp({
    email,
    password: pwd,
    options: { data: { account: normalizeAccount(account) } }
  })
  if (error) throw new Error(errMsg(error, '注册失败'))
  if (!data.session && data.user) {
    throw new Error('注册成功，但需要邮箱确认。请在 Supabase 关闭 Confirm email 后重试登录。')
  }
  return data
}

export async function signInWithPassword(account, password) {
  const sb = getSupabase()
  if (!sb) throw new Error('未配置云同步（缺少 VITE_SUPABASE_*）')
  const email = accountToAuthEmail(account)
  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: String(password || '')
  })
  if (error) throw new Error(errMsg(error, '登录失败'))
  return data
}

export async function signOut() {
  const sb = getSupabase()
  if (!sb) return
  const { error } = await sb.auth.signOut()
  if (error) throw new Error(errMsg(error, '退出失败'))
}

export function hasMeaningfulProgress(data) {
  if (!data || typeof data !== 'object') return false
  if (Object.keys(data.learned || {}).length > 0) return true
  if ((data.favorites || []).length > 0) return true
  if (Object.keys(data.memory || {}).length > 0) return true
  if ((data.wrong || []).length > 0) return true
  if ((data.streakDays || 0) > 0) return true
  return false
}

function stableProgressJson(data) {
  if (!data || typeof data !== 'object') return '{}'
  const { updatedAt, resetNotice, ...rest } = data
  return JSON.stringify(rest)
}

export async function pullProgress() {
  const sb = getSupabase()
  if (!sb) return null
  const session = await getSession()
  if (!session?.user?.id) return null
  const { data, error } = await sb
    .from(TABLE)
    .select('data, updated_at')
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (error) throw new Error(errMsg(error, '拉取进度失败'))
  if (!data) return { data: null, updatedAt: null }
  return {
    data: data.data && typeof data.data === 'object' ? data.data : null,
    updatedAt: data.updated_at || null
  }
}

export async function pushProgress(payload) {
  const sb = getSupabase()
  if (!sb) return false
  const session = await getSession()
  if (!session?.user?.id) return false
  const body = payload && typeof payload === 'object' ? payload : {}
  const updatedAt = body.updatedAt || new Date().toISOString()
  const { error } = await sb.from(TABLE).upsert(
    {
      user_id: session.user.id,
      data: body,
      updated_at: updatedAt
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(errMsg(error, '上传进度失败'))
  return true
}

/** 登录后防抖推送（由 store.persist 调用） */
export function scheduleProgressPush(getPayload) {
  if (!isSyncConfigured()) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    pushTimer = null
    if (pushing) return
    try {
      const session = await getSession()
      if (!session) return
      const payload = typeof getPayload === 'function' ? getPayload() : getPayload
      pushing = true
      await pushProgress(payload)
    } catch (e) {
      console.warn('[fangji-sync] push failed', e)
    } finally {
      pushing = false
    }
  }, 1000)
}

/**
 * 登录后 / 立即同步。
 * promptConflict({ preferCloud }) → 'cloud' | 'local'
 */
export async function syncAfterAuth(studyStore, { promptConflict } = {}) {
  if (!isSyncConfigured()) throw new Error('未配置云同步')
  const session = await getSession()
  if (!session) throw new Error('未登录')

  const localData = studyStore.snapshotForCloud()
  const cloud = await pullProgress()
  const localOk = hasMeaningfulProgress(localData)
  const cloudOk = hasMeaningfulProgress(cloud?.data)

  if (!cloudOk && localOk) {
    await pushProgress(localData)
    return { action: 'uploaded' }
  }
  if (cloudOk && !localOk) {
    studyStore.applyCloudData(cloud.data)
    return { action: 'downloaded' }
  }
  if (!cloudOk && !localOk) {
    await pushProgress(localData)
    return { action: 'empty' }
  }

  if (stableProgressJson(localData) === stableProgressJson(cloud.data)) {
    if ((cloud.updatedAt || '') > (localData.updatedAt || '')) {
      studyStore.applyCloudData(cloud.data)
      return { action: 'aligned-cloud' }
    }
    return { action: 'noop' }
  }

  const preferCloud = (cloud.updatedAt || '') >= (localData.updatedAt || '')
  let choice = preferCloud ? 'cloud' : 'local'
  if (typeof promptConflict === 'function') {
    choice = await promptConflict({
      preferCloud,
      cloudUpdatedAt: cloud.updatedAt,
      localUpdatedAt: localData.updatedAt
    })
  }
  if (choice === 'cloud') {
    studyStore.applyCloudData(cloud.data)
    return { action: 'downloaded' }
  }
  await pushProgress(localData)
  return { action: 'uploaded' }
}
