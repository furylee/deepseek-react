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

/** 一组 API 配置（不含 Token，Token 单独加密存储） */
export type ApiProfile = {
  /** 唯一标识，格式：ap-{时间戳}-{随机数} */
  id: string;
  /** 用户自定义名称，如 "DeepSeek 官方"、"硅基流动" */
  name: string;
  /** API 接口地址（例如 https://api.deepseek.com/v1） */
  baseUrl: string;
  /** 模型名称（例如 deepseek-chat） */
  model: string;
  /** 是否启用（禁用的配置不会出现在聊天页切换器中） */
  enabled: boolean;
};

/** 一个 MCP 服务配置 */
export type McpServer = {
  /** 唯一标识，格式：mcp-{时间戳}-{随机数} */
  id: string;
  /** 服务名称，如 "filesystem"、"web-search" */
  name: string;
  /** 传输方式：stdio 命令行 / sse 远程地址 */
  transport: "stdio" | "sse";
  /** stdio 模式：启动命令（如 npx、node） */
  command: string;
  /** stdio 模式：启动参数，空格分隔 */
  args: string;
  /** sse 模式：远程服务 URL */
  url: string;
  /** 环境变量，每行一个 KEY=VALUE */
  env: string;
};

/** App 设置 — 保存在本地 */
export type AppSettings = {
  /** 多组 API 配置 */
  apiProfiles: ApiProfile[];
  /** 当前选中的配置组 ID */
  activeProfileId: string;
  /** MCP 服务列表 */
  mcpServers: McpServer[];
  /** 每个 API profile 启用的 MCP 服务 ID 列表 */
  profileMcpMap: Record<string, string[]>;
  /** 生成温度 0~2，越小越确定 */
  temperature: number;
  /** 最大生成长度（token 数） */
  maxTokens: number;
  /** 是否开启 SSE 流式输出 */
  stream: boolean;
  /** 主题模式：浅色 | 深色 | 跟随系统 */
  themeMode: ThemeMode;
};

/** 获取当前激活的 API 配置 */
export function getActiveProfile(settings: AppSettings): ApiProfile | undefined {
  return settings.apiProfiles.find((p) => p.id === settings.activeProfileId);
}
