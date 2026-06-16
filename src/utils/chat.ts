// ============================================================
// chat — 聊天工具函数
// ------------------------------------------------------------
// 提供创建消息、会话、生成标题、格式化时间等通用工具函数。
// 这些函数不依赖 React，可以在任何地方导入使用。
// ============================================================

import { ChatMessage, ChatSession } from "../types";

/**
 * createId — 生成唯一标识符。
 *
 * 格式：{前缀}-{时间戳}-{8位随机数}
 * 例如：msg-1703001234567-abcdef01
 *
 * 时间戳 + 随机数的组合在本地使用足够唯一。
 */
export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * createMessage — 创建一条聊天消息。
 *
 * @param role - 消息角色（"user" | "assistant"）
 * @param content - 消息正文
 * @param isError - 是否为错误消息（错误消息会显示红色样式）
 */
export function createMessage(
  role: ChatMessage["role"],
  content: string,
  isError = false
): ChatMessage {
  return {
    id: createId("msg"),
    role,
    content,
    createdAt: Date.now(),
    isError,
  };
}

/**
 * createEmptySession — 创建一个空的聊天会话。
 *
 * 新会话没有消息，标题默认显示"新的聊天"。
 */
export function createEmptySession(): ChatSession {
  const now = Date.now();
  return {
    id: createId("chat"),
    title: "新的聊天",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

/**
 * createWelcomeSession — 创建带欢迎语的第一个会话。
 *
 * 用户首次打开 App 时会看到这个会话。
 * 欢迎消息会提示用户去设置里填写 API Token。
 */
export function createWelcomeSession(): ChatSession {
  const session = createEmptySession();
  return {
    ...session,
    title: "欢迎使用",
    messages: [
      createMessage(
        "assistant",
        "你好，我是你的自定义 API 聊天助手。\n\n" +
          "请先到右上角「设置」里填写：\n" +
          "1. **Base URL** — 你的 API 地址（如 https://api.deepseek.com/v1）\n" +
          "2. **API Token** — 你的 API 密钥\n" +
          "3. **Model** — 模型名称（如 deepseek-chat）\n\n" +
          "完成后就可以开始对话了！"
      ),
    ],
  };
}

/**
 * makeSessionTitle — 根据用户输入生成会话标题。
 *
 * 规则：
 *   - 空白输入 → "新的聊天"
 *   - 超过 18 个字符 → 截断并加 "..."
 *   - 否则 → 直接使用输入
 */
export function makeSessionTitle(input: string) {
  const compact = input.replace(/\s+/g, " ").trim();
  if (!compact) return "新的聊天";
  return compact.length > 18 ? `${compact.slice(0, 18)}...` : compact;
}

/**
 * formatSessionTime — 格式化时间戳为可读的中文日期时间。
 *
 * 格式：MM/DD HH:mm（例如：12/15 14:30）
 */
export function formatSessionTime(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
