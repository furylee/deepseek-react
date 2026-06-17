# DeepSeek Custom API App

一个使用 **React Native + Expo + TypeScript** 开发的安卓优先聊天 App。
仿照 DeepSeek App 核心体验：打开即聊天、历史会话、Markdown 回复、
本地保存聊天记录，并支持自定义 API Token 和接口地址。

**无需登录认证，所有聊天记录只保存在手机本地。**

## 主要功能

- **聊天首页**：新建聊天、切换历史聊天、删除聊天
- **流式消息**：在 API 支持时实时显示回复（可关闭）
- **自定义 API**：设置 Base URL、API Token、Model
- **生成参数**：Temperature、Max Tokens、流式输出开关
- **消息操作**：长按 AI 消息可复制内容或重新生成回复
- **深色模式**：浅色 / 深色 / 跟随系统
- **本地存储**：聊天记录存 AsyncStorage，API Token 存 SecureStore（加密）
- **安卓打包**：内置 EAS Build 配置，一键生成 APK 或 AAB
- **中文注释**：全部代码附带新手友好的中文注释

## 面向完全初学者的术语解释

| 术语 | 解释 |
|------|------|
| **Expo** | 一个帮你"写一次代码，打包成手机 App"的工具平台 |
| **API Token** | 你从 DeepSeek 或中转服务商获取的密钥，通常以 `sk-` 开头 |
| **Base URL** | API 服务地址，例如 `https://api.deepseek.com/v1` |
| **Model** | 要使用的 AI 模型名称，例如 `deepseek-chat` |
| **APK** | 安卓安装包文件（可以直接传到手机安装） |
| **AAB** | 用于上传到 Google Play 应用商店的打包格式 |
| **EAS** | Expo Application Services，Expo 云端构建服务 |
| **SSE（流式输出）** | 让 AI 回复像打字一样逐字显示，而非一次性弹出 |
| **Temperature** | 控制 AI 回复的"创意程度"，0 = 严谨，2 = 天马行空 |
| **Max Tokens** | AI 单次回复的最大长度限制 |

## 环境要求

