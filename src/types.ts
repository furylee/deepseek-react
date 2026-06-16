// ============================================================
// 全局 TypeScript 类型定义
// ------------------------------------------------------------
// 整个 App 共享的类型都在这里。
// 添加新类型时请注意：这里的字段会直接影响 AsyncStorage 的存储结构。
// ============================================================

import { ThemeMode } from "./contexts/ThemeContext";

/** 消息角色 — 遵循 OpenAI 规范 */
export type ChatRole = "system" | "user" | "assistant";

/** 单条聊天消息 */
export type ChatMessage = {
  /** 唯一标识，格式：msg-{时间戳}-{随机数} */
  id: string;
  /** 角色：user 或 assistant */
  role: ChatRole;
  /** 消息正文（Markdown 格式） */
  content: string;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 是否为错误消息（错误消息会显示特殊样式） */
  isError?: boolean;
};

/** 一个聊天会话，包含多条消息 */
export type ChatSession = {
  /** 唯一标识，格式：chat-{时间戳}-{随机数} */
  id: string;
  /** 会话标题（由第一条用户消息自动生成） */
  title: string;
  /** 创建时间戳（毫秒） */
  createdAt: number;
  /** 最后更新时间戳（毫秒） */
  updatedAt: number;
  /** 会话中的消息列表 */
  messages: ChatMessage[];
};

/** App 设置 — 保存在本地 */
export type AppSettings = {
  /** API 接口地址（例如 https://api.deepseek.com/v1） */
  baseUrl: string;
  /** API 密钥（保存在 SecureStore，不和其他设置一起存） */
  apiToken: string;
  /** 模型名称（例如 deepseek-chat） */
  model: string;
  /** 生成温度 0~2，越小越确定 */
  temperature: number;
  /** 最大生成长度（token 数） */
  maxTokens: number;
  /** 是否开启 SSE 流式输出 */
  stream: boolean;
  /** 主题模式：浅色 | 深色 | 跟随系统 */
  themeMode: ThemeMode;
};
