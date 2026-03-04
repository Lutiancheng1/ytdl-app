import { useState, useEffect, useRef, useCallback } from 'react'
import { Download, CheckCircle, XCircle, AlertCircle, Loader, Wrench, FileText, Folder, Search, ChevronDown, ChevronUp, X, Play, Link, Info } from 'lucide-react'
import './App.css'
import type { DownloadTask, DownloadProgress, DepsStatus, StartDownloadArgs, InstallProgress } from './types'
import { safeInvoke, safeListen, safeOpen, safeOpenUrl } from './tauri-helpers'

const COOKIES_EXT_URL = 'https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc'

// ── 状态对应的样式类 (不含 emoji) ──────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending: '等待中',
  downloading: '下载中',
  finished: '完成',
  error: '出错',
  cancelled: '已取消',
  fixing: '修复中',
  fixed: '修复完成',
  log: ''
}

function StatusIcon({ status, size = 18 }: { status: string; size?: number }) {
  const props = { size, strokeWidth: 1.8 }
  switch (status) {
    case 'downloading':
      return <Download {...props} />
    case 'finished':
      return <CheckCircle {...props} />
    case 'fixed':
      return <CheckCircle {...props} />
    case 'error':
      return <XCircle {...props} />
    case 'cancelled':
      return <AlertCircle {...props} />
    case 'fixing':
      return <Wrench {...props} />
    case 'log':
      return <FileText {...props} />
    default:
      return <Loader {...props} />
  }
}

const FORMAT_OPTIONS = [
  { value: 'b[ext=mp4]/b', label: '最佳 MP4（推荐）' },
  { value: 'bestvideo+bestaudio/best', label: '最高画质（可能 WebM）' },
  { value: '137+140/bestvideo+bestaudio', label: '1080p MP4' },
  { value: '248+251/bestvideo+bestaudio', label: '4K WebM' },
  { value: 'bestaudio/best', label: '仅音频（最佳）' },
  { value: 'bestaudio[ext=m4a]/bestaudio', label: 'M4A 音频' }
]