- **Node.js**：推荐 LTS 版本（在 [nodejs.org](https://nodejs.org) 下载）
- **npm** 或 **pnpm**：安装 Node.js 时已自动包含
- **Expo Go App**（可选）：在手机应用商店下载，用于实时测试

## 快速开始（小白版）

### 第一步：安装依赖

打开终端（Windows 用户：开始菜单 → 输入 "cmd" 回车），进入项目文件夹：

```bash
cd deepseek-react
npm install
# 或者
pnpm install
```

如果提示依赖版本不兼容，运行：

```bash
npm run fix:deps
```

### 第二步：启动开发服务

```bash
npm run start
```

执行后会出现一个二维码。你可以：
- 在安卓手机上安装 **Expo Go** App，扫码打开
- 或在电脑上安装 **Android Studio**，创建模拟器后按 `a` 键打开

### 第三步：设置 API

进入 App 右上角「设置」：

1. **Base URL**：填写你的 API 地址（默认是 DeepSeek 官方地址）
2. **API Token**：填写你的密钥（以 `sk-` 开头）
3. **Model**：填写模型名，如 `deepseek-chat`

然后返回聊天页即可开始对话。

## App 设置说明

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| Base URL | API 接口地址，会自动拼接 `/chat/completions` | `https://api.deepseek.com/v1` |
| API Token | 你的 API 密钥，加密存储在系统安全区域 | 空 |
| Model | 模型名称 | `deepseek-chat` |
| Temperature | 0~2，越小回答越固定 | `0.7` |
| Max Tokens | 单次回复最大长度 | `2048` |
| 流式输出 | 是否边生成边显示 | 开启 |
| 主题 | 浅色 / 深色 / 跟随系统 | 跟随系统 |

## 目录结构说明

```txt
.
├── App.tsx                      # App 入口，管理页面切换和全局状态
├── app.json                     # Expo 配置（包名、版本号等）
├── eas.json                     # EAS 安卓打包配置
├── package.json                 # 依赖列表和脚本命令
├── tsconfig.json                # TypeScript 编译器配置
├── babel.config.js              # Babel 编译配置
├── index.js                     # 应用注册入口
├── .gitignore                   # Git 忽略规则
├── agent.md                     # AI/开发者维护规范
├── src
│   ├── api/chatApi.ts           # OpenAI 兼容 API 请求逻辑（核心）
│   ├── components/              # 可复用 UI 组件
│   │   ├── MessageBubble.tsx    # 消息气泡（支持 Markdown & 长按操作）
│   │   ├── MessageActions.tsx   # 长按消息后的操作菜单（复制/重新生成）
│   │   ├── ChatComposer.tsx     # 底部输入框 + 发送/停止按钮
│   │   └── IconButton.tsx       # 通用图标按钮
│   ├── contexts/
│   │   └── ThemeContext.tsx     # 主题上下文（浅色/深色/跟随系统）
│   ├── screens/
│   │   ├── ChatScreen.tsx       # 聊天主页
│   │   └── SettingsScreen.tsx   # 设置页
│   ├── storage/
│   │   ├── chatStorage.ts       # 聊天记录读写
│   │   ├── settingsStorage.ts   # 设置读写（Token 放 SecureStore）
│   │   └── themeStorage.ts      # 主题偏好读写
│   ├── styles/theme.ts          # 颜色、间距、圆角等设计变量
│   ├── utils/chat.ts            # 创建消息、会话等工具函数
│   ├── types.ts                 # TypeScript 类型定义
│   └── constants.ts             # 默认值和存储 key
└── README.md                    # 本文件
```

## 安卓打包

### 准备

1. 安装 EAS CLI：`npm install -g eas-cli`
2. 登录 Expo：`eas login`（需要注册 [expo.dev](https://expo.dev) 账号）
3. 首次构建时按提示初始化 EAS 配置

### 生成 APK（可直接安装）

```bash
npm run build:android:apk
```

构建完成后，Expo 会返回一个下载链接。

### 生成 AAB（用于应用商店）

```bash
npm run build:android:aab
```

> **注意**：云端构建是免费的，但有次数和时间限制。免费版每月约 30 次构建。

## 技术栈

| 技术 | 说明 |
|------|------|
| Expo SDK 54 | React Native 开发框架 |
| TypeScript 5 | 带类型检查的 JavaScript |
| AsyncStorage | 聊天记录本地存储 |
| expo-secure-store | API Token 加密存储 |
| expo-clipboard | 消息复制到剪贴板 |
| react-native-markdown-display | AI 回复的 Markdown 渲染 |
| lucide-react-native v1 | 图标库 |
| expo-linear-gradient | 渐变色按钮和标题栏 |
| react-native-safe-area-context | 刘海屏/挖孔屏适配 |

## 常见问题

### Q: 提示 "请先在设置里填写 API Token"
**A:** 你还没有填写 API 密钥。进入右上角「设置」，在 API Token 输入框中粘贴你的密钥（通常以 `sk-` 开头），然后点击「保存设置」。

### Q: 发送消息后没有回复
**A:** 检查以下几点：
1. Base URL 是否正确（注意末尾是否多了或少了 `/v1`）
2. API Token 是否有效（核对是否有空格，是否过期）
3. Model 名称是否正确
4. 手机是否联网

### Q: 如何更换 API 服务商？
**A:** 在设置中修改 Base URL 即可。只要服务商兼容 OpenAI 的 `/chat/completions` 格式，就可以直接使用。

### Q: 清除聊天记录会删除 API Token 吗？
**A:** 不会。API Token 和聊天记录是分开存储的，清除聊天记录不会影响你的设置。

### Q: 我的聊天记录会上传到服务器吗？
**A:** 不会。所有聊天记录只保存在你手机的本地存储中。只有向 AI API 发送当前对话内容时，消息才会被发送到你的 API 服务商。

### Q: 如何在模拟器上运行？
**A:** 先安装 Android Studio，创建一个模拟器，然后运行 `npm run android`。

## 常用命令

```bash
npm run start              # 启动 Expo 开发服务
npm run android            # 在安卓设备/模拟器上打开
npm run typecheck          # TypeScript 类型检查
npm run fix:deps           # 自动修复依赖版本冲突
npm run build:android:apk  # 云端构建 APK
npm run build:android:aab  # 云端构建 AAB
```

## 重要开发说明

- 不添加登录认证（除非需求明确改变）
- API Token 不保存到普通聊天记录中
- 聊天记录仅本地存储，清除记录不影响 API Token
- 发送按钮在生成过程中变为停止按钮，可中断长回复
- 修改功能后需同步更新 `README.md` 和代码注释
- 修改维护规范后需同步更新 `agent.md`
- 不要手动在 `app.json` 中写入假的 EAS project ID
- 当前 API 格式兼容 OpenAI，核心逻辑在 `src/api/chatApi.ts`
- 真机可能不完全支持流式读取，代码已做兼容，可在设置中关闭
- 流式 `TextDecoder` 类型声明位于 `src/api/chatApi.ts` 内部，不添加全局 `.d.ts`
- 本地设置读取时通过归一化逻辑保证缺失字段自动退回默认值
