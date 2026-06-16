// ============================================================
// 常量 & 默认值
// ------------------------------------------------------------
// 全局默认值和存储 key 都在这里。
// 修改 DEFAULT_SETTINGS 会影响新用户第一次打开 App 时的设置。
// ============================================================

import { AppSettings } from "./types";
import { ThemeMode } from "./contexts/ThemeContext";

/** 新用户首次打开 App 时的默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  /** DeepSeek 官方 API 地址 */
  baseUrl: "https://api.deepseek.com/v1",
  /** API 密钥（默认为空，需要用户在设置中填写） */
  apiToken: "",
  /** 模型名称（deepseek-chat 适合日常对话） */
  model: "deepseek-chat",
  /** 0.7 是比较平衡的选择，创意和准确性兼顾 */
  temperature: 0.7,
  /** 2048 token 足够大多数回复，太长会增加等待时间 */
  maxTokens: 2048,
  /** 默认开启流式输出，让回复边生成边显示（体验更好） */
  stream: true,
  /** 默认跟随系统主题 */
  themeMode: "system" as ThemeMode,
};

/** AsyncStorage / SecureStore 中使用的 key */
export const STORAGE_KEYS = {
  /** 聊天会话列表的 key */
  sessions: "deepseek-custom.sessions.v1",
  /** 普通设置的 key（不含 API Token） */
  settings: "deepseek-custom.settings.v1",
  /** API Token 的 key（存在 SecureStore 中） */
  apiToken: "deepseek-custom.api-token.v1",
} as const;
