# Agent 维护规则

这个文件给后续维护本项目的 AI Agent 或开发者使用。项目目标是：构建一个安卓优先、无登录、本地保存聊天记录、支持自定义 OpenAI-compatible API 的 DeepSeek 风格聊天 App。

## 必须遵守

- 使用 React Native + Expo + TypeScript 继续开发。
- 默认主目标是安卓客户端，所有新增能力都要考虑安卓真机体验。
- 不添加登录认证，除非用户明确提出。
- 聊天记录保存在本机，不上传到业务服务器。
- API Token 必须继续使用 `expo-secure-store` 保存，不要放进聊天记录或普通配置 JSON。
- “清除所有聊天记录”只能清除聊天会话，不应删除 API Token。
- 每次修改功能、命令、目录、依赖或打包方式后，都要同步更新 `README.md`。
- 每次新增复杂逻辑后，要在代码里补充对新手友好的关键注释。
- 每次修改项目维护约定后，要同步更新本文件。

## 代码结构约定

- API 请求逻辑放在 `src/api/`。
- 本地存储逻辑放在 `src/storage/`。
- 页面放在 `src/screens/`。
- 可复用 UI 组件放在 `src/components/`。
- 通用颜色、间距、圆角放在 `src/styles/theme.ts`。
- 共享类型放在 `src/types.ts`。

## 产品约定

- 首页应该直接是可用的聊天界面，不做营销落地页。
- 设置页至少保留 `Base URL`、`API Token`、`Model` 和“清除聊天记录”。
- UI 要保持精致、克制、适合长期使用，避免堆砌说明文字。
- 错误提示要尽量直接告诉用户该检查 API Token、Base URL 或模型名。

## 打包约定

- APK 打包命令保留为 `npm run build:android:apk`。
- AAB 打包命令保留为 `npm run build:android:aab`。
- 依赖版本不匹配时，优先使用 `npm run fix:deps` 让 Expo 自动对齐。
- Expo SDK 55 下 `expo-secure-store` 应保持 `~55.0.14`，`expo-status-bar` 应保持 `~55.0.6`。
- 不要为 `TextDecoder` 新增全局 `.d.ts` 声明；流式读取的最小类型应保留在 `src/api/chatApi.ts` 局部。
- 修改设置存储时，继续通过归一化逻辑保证 `loadSettings()` 返回完整 `AppSettings`。
- 修改 `app.json` 的安卓包名、版本号或 EAS 配置后，必须在 README 里说明。
- 不要手写占位的 EAS project id；首次构建时让 EAS 自动初始化项目配置。