function genId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ── 依赖检测弹窗 ───────────────────────────────────────────────────────────────
function DepsModal({ deps, onClose, onDepsRefresh }: { deps: DepsStatus | null; onClose: () => void; onDepsRefresh: () => void }) {
  const [installing, setInstalling] = useState<Record<string, boolean>>({})
  const [installLogs, setInstallLogs] = useState<Record<string, string[]>>({})
  const [installStatus, setInstallStatus] = useState<Record<string, 'success' | 'error' | 'running'>>({})

  useEffect(() => {
    const unlisten = safeListen<InstallProgress>('install-progress', (p) => {
      setInstallLogs((prev) => ({
        ...prev,
        [p.name]: [...(prev[p.name] ?? []).slice(-60), p.message]
      }))
      if (p.status === 'success' || p.status === 'error') {
        setInstalling((prev) => ({ ...prev, [p.name]: false }))
        setInstallStatus((prev) => ({ ...prev, [p.name]: p.status }))
        if (p.status === 'success') setTimeout(onDepsRefresh, 800)
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [onDepsRefresh])

  const handleInstall = async (name: string) => {
    setInstalling((prev) => ({ ...prev, [name]: true }))
    setInstallLogs((prev) => ({ ...prev, [name]: ['正在启动安装...'] }))
    setInstallStatus((prev) => {
      const n = { ...prev }
      delete n[name]
      return n
    })
    try {
      await safeInvoke('install_dep', { name })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setInstallLogs((prev) => ({ ...prev, [name]: [...(prev[name] ?? []), msg] }))
      setInstalling((prev) => ({ ...prev, [name]: false }))
      setInstallStatus((prev) => ({ ...prev, [name]: 'error' }))
    }
  }

  if (!deps) return null

  const items = [
    { name: 'yt-dlp', ok: deps.yt_dlp, ver: deps.yt_dlp_version, required: true, desc: 'YouTube 下载核心工具（必须）' },
    { name: 'ffmpeg', ok: deps.ffmpeg, ver: deps.ffmpeg_version, required: false, desc: '无损重封装工具（可选）' },
    { name: 'deno', ok: deps.deno, ver: '', required: false, desc: '绕过 JS 人机验证（可选）' }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <Search size={16} strokeWidth={1.8} />
          <h3>依赖检测</h3>
        </div>
        {items.map((item) => {
          const isInstalling = !!installing[item.name]
          const st = installStatus[item.name]
          const logs = installLogs[item.name] ?? []
          const isDone = item.ok || st === 'success'
          return (
            <div key={item.name}>
              <div className="dep-row">
                <div>
                  <div className="dep-name">
                    {item.name}
                    {!item.required && <span className="dep-optional">可选</span>}
                  </div>
                  <div className="dep-ver">{item.desc}</div>
                  {isDone && item.ver && <div className="dep-ver dep-ver-ok">{item.ver.slice(0, 60)}</div>}
                </div>
                <div className="dep-actions">
                  <span className={`dep-badge ${isDone ? 'ok' : 'miss'}`}>{isDone ? '已安装' : st === 'error' ? '安装失败' : '未安装'}</span>
                  {!isDone && (
                    <button className="btn btn-primary" style={{ padding: '3px 12px', fontSize: 11 }} disabled={isInstalling} onClick={() => handleInstall(item.name)}>
                      {isInstalling ? '安装中...' : '一键安装'}
                    </button>
                  )}
                </div>
              </div>
              {logs.length > 0 && (
                <div className={`install-log ${st === 'success' ? 'success' : st === 'error' ? 'error' : ''}`}>
                  {logs.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        <div className="modal-tip">
          <Info size={12} strokeWidth={1.8} />
          macOS 使用 Homebrew 安装，Windows 使用 winget
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 16, width: '100%' }} onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  )
}

// ── 任务卡片 ───────────────────────────────────────────────────────────────────
function TaskCard({ task, onCancel, onOpenFolder, onRemove }: { task: DownloadTask; onCancel: (id: string) => void; onOpenFolder: (dir: string) => void; onRemove: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const isActive = task.status === 'downloading' || task.status === 'fixing'
  const fillClass = ['finished', 'fixed'].includes(task.status) ? 'finished' : task.status === 'error' ? 'error' : task.status === 'fixing' ? 'fixing' : ''

  // YouTube bot 检测 / 需要登录
  const hasBotErrorLog = task.logs.some((l) => l.includes('Sign in to confirm') || l.includes('not a bot'))
  const hasCookieInvalidLog = task.logs.some((l) => l.includes('cookies are no longer valid'))

  // 如果日志明确说 cookie 失效，或者遇到了 bot 错误但用户实际上确实传了 cookie，都算 cookie 过期/失效
  const isCookieExpired = task.status === 'error' && (hasCookieInvalidLog || (hasBotErrorLog && !!task.cookies_path))
  // 如果遇到 bot 错误，但用户没有传 cookie，则提示需要传 cookie
  const isBotError = task.status === 'error' && hasBotErrorLog && !isCookieExpired

  return (
    <div className={`task-card status-${task.status}`}>
      <div className="task-top">
        <span className={`task-icon status-${task.status}`}>
          <StatusIcon status={task.status} size={16} />
        </span>
        <div className="task-info">
          <div className="task-url">{task.url}</div>
          <div className={`task-status-text ${task.status}`}>
            {STATUS_LABEL[task.status]}
            {task.status === 'downloading' && task.percent > 0 && ` — ${task.percent.toFixed(1)}%`}
            {task.message && task.status !== 'downloading' && ` — ${task.message.slice(0, 80)}`}
          </div>
        </div>
        <div className="task-actions">
          {isActive && (
            <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => onCancel(task.id)}>
              取消
            </button>
          )}
          {task.status === 'finished' && (
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => onOpenFolder(task.output_dir)}>
              <Folder size={12} strokeWidth={1.8} />
              打开目录
            </button>
          )}
          {!isActive && (
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => onRemove(task.id)}>
              <X size={12} strokeWidth={2} />
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {(isActive || ['finished', 'fixed', 'error'].includes(task.status)) && (
        <>
          <div className="progress-wrap">
            <div className={`progress-fill ${fillClass}`} style={{ width: `${Math.max(task.percent, ['finished', 'fixed'].includes(task.status) ? 100 : 0)}%` }} />
          </div>
          <div className="progress-meta">
            <span>{task.percent > 0 ? `${task.percent.toFixed(1)}%` : ''}</span>
            <span>
              {task.speed && task.speed}
              {task.speed && task.eta && ' · '}
              {task.eta && task.eta}
            </span>
          </div>
        </>
      )}

      {isCookieExpired && (
        <div className="bot-error-hint">
          <AlertCircle size={13} strokeWidth={1.8} className="bot-error-icon" />
          <div>
            <div className="bot-error-title">Cookies 已过期或失效</div>
            <div className="bot-error-desc">你提供的 cookies 已失效。请在浏览器中重新使用插件导出最新的 cookies.txt 并替换。</div>
          </div>
        </div>
      )}

      {isBotError && (
        <div className="bot-error-hint">
          <AlertCircle size={13} strokeWidth={1.8} className="bot-error-icon" />
          <div>
            <div className="bot-error-title">YouTube 要求身份验证</div>
            <div className="bot-error-desc">请在左侧「Cookies.txt」栏选择已导出的 cookies.txt，然后重新发起下载。</div>
          </div>
        </div>
      )}

      {expanded && task.logs.length > 0 && (
        <div className="task-log">
          {task.logs.slice(-60).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 主应用 ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [urlInput, setUrlInput] = useState('')
  const [cookiesPath, setCookiesPath] = useState(() => localStorage.getItem('ytdl-cookies-path') || '')
  const [outputDir, setOutputDir] = useState(() => localStorage.getItem('ytdl-output-dir') || '')
  const [format, setFormat] = useState(FORMAT_OPTIONS[0].value)
  const [doFix, setDoFix] = useState(false)

  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const [deps, setDeps] = useState<DepsStatus | null>(null)
  const [showDeps, setShowDeps] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const checkDeps = useCallback(async () => {
    try {
      const d = await safeInvoke<DepsStatus>('check_deps')
      if (d) setDeps(d)
    } catch (e) {
      console.error('check_deps failed', e)
    }
  }, [])

  useEffect(() => {
    checkDeps()
  }, [checkDeps])

  useEffect(() => {
    const unlisten = safeListen<DownloadProgress>('download-progress', (p) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== p.task_id) return t
          const newLogs = p.message ? [...t.logs, p.message] : t.logs
          if (p.status === 'log') return { ...t, logs: newLogs, message: p.message }
          return { ...t, status: p.status, percent: p.percent, speed: p.speed, eta: p.eta, message: p.message, logs: newLogs }
        })
      )
      if (p.message) {
        setLogs((prev) => [...prev.slice(-500), `[${p.task_id.slice(-5)}] ${p.message}`])
        setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50)
      }
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  useEffect(() => {
    setDownloading(tasks.some((t) => t.status === 'downloading' || t.status === 'fixing'))
  }, [tasks])

  const pickCookies = async () => {
    const selected = await safeOpen({ filters: [{ name: 'Text', extensions: ['txt'] }] })
    if (selected) {
      setCookiesPath(selected)
      localStorage.setItem('ytdl-cookies-path', selected)
    }
  }

  const pickOutput = async () => {
    const selected = await safeOpen({ directory: true })
    if (selected) {
      setOutputDir(selected)
      localStorage.setItem('ytdl-output-dir', selected)
    }
  }

  const handleDownload = async () => {
    const urls = urlInput
      .trim()
      .split(/\n+/)
      .map((u) => u.trim())
      .filter(Boolean)
    if (!urls.length) return
    if (!outputDir) {
      alert('请先选择输出目录')
      return
    }

    for (const url of urls) {
      const task_id = genId()
      const newTask: DownloadTask = {
        id: task_id,
        url,
        format,
        output_dir: outputDir,
        cookies_path: cookiesPath || null,
        status: 'pending',
        percent: 0,
        speed: '',
        eta: '',
        message: '准备下载...',
        logs: [],
        created_at: Date.now()
      }
      setTasks((prev) => [newTask, ...prev])
      const args: StartDownloadArgs = { task_id, url, output_dir: outputDir, cookies_path: cookiesPath || null, format, do_fix: doFix }
      try {
        setTasks((prev) => prev.map((t) => (t.id === task_id ? { ...t, status: 'downloading', message: '正在启动...' } : t)))
        await safeInvoke('start_download', { args })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        setTasks((prev) => prev.map((t) => (t.id === task_id ? { ...t, status: 'error', message: msg } : t)))
        setLogs((prev) => [...prev, `[ERROR] ${msg}`])
      }
    }
    setUrlInput('')
  }

  const handleCancel = async (id: string) => {
    try {
      await safeInvoke('cancel_download', { taskId: id })
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'cancelled' } : t)))
    } catch (e) {
      console.error(e)
    }
  }

  const handleOpenFolder = async (dir: string) => {
    try {
      await safeInvoke('open_folder', { path: dir })
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id))
  const handleClearAll = () => setTasks((prev) => prev.filter((t) => t.status === 'downloading' || t.status === 'fixing'))

  const depsBadgeClass = !deps ? 'warn' : !deps.yt_dlp ? 'err' : !deps.ffmpeg ? 'warn' : 'ok'
  const depsBadgeText = !deps ? '检测中...' : !deps.yt_dlp ? '缺少 yt-dlp' : !deps.ffmpeg ? '缺少 ffmpeg' : '依赖正常'
  const activeCount = tasks.filter((t) => t.status === 'downloading' || t.status === 'fixing').length

  return (
    <>
      <div className="layout">
        {/* Titlebar */}
        <div className="titlebar">
          <Download size={16} strokeWidth={1.8} className="titlebar-logo" />
          <span className="titlebar-title">ytdl-app</span>
          <span className="titlebar-sub">YouTube Downloader</span>
          <div className="titlebar-spacer" />
          <button
            className={`deps-badge ${depsBadgeClass}`}
            onClick={() => {
              checkDeps()
              setShowDeps(true)
            }}
          >
            <Search size={11} strokeWidth={2} />
            {depsBadgeText}
          </button>
        </div>

        {/* Sidebar */}
        <aside className="sidebar">
          <div className="form-group">
            <label>YouTube 链接</label>
            <textarea rows={5} placeholder={'粘贴链接，一行一个\nhttps://www.youtube.com/watch?v=...'} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
          </div>

          <div className="form-group">
            <label>格式 / 画质</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              {FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>输出目录</label>
            <div className="file-row">
              <input
                type="text"
                placeholder="选择保存位置..."
                value={outputDir}
                onChange={(e) => {
                  setOutputDir(e.target.value)
                  localStorage.setItem('ytdl-output-dir', e.target.value)
                }}
              />
              <button className="btn btn-ghost" onClick={pickOutput}>
                浏览
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>
              Cookies.txt
              <span className="label-hint">（可选，遇反爬时用）</span>
            </label>
            <div className="file-row">
              <input
                type="text"
                placeholder="选择 cookies.txt..."
                value={cookiesPath}
                onChange={(e) => {
                  setCookiesPath(e.target.value)
                  localStorage.setItem('ytdl-cookies-path', e.target.value)
                }}
              />
              <button className="btn btn-ghost" onClick={pickCookies}>
                浏览
              </button>
            </div>
            <div className="cookies-guide">
              <div className="cookies-guide-title">
                <Info size={11} strokeWidth={2} />
                如何获取 cookies.txt
              </div>
              <ol className="cookies-guide-steps">
                <li>
                  用 Chrome 打开 YouTube 并<b>登录账号</b>
                </li>
                <li>
                  安装 <b>Get cookies.txt LOCALLY</b> 扩展
                </li>
                <li>
                  点击扩展图标 → 选择 <b>Export</b> → 保存文件
                </li>
                <li>在上方「浏览」选择该 cookies.txt 文件</li>
              </ol>
              <button className="btn btn-ghost cookies-ext-btn" onClick={() => safeOpenUrl(COOKIES_EXT_URL)}>
                <Link size={11} strokeWidth={2} />
                安装 Chrome 扩展（Get cookies.txt LOCALLY）
              </button>
            </div>
          </div>

          <div className="toggle-row">
            <div className="toggle-label">
              <span>无损修复（ffmpeg）</span>
              <small>下载后重封装，修复时间戳</small>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={doFix} onChange={(e) => setDoFix(e.target.checked)} disabled={!deps?.ffmpeg} />
              <span className="toggle-track" />
            </label>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleDownload} disabled={!urlInput.trim() || !outputDir || downloading}>
            <Play size={14} strokeWidth={2} />
            {downloading ? '下载中...' : '开始下载'}
          </button>
        </aside>

        {/* Main */}
        <main className="main">
          <div className="task-header">
            <h2>下载任务</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {activeCount > 0 && <span className="task-count">{activeCount} 个进行中</span>}
              {tasks.length > 0 && (
                <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }} onClick={handleClearAll}>
                  清除已完成
                </button>
              )}
            </div>
          </div>

          <div className="task-list">
            {tasks.length === 0 ? (
              <div className="empty-state">
                <Download size={40} strokeWidth={1} className="empty-icon" />
                <p>在左侧粘贴链接，点击「开始下载」</p>
              </div>
            ) : (
              tasks.map((task) => <TaskCard key={task.id} task={task} onCancel={handleCancel} onOpenFolder={handleOpenFolder} onRemove={handleRemove} />)
            )}
          </div>

          <div className="log-panel">
            <div className="log-header">
              <span>运行日志</span>
              <button className="btn btn-ghost" style={{ padding: '2px 10px', fontSize: 11 }} onClick={() => setLogs([])}>
                清空
              </button>
            </div>
            <div className="log-body" ref={logRef}>
              {logs.length === 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>暂无日志</span>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className={`log-line ${l.includes('[ERROR]') ? 'error' : l.includes('完成') ? 'success' : ''}`}>
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {showDeps && <DepsModal deps={deps} onClose={() => setShowDeps(false)} onDepsRefresh={checkDeps} />}
    </>
  )
}
