// ============================================================
// chatStorage — 聊天记录本地持久化
// ------------------------------------------------------------
// 负责聊天会话的读写和清除。
// 聊天记录以 JSON 字符串的形式保存在 AsyncStorage 中。
// 每次 App 启动时会自动加载，每次修改会话后会自动保存。
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "../constants";
import { ChatSession } from "../types";

/**
 * loadSessions — 从本地存储读取所有聊天会话。
 *
 * 返回一个 ChatSession 数组。
 * 如果存储中没有数据，或 JSON 解析失败，返回空数组。
 * App.tsx 会在启动时调用这个函数，如果返回空数组则显示欢迎页。
 */
export async function loadSessions(): Promise<ChatSession[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.sessions);

  if (!raw) {
    return [];
  }

  try {
    const sessions = JSON.parse(raw) as ChatSession[];
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    // JSON 解析失败（比如数据损坏），返回空数组让 App 初始化新会话
    return [];
  }
}

/**
 * saveSessions — 把聊天会话列表保存到本地存储。
 *
 * 会在每次会话内容变化时自动调用（App.tsx 的 useEffect）。
 * 数据以 JSON 字符串形式存储，内容包含所有消息的完整文本。
 */
export async function saveSessions(sessions: ChatSession[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(sessions));
}

/**
 * clearSessions — 清除所有聊天记录。
 *
 * 只会删除聊天会话的 key，不会影响设置和 API Token。
 * 注意：API Token 存在 SecureStore 的另一个 key 中，完全独立。
 */
export async function clearSessions() {
  await AsyncStorage.removeItem(STORAGE_KEYS.sessions);
}
