# DeepSeek Custom API App

这是一个使用 **React Native + Expo + TypeScript** 开发的安卓优先聊天 App。它仿照 DeepSeek App 的核心使用方式：打开即聊天、支持历史会话、支持 Markdown 回复、本地保存聊天记录，并允许用户在设置里填写自己的 API Token 和自定义接口地址。

本项目不包含登录认证，聊天记录只保存在手机本机。

## 主要功能

- 聊天首页：新建聊天、切换历史聊天、删除当前聊天。
- 消息生成：支持发送消息、停止生成，并在接口支持时流式显示回复。
- 自定义 API：设置 `Base URL`、`API Token`、`Model`。
- 生成参数：设置 `Temperature`、`Max Tokens`、是否开启流式输出。
- 本地存储：聊天记录保存在 `AsyncStorage`，API Token 保存在 `expo-secure-store`。
- Markdown 展示：AI 回复支持基础 Markdown 和代码块样式。
- 安卓打包：内置 EAS Build 配置，可生成 APK 或 AAB。

## 技术栈

- `Expo SDK 55`
- `React Native`
- `TypeScript`
- `expo-secure-store`
- `@react-native-async-storage/async-storage`
- `react-native-markdown-display`
- `lucide-react-native`
- `expo-linear-gradient`

## 目录说明

```txt
.
├── App.tsx                      # App 入口，管理聊天页/设置页切换和全局状态
├── app.json                     # Expo App 配置，包含安卓包名
├── eas.json                     # EAS 安卓打包配置
├── package.json                 # 依赖和常用命令
├── src
│   ├── api/chatApi.ts           # OpenAI-compatible 聊天接口请求逻辑
│   ├── components               # 可复用 UI 组件
│   ├── screens                  # 聊天页和设置页
│   ├── storage                  # 本地保存聊天和设置
│   ├── styles/theme.ts          # 颜色、间距、圆角等统一设计变量
│   ├── types.ts                 # TypeScript 数据类型
│   └── utils/chat.ts            # 创建会话、消息、标题等工具函数
└── agent.md                     # 后续 AI/开发者维护本项目时必须遵守的规则
```

## 第一次运行

你的电脑需要先安装 Node.js。推荐安装 Node.js LTS 版本。

安装依赖：

```bash
npm install
```

如果 Expo 提示依赖版本不匹配，运行：

```bash
npm run fix:deps
```

启动开发服务：

```bash
npm run start
```

如果你已经安装了安卓模拟器或连接了安卓真机，可以运行：

```bash
npm run android
```

## App 设置方法

打开 App 后进入右上角“设置”：

- `Base URL`：例如 `https://api.deepseek.com/v1`
- `API Token`：你的接口密钥，例如 `sk-...`
- `Model`：例如 `deepseek-chat`

如果你使用的是自建中转服务，只要它兼容 OpenAI 的 `/chat/completions` 格式即可。代码会自动把 `Base URL` 拼成：

```txt
{Base URL}/chat/completions
```

如果你直接填写的地址已经以 `/chat/completions` 结尾，代码不会重复拼接。

## 安卓打包

本项目使用 EAS Build 打包安卓客户端。

首次使用时安装 EAS CLI：

```bash
npm install -g eas-cli
```

登录 Expo：

```bash
eas login
```

生成可安装的 APK：

```bash
npm run build:android:apk
```

生成用于应用商店的 AAB：

```bash
npm run build:android:aab
```

首次云端构建时，如果 EAS 提示初始化项目，按提示确认即可。Expo 会自动写入真实的项目配置。

## 重要开发说明

- 不要加入登录认证，除非产品需求明确改变。
- 不要把 API Token 保存到普通聊天记录里。
- 聊天记录只做本地存储，清除聊天记录时不要清除 API Token。
- 发送按钮在生成过程中会变成停止按钮，方便中断较长回复。
- 修改任何功能后，需要同步更新 `README.md` 和代码注释。
- 修改长期维护规则时，需要同步更新 `agent.md`。
- 不要在 `app.json` 里手写假的 EAS project id；首次构建时让 EAS 自动生成。
- 当前接口按 OpenAI-compatible 格式实现，核心文件是 `src/api/chatApi.ts`。
- 真机上部分接口或运行时可能不支持真正的流式读取；代码已做兼容，必要时可在设置里关闭“流式输出”。
- Expo SDK 55 的 `expo-secure-store` 使用 `~55.0.14`，`expo-status-bar` 使用 `~55.0.6`，不要改回旧版号。
- 流式读取的 `TextDecoder` 类型在 `src/api/chatApi.ts` 内部做了局部声明，不要新增全局声明文件，避免和 DOM 类型冲突。
- 从本地读取设置时会先经过归一化，保证缺失字段自动回到默认值。

## 常用命令

```bash
npm run start            # 启动 Expo
npm run android          # 在安卓设备/模拟器打开
npm run typecheck        # TypeScript 类型检查
npm run fix:deps         # 让 Expo 自动修复依赖版本
npm run build:android:apk # 云端构建 APK
npm run build:android:aab # 云端构建 AAB
```
