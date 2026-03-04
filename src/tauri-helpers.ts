/**
 * tauri-helpers.ts
 * 纯 .ts 文件（非 .tsx），可以正常使用泛型 <T> 语法
 * 提供 Tauri API 的安全降级包装——在普通浏览器里不崩溃
 */
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'
import { openUrl } from '@tauri-apps/plugin-opener'

/**
 * 是否在 Tauri 原生 WebView 中运行。
 * Tauri 2 使用 window.__TAURI_INTERNALS__，Tauri 1 使用 window.__TAURI__。
 * 用 try-catch 兜底处理各平台差异。
 */
export const isTauri: boolean = (() => {
  if (typeof window === 'undefined') return false
  // Tauri 2.x
  if ('__TAURI_INTERNALS__' in window) return true
  // Tauri 1.x fallback
  if ('__TAURI__' in window) return true
  return false
})()

/** 安全 invoke：普通浏览器中返回 null，Tauri 中正常调用 */
export async function safeInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauri) return null
  return invoke<T>(cmd, args)
}

/** 安全 listen：普通浏览器中返回 no-op，Tauri 中正常监听 */
export function safeListen<T>(event: string, cb: (payload: T) => void): Promise<UnlistenFn> {
  if (!isTauri) return Promise.resolve(() => {})
  return listen<T>(event, ({ payload }) => cb(payload))
}

/** 安全 open（文件/目录选择框）：普通浏览器中返回 null */
export async function safeOpen(opts: Parameters<typeof open>[0]): Promise<string | null> {
  if (!isTauri) return null
  const result = await open(opts)
  if (Array.isArray(result)) return result[0] ?? null
  return result
}

/** 用系统默认浏览器打开 URL */
export async function safeOpenUrl(url: string): Promise<void> {
  if (!isTauri) {
    // 普通浏览器环境下用 window.open 降级
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  await openUrl(url)
}
