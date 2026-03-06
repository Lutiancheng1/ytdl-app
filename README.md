# ytdl-app

> 基于 **Tauri + React** 构建的跨平台 YouTube 视频下载器桌面应用

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
![Tech](https://img.shields.io/badge/stack-Tauri%202%20%2B%20React%2018%20%2B%20Rust-orange)

---

## 功能预览

- 支持 YouTube 单视频 / 播放列表（单条）
- 实时下载进度 + 速度 + 剩余时间
- 多任务并发管理（可单独取消）
- ffmpeg 无损重封装（修复时间戳）
- Cookies.txt 支持（绕过登录限制）
- 依赖检测 + **一键自动安装**（macOS/Windows/Linux）
- 实时运行日志面板
- 深色玻璃拟态风格 UI

---

## 快速开始

### 系统要求

| 工具                                       | 说明                 | 安装方式                               |
| ------------------------------------------ | -------------------- | -------------------------------------- |
| [Rust](https://rustup.rs/)                 | Tauri 后端编译       | `curl https://sh.rustup.rs -sSf \| sh` |
| [Node.js 18+](https://nodejs.org/)         | 前端构建             | 官网下载 / nvm                         |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | 下载核心（**必须**） | 见下方                                 |
| [ffmpeg](https://ffmpeg.org/)              | 无损修复（可选）     | 见下方                                 |

> ⚠️ **Tauri 系统依赖说明**
>
> 要在不同操作系统上编译并运行 Tauri 项目（尤其是你的开发环境），还需要安装以下基础系统依赖：
>
> - **Windows (重要)**: 必须安装 [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 以及 [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)。请参阅官方文档：[Tauri Windows Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites#windows)
> - **macOS**: 需要安装 Xcode 命令行工具 (`xcode-select --install`)。
> - **Linux**: 需要安装各种包含 WebKit 和构建工具的开发库包。请参阅官方文档：[Tauri Linux Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites#linux)

### 安装下载依赖

**macOS（推荐 Homebrew）**

```bash
brew install yt-dlp ffmpeg
```

**Windows（推荐 winget）**

```powershell
winget install --id yt-dlp.yt-dlp -e
winget install --id Gyan.FFmpeg -e
```

**Linux（Debian/Ubuntu）**

```bash
sudo apt install yt-dlp ffmpeg
```

> 也可以在应用内点击右上角 **「依赖检测」** 徽章 → 对各工具点击「一键安装」自动完成安装。

---

## 开发运行

```bash
# 克隆项目
git clone <repo-url>
cd ytdl-app

# 安装前端依赖
npm install

# 开发模式（自动热更新，同时启动 Vite + Tauri 窗口）
npm run tauri dev
```

> ️ **注意**：请在 Tauri 原生窗口中使用，不要在系统浏览器里访问 `localhost:1420`，Tauri API 在普通浏览器中不可用。

---

## 打包发布

```bash
# 生成平台安装包
npm run tauri build
```

输出位置：

- macOS → `src-tauri/target/release/bundle/dmg/*.dmg`
- Windows → `src-tauri/target/release/bundle/msi/*.msi` 或 `*.exe`
- Linux → `src-tauri/target/release/bundle/appimage/*.AppImage`

---

## 关于 Cookies.txt

部分视频（会员内容、年龄限制、地区限制）需要提供 Cookies 才能正常下载。

**推荐使用 [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) 扩展：**

1. 用 Chrome 打开 YouTube 并**登录账号**
2. 安装 [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) Chrome 扩展
3. 点击扩展图标 → 选择 **Export** → 保存为 `cookies.txt`
4. 在应用「Cookies.txt」栏点击「浏览」选择该文件

---

## 格式/画质选项

| 选项             | 说明                      |
| ---------------- | ------------------------- |
| 最佳 MP4（推荐） | 自动选择最高画质 MP4 容器 |
| 最高画质         | 最高分辨率（可能为 WebM） |
| 1080p MP4        | 指定 1080p + AAC 音频     |
| 4K WebM          | 指定 4K + Opus 音频       |
| 仅音频（最佳）   | 提取最高音质音频          |
| M4A 音频         | 提取 M4A 格式音频         |

---

## 项目结构

```
ytdl-app/
├── src/                    # React 前端
│   ├── App.tsx             # 主界面组件
│   ├── App.css             # 全局样式（暗色玻璃拟态）
│   ├── types.ts            # TypeScript 类型定义
│   └── tauri-helpers.ts   # Tauri API 安全包装（浏览器降级）
├── src-tauri/              # Rust 后端
│   ├── src/lib.rs          # 核心逻辑（下载/安装/进度推送）
│   ├── Cargo.toml          # Rust 依赖
│   └── tauri.conf.json     # Tauri 应用配置
└── package.json
```

---

## 技术栈

| 层       | 技术                                       |
| -------- | ------------------------------------------ |
| 桌面框架 | [Tauri 2](https://tauri.app/)              |
| 前端     | React 18 + TypeScript + Vite               |
| 后端     | Rust + tokio（异步）                       |
| 下载引擎 | [yt-dlp](https://github.com/yt-dlp/yt-dlp) |
| 修复工具 | [ffmpeg](https://ffmpeg.org/)              |
| WebView  | macOS: WKWebView / Win: WebView2           |

---

## License

MIT
