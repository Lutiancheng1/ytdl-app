// Types for the ytdl-app Tauri application

export interface DownloadProgress {
  task_id: string
  percent: number
  speed: string
  eta: string
  status: 'downloading' | 'finished' | 'error' | 'cancelled' | 'log' | 'fixing' | 'fixed'
  message: string
}

export interface DepsStatus {
  yt_dlp: boolean
  ffmpeg: boolean
  deno: boolean
  yt_dlp_version: string
  ffmpeg_version: string
}

export interface StartDownloadArgs {
  task_id: string
  url: string
  output_dir: string
  cookies_path: string | null
  format: string
  do_fix: boolean
}

export interface DownloadTask {
  id: string
  url: string
  format: string
  output_dir: string
  cookies_path?: string | null
  status: DownloadProgress['status'] | 'pending'
  percent: number
  speed: string
  eta: string
  message: string
  logs: string[]
  created_at: number
}

export interface InstallProgress {
  name: string
  status: 'running' | 'success' | 'error'
  message: string
}
