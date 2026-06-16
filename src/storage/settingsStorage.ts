// ============================================================
// settingsStorage — 设置本地持久化
// ------------------------------------------------------------
// 负责 App 设置的读写。
// 关键设计决策：
//   - API Token 存在 SecureStore（系统级加密存储），不会和普通配置混在一起。
//   - 其他设置（Base URL、Model、Temperature 等）存在 AsyncStorage。
//   - normalizeSettings 函数确保读回来的数据即使缺少字段也能回到默认值。
//
// 如果你要添加新的设置项：
//   1. 在 src/types.ts 的 AppSettings 中添加字段。
//   2. 在 src/constants.ts 的 DEFAULT_SETTINGS 中添加默认值。
//   3. 在 normalizeSettings 中处理新字段（如果默认值不是 falsy）。
//   4. 在 SettingsScreen 中添加对应的 UI。
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../constants";
import { AppSettings } from "../types";

/**
 * 持久化时排除的字段（不会存入 AsyncStorage）
 * apiToken 走 SecureStore，所以从普通设置中排除。
 */
type PersistedSettings = Omit<AppSettings, "apiToken">;

/**
 * normalizeSettings — 把从存储中读取的不完整数据补全为完整的 AppSettings。
 *
 * 为什么要这样做？
 * 如果未来版本新增了设置项，老版本的存储数据里没有这个字段。
 * normalizeSettings 会用 DEFAULT_SETTINGS 中的默认值来填充，
 * 避免因为缺少字段而崩溃。
 */
function normalizeSettings(
  settings: Partial<PersistedSettings>,
  apiToken: string
): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    baseUrl: settings.baseUrl ?? DEFAULT_SETTINGS.baseUrl,
    model: settings.model ?? DEFAULT_SETTINGS.model,
    temperature: settings.temperature ?? DEFAULT_SETTINGS.temperature,
    maxTokens: settings.maxTokens ?? DEFAULT_SETTINGS.maxTokens,
    stream: settings.stream ?? DEFAULT_SETTINGS.stream,
    themeMode: settings.themeMode ?? DEFAULT_SETTINGS.themeMode,
    apiToken,
  };
}

/**
 * loadSettings — 从本地存储读取 App 设置。
 *
 * 同时读取 AsyncStorage（普通配置）和 SecureStore（API Token），
 * 然后归一化为完整的 AppSettings 对象返回。
 */
export async function loadSettings(): Promise<AppSettings> {
  const [rawSettings, savedToken] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.settings),
    SecureStore.getItemAsync(STORAGE_KEYS.apiToken),
  ]);

  if (!rawSettings) {
    return normalizeSettings({}, savedToken ?? "");
  }

  try {
    const parsed = JSON.parse(rawSettings) as Partial<PersistedSettings>;
    return normalizeSettings(parsed, savedToken ?? "");
  } catch {
    // JSON 解析失败时，退回默认值
    return normalizeSettings({}, savedToken ?? "");
  }
}

/**
 * saveSettings — 把 App 设置保存到本地存储。
 *
 * Token 单独放进 SecureStore（系统安全存储），
 * 普通配置继续放 AsyncStorage，方便清理聊天记录时不影响 Token。
 */
export async function saveSettings(settings: AppSettings) {
  const { apiToken, ...safeSettings } = settings;

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(safeSettings)),
    SecureStore.setItemAsync(STORAGE_KEYS.apiToken, apiToken),
  ]);
}
