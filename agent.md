# Agent 维护规则

这个文件给后续维护本项目的 AI Agent 或开发者使用。项目目标是：构建一个安卓优先、无登录、本地保存聊天记录、支持自定义 OpenAI-compatible API 的 DeepSeek 风格聊天 App。

## 必须遵守

- 使用 React Native + Expo + TypeScript 继续开发。
- 默认主目标是安卓客户端，所有新增能力都要考虑安卓真机体验。
- 不添加登录认证，除非用户明确提出。
- 聊天记录保存在本机，不上传到业务服务器。
- API Token 必须继续使用 `expo-secure-store` 保存，不要放进聊天记录或普通配置 JSON。
- "清除所有聊天记录"只能清除聊天会话，不应删除 API Token。
- **每次修改功能、命令、目录、依赖或打包方式后，都要同步更新 `README.md`。**
- **每次新增复杂逻辑后，要在代码里补充对新手友好的中文注释。**
- **每次修改项目维护约定后，要同步更新本文件。**
- **所有代码注释必须使用中文，面向完全不懂编程的用户编写。**

## 代码结构约定

- API 请求逻辑放在 `src/api/`。
- 本地存储逻辑放在 `src/storage/`。
- 页面放在 `src/screens/`。
- 可复用 UI 组件放在 `src/components/`。
- React Context 放在 `src/contexts/`。
- 通用颜色、间距、圆角放在 `src/styles/theme.ts`。
- 共享类型放在 `src/types.ts`。
- 默认值和常量放在 `src/constants.ts`。

## 主题系统约定

- 主题颜色在 `src/styles/theme.ts` 中定义（`litColors` 浅色、`dimColors` 深色）。
- 主题上下文在 `src/contexts/ThemeContext.tsx` 中管理。
- 所有 UI 组件必须通过 `useAppTheme()` hook 获取当前主题颜色。
- 新增主题颜色 key 时，必须在 `liteColors` 和 `dimColors` 中都添加。
- 主题偏好独立存储于 `src/storage/themeStorage.ts`（不和 settings 混在一起，避免初始化闪烁）。

## 产品约定

- 首页应该直接是可用的聊天界面，不做营销落地页。
- 设置页至少保留 `Base URL`、`API Token`、`Model`、"流式输出"开关、"Theme"和"清除聊天记录"。
- UI 要保持精致、克制、适合长期使用，避免堆砌说明文字。
- 错误提示要尽量直接告诉用户该检查 API Token、Base URL 或模型名。
- 深色模式下所有 UI 都要可用、可读，编码时避免写死颜色值。

## 注释规范

- **所有 .ts 和 .tsx 文件开头必须有中文文件头注释**，说明该文件的职责。
- **每个导出的函数/组件必须有 JSDoc 风格的中文注释**，说明用途、参数和返回值。
- **关键逻辑处要有行内中文注释**，解释"为什么这样做"而不仅仅是"做了什么"。
- **新增依赖和脚本命令后要更新 README 中的技术栈和常用命令表格。**
- **修改类型定义后要同步更新注释。**

## 打包约定

- APK 打包命令保留为 `npm run build:android:apk`。
- AAB 打包命令保留为 `npm run build:android:aab`。
- 依赖版本不匹配时，优先使用 `npm run fix:deps` 让 Expo 自动对齐。
- 修改 `app.json` 的安卓包名、版本号或 EAS 配置后，必须在 README 里说明。
- 不要手写占位的 EAS project id；首次构建时让 EAS 自动初始化项目配置。
- 新增 Expo 模块依赖（如 `expo-*`）时，注意版本号要与 Expo SDK 主版本号对齐。
- 修改 `app.json` 的安卓包名、版本号或 EAS 配置后，必须在 README 里说明。
- 不要手写占位的 EAS project id；首次构建时让 EAS 自动初始化项目配置。

## 项目当前状态（更新于 2026/06/17）

- Expo SDK: **54**（兼容 Expo Go 54.0.8）
- 主屏幕: `ChatScreen` — 聊天界面（侧滑抽屉 + 消息列表 + 底部输入框）
- 侧滑抽屉: `Drawer` — 新建对话 / 历史记录 / API 设置 / MCP 设置
- 设置页: `SettingsScreen` — 多 API 配置（名称/URL/Token/Model/启用开关/MCP绑定）+ 生成参数 + 外观
- MCP 设置: `McpSettingsScreen` — MCP 服务 CRUD + 连接测试（启动自动检测 + 手动测试按钮 + 绿/红状态）
- 消息操作: `MessageBubble` — 长按复制 + 重新生成
- 主题: `ThemeContext` — 浅色/深色/跟随系统
- 类型: `ApiProfile`(id, name, baseUrl, model, enabled) + `McpServer`(id, name, transport, command, args, url, env)
- Token: 每个 API profile 独立 Token，存储在 SecureStore 的 JSON map 中
- API 预设: DeepSeek / OpenAI / 硅基流动 / 智谱 AI / 月之暗面 / 通义千问 6 个预设
- 模型列表: 支持从 API 获取模型下拉选择 + 手动输入
- 已完成所有修复: TextDecoder 异常处理、fetch 网络错误处理、复制失败捕获、读取流异常处理、全局 colors 赋值保护、存储异常兜底、旧版数据自动迁移
- 最近更新：
  - 聊天页模型切换下拉始终可见 + 箭头旋转
  - 新建聊天 Toast 提示 + react-native-simple-toast

## 依赖版本记录

| 依赖 | 当前版本 | 说明 |
|------|---------|------|
| expo | ~54.0.0 | Expo SDK 54（适配 Expo Go 54.0.8） |
| react-native | 0.81.5 | React Native 核心 |
| lucide-react-native | ^0.577.0 | 图标库 |
| react-native-markdown-display | ^7.0.2 | Markdown 渲染 |
| @react-native-async-storage/async-storage | 2.2.0 | 聊天记录本地存储 |
| expo-secure-store | ~15.0.8 | API Token 加密存储 |
| expo-clipboard | ~8.0.8 | 消息复制到剪贴板 |
| react-native-safe-area-context | 5.6.0 | 安全区域适配 |
| expo-linear-gradient | ~15.0.8 | 渐变背景 |
| react-native-svg | 15.12.1 | SVG 渲染（图标库依赖） |
| react-native-simple-toast | ^3.3.2 | Android Toast 提示 |
