# Sakku Desktop Pet

Sakku 是一个使用 Electron 制作的 Windows 互动桌面宠物。它拥有透明背景、多状态动画、鼠标互动、随机跑动与系统音量反馈，并支持全局快捷键召回和隐藏。

## 功能

- 无操作时播放待机动画
- 拖动时根据方向播放向左或向右跑动动画
- 单击后在屏幕范围内随机跑动
- 鼠标悬停时播放樱花互动动画
- 松开鼠标时播放触碰反馈动画
- 调整系统音量时播放手柄动画
- 长时间无操作时播放额外状态动画
- 透明区域支持鼠标穿透，不会遮挡桌面操作
- 右键菜单支持调整大小、置顶、隐藏与彻底退出

## 下载和使用

前往 GitHub 仓库的 **Releases** 页面，下载最新版本：

- `Sakku Desktop Pet Setup 1.0.0.exe`：安装版，推荐普通用户使用
- `Sakku Desktop Pet 1.0.0.exe`：便携版，无需安装

启动后 Sakku 会显示在桌面上。第一次运行未签名版本时，Windows 可能显示“未知发布者”；确认文件来自本项目的正式 Release 后，可选择“更多信息 → 仍要运行”。

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Shift + Y` | 显示 Sakku，并将它召回到当前鼠标位置 |
| `Shift + J` | 隐藏 Sakku，但程序继续在后台运行 |

如果快捷键无效，通常是被其他软件占用。关闭占用相同组合键的软件后，重新启动 Sakku 即可。

## 鼠标操作

| 操作 | 效果 |
| --- | --- |
| 拖动角色 | 移动 Sakku，并播放对应方向的跑动动画 |
| 单击角色 | Sakku 在当前屏幕内随机跑动 |
| 悬停角色 | 播放樱花互动动画 |
| 右键角色 | 打开设置菜单 |

若要完全关闭程序，请右键 Sakku，选择“彻底退出 Sakku”。`Shift + J` 只会隐藏角色，以便之后用 `Shift + Y` 再次召回。

## 从源码运行

需要 Windows、Node.js 和 npm。

```powershell
git clone <你的仓库地址>
cd sakku-desktop-pet
npm.cmd install
npm.cmd start
```

在 PowerShell 中使用 `npm` 遇到“禁止运行脚本”时，可以直接使用 `npm.cmd`，无需修改系统执行策略。

## 构建 Windows 安装包

```powershell
npm.cmd install
npm.cmd run build
```

构建结果位于 `dist` 目录，包括 NSIS 安装版和便携版。将生成的 `.exe` 文件上传到 GitHub Release 即可供其他人下载；用户电脑无需安装 Node.js。

## 项目结构

```text
sakku-desktop-pet/
├─ assets/             # Sakku 精灵图和动画配置
├─ index.html          # 桌宠窗口页面
├─ main.js             # Electron 主进程、窗口和全局快捷键
├─ preload.js          # 主进程与页面之间的安全通信桥
├─ renderer.js         # 动画与鼠标交互逻辑
├─ styles.css          # 透明窗口样式
├─ package.json        # 项目及打包配置
└─ package-lock.json   # 固定依赖版本
```

`node_modules`、`dist` 和运行日志不需要上传到源码仓库。

## 发布到 GitHub

1. 创建一个新的 GitHub 仓库。
2. 上传本项目源码，保留 `.gitignore` 和 `package-lock.json`。
3. 执行 `npm.cmd run build`。
4. 在 GitHub 仓库中打开 **Releases → Draft a new release**。
5. 创建版本标签，例如 `v1.0.0`。
6. 上传 `dist` 中的安装版和便携版，然后发布 Release。

## 注意事项

- 目前面向 Windows 构建。
- 全局快捷键会随程序启动注册，打包后仍然有效。
- 本项目未配置代码签名证书，因此 Windows SmartScreen 可能显示提示。
- Sakku 的角色形象和动画素材未经明确授权不得二次分发或商用。

## 许可

当前项目未授予开源许可，代码与 Sakku 角色素材保留所有权利。如需开放他人修改、再发布或商用，请在发布前补充合适的代码与素材许可说明。
