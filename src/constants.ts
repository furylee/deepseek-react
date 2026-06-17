// ============================================================
// 常量 & 默认值
// ------------------------------------------------------------
// 全局默认值和存储 key 都在这里。
// 修改 DEFAULT_SETTINGS 会影响新用户第一次打开 App 时的设置。
// ============================================================

import { AppSettings } from "./types";
import { ThemeMode } from "./contexts/ThemeContext";

/** 默认 API 配置（新用户首次打开时创建） */
const DEFAULT_PROFILE = {
  id: "ap-default",
  name: "DeepSeek 官方",
  baseUrl: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  enabled: true,
};

/** 新用户首次打开 App 时的默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  /** 默认包含一个 DeepSeek 官方 API 配置组 */
  apiProfiles: [DEFAULT_PROFILE],
  /** 默认选中第一个配置 */
  activeProfileId: DEFAULT_PROFILE.id,
  /** 默认无 MCP 服务 */
  mcpServers: [],
  /** 默认各 profile 无 MCP 绑定 */
  profileMcpMap: {},
  /** 0.7 是比较平衡的选择，创意和准确性兼顾 */
  temperature: 0.7,
  /** 2048 token 足够大多数回复，太长会增加等待时间 */
  maxTokens: 2048,
  /** 默认开启流式输出，让回复边生成边显示（体验更好） */
  stream: true,
  /** 默认跟随系统主题 */
  themeMode: "system" as ThemeMode,
};

/**
 * 旧版设置类型（v1 版本，只有单组 API 配置）。
 * 用于在加载时自动检测并迁移旧数据。
 */
export type LegacySettingsV1 = {
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  themeMode?: ThemeMode;
};

/** AsyncStorage / SecureStore 中使用的 key */
export const STORAGE_KEYS = {
  /** 聊天会话列表的 key */
  sessions: "deepseek-custom.sessions.v1",
  /** 普通设置的 key（不含 API Token） */
  settings: "deepseek-custom.settings.v1",
  /** API Token 集合的 key（存在 SecureStore 中，JSON map） */
  apiTokens: "deepseek-custom.api-tokens.v1",
  /** 旧版单 Token key（保留用于迁移） */
  apiTokenLegacy: "deepseek-custom.api-token.v1",
} as const;

/** 常见 API 大厂预设配置 — 点击即可快速填入 */
export const API_PRESETS = [
  {
    name: "DeepSeek 官方",
    baseUrl: "https://api.deepseek.com/v1",
    modelHint: "deepseek-chat",
  },
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelHint: "gpt-4o",
  },
  {
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    modelHint: "deepseek-ai/DeepSeek-V3",
  },
  {
    name: "智谱 AI",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    modelHint: "glm-4",
  },
  {
    name: "月之暗面",
    baseUrl: "https://api.moonshot.cn/v1",
    modelHint: "moonshot-v1-8k",
  },
  {
    name: "阿里通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    modelHint: "qwen-plus",
  },
] as const;
