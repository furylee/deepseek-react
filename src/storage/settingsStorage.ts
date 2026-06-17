// ============================================================
// settingsStorage — 设置本地持久化
// ------------------------------------------------------------
// 负责 App 设置的读写。
// 关键设计决策：
//   - API Token 存在 SecureStore（系统级加密存储），以 JSON map 形式
//     { [profileId]: apiToken } 存储多个配置组的 Token。
//   - 其他设置（profiles、activeId、生成参数）存在 AsyncStorage。
//   - normalizeSettings 函数确保读回来的数据即使缺少字段也能回到默认值。
//   - 自动检测并迁移旧版（v1）单组 API 配置数据。
//
// 如果你要添加新的设置项：
//   1. 在 src/types.ts 的 AppSettings 中添加字段。
//   2. 在 src/constants.ts 的 DEFAULT_SETTINGS 中添加默认值。
//   3. 在 normalizeSettings 中处理新字段（如果默认值不是 falsy）。
//   4. 在 SettingsScreen 中添加对应的 UI。
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import { DEFAULT_SETTINGS, LegacySettingsV1, STORAGE_KEYS } from "../constants";
import { AppSettings, ApiProfile } from "../types";

/**
 * 持久化时排除的字段（不会存入 AsyncStorage）
 * apiToken 走 SecureStore 存储，所以从普通设置中排除。
 */
type PersistedSettings = Omit<AppSettings, "apiToken">;

/**
 * Token 集合类型：{ [profileId]: "sk-..." }
 */
type TokenMap = Record<string, string>;

/**
 * loadTokenMap — 从 SecureStore 读取所有配置组的 Token。
 *
 * 同时检查旧版单 Token key，如果存在则自动迁移到新版 map 格式。
 */
async function loadTokenMap(): Promise<TokenMap> {
  // 先读新版 map
  const raw = await SecureStore.getItemAsync(STORAGE_KEYS.apiTokens);
  if (raw) {
    try {
      const map = JSON.parse(raw) as TokenMap;
      if (typeof map === "object" && !Array.isArray(map)) {
        return map;
      }
    } catch {
      // JSON 损坏，回退到空 map
    }
  }

  // 检查旧版单 Token key（v1 迁移）
  const legacyToken = await SecureStore.getItemAsync(STORAGE_KEYS.apiTokenLegacy);
  if (legacyToken) {
    // 迁移：旧 Token 分配给默认的第一个 profile
    const migrated: TokenMap = { "ap-default": legacyToken };
    await SecureStore.setItemAsync(STORAGE_KEYS.apiTokens, JSON.stringify(migrated));
    // 删除旧 key（静默失败不影响流程）
    SecureStore.deleteItemAsync(STORAGE_KEYS.apiTokenLegacy).catch(() => {});
    return migrated;
  }

  return {};
}

/**
 * saveTokenMap — 保存所有配置组的 Token 到 SecureStore。
 */
async function saveTokenMap(tokens: TokenMap) {
  await SecureStore.setItemAsync(STORAGE_KEYS.apiTokens, JSON.stringify(tokens));
}

/**
 * normalizeSettings — 把从存储中读取的不完整数据补全为完整的 AppSettings。
 *
 * 为什么这样做？
 * 如果未来版本新增了设置项，老版本的存储数据里没有这个字段。
 * normalizeSettings 会用 DEFAULT_SETTINGS 中的默认值来填充，
 * 避免因为缺少字段而崩溃。
 */
function normalizeSettings(
  settings: Partial<PersistedSettings>,
  tokens: TokenMap
): AppSettings {
  // 确保 profiles 数组有效
  const profiles = Array.isArray(settings.apiProfiles) && settings.apiProfiles.length > 0
    ? settings.apiProfiles
    : DEFAULT_SETTINGS.apiProfiles;

  // 确保 activeProfileId 有效
  const activeId = settings.activeProfileId && profiles.some((p) => p.id === settings.activeProfileId)
    ? settings.activeProfileId
    : profiles[0]?.id ?? DEFAULT_SETTINGS.activeProfileId;

  return {
    ...DEFAULT_SETTINGS,
    apiProfiles: profiles,
    activeProfileId: activeId,
    mcpServers: Array.isArray(settings.mcpServers) ? settings.mcpServers : [],
    profileMcpMap: settings.profileMcpMap ?? {},
    temperature: settings.temperature ?? DEFAULT_SETTINGS.temperature,
    maxTokens: settings.maxTokens ?? DEFAULT_SETTINGS.maxTokens,
    stream: settings.stream ?? DEFAULT_SETTINGS.stream,
    themeMode: settings.themeMode ?? DEFAULT_SETTINGS.themeMode,
    // 不存 apiToken 字段，通过 Token map 在调用方获取
  };
}

/**
 * loadSettings — 从本地存储读取 App 设置。
 *
 * 同时读取 AsyncStorage（普通配置）和 SecureStore（Token map），
 * 然后归一化为完整的 AppSettings 对象返回。
 * 自动检测并迁移旧版（v1）数据。
 */
export async function loadSettings(): Promise<{ settings: AppSettings; tokens: TokenMap }> {
  const [rawSettings, tokenMap] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.settings),
    loadTokenMap(),
  ]);

  if (!rawSettings) {
    return { settings: normalizeSettings({}, tokenMap), tokens: tokenMap };
  }

  try {
    const parsed = JSON.parse(rawSettings) as Partial<PersistedSettings> | LegacySettingsV1;

    // 检测旧版 v1 数据格式（有 baseUrl 但没有 apiProfiles）
    if ((parsed as LegacySettingsV1).baseUrl && !(parsed as PersistedSettings).apiProfiles) {
      return migrateV1ToV2(parsed as LegacySettingsV1, tokenMap);
    }

    return { settings: normalizeSettings(parsed as PersistedSettings, tokenMap), tokens: tokenMap };
  } catch {
    // JSON 解析失败，退回默认值
    return { settings: normalizeSettings({}, tokenMap), tokens: tokenMap };
  }
}

/**
 * migrateV1ToV2 — 将旧版单 API 配置迁移为新版多 profile 格式。
 *
 * 旧格式：{ baseUrl, model, apiToken(在 SecureStore 另一 key) }
 * 新格式：{ apiProfiles: [...], activeProfileId }
 *
 * 迁移后自动保存新格式到 AsyncStorage，用户无感知。
 */
function migrateV1ToV2(legacy: LegacySettingsV1, tokens: TokenMap) {
  const legacyToken = tokens["ap-default"] ?? "";

  const migratedProps: Partial<PersistedSettings> = {
    apiProfiles: [
      {
        id: "ap-default",
        name: "默认 API",
        baseUrl: legacy.baseUrl ?? "https://api.deepseek.com/v1",
        model: legacy.model ?? "deepseek-chat",
        enabled: true,
      },
    ],
    activeProfileId: "ap-default",
    temperature: legacy.temperature,
    maxTokens: legacy.maxTokens,
    stream: legacy.stream,
    themeMode: legacy.themeMode,
  };

  // 异步保存迁移后的数据（不阻塞返回）
  AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(migratedProps)).catch(() => {});

  return { settings: normalizeSettings(migratedProps, tokens), tokens };
}

/**
 * saveSettings — 把 App 设置和 Token map 保存到本地存储。
 *
 * 分开三个参数便于调用方管理 Token。
 */
export async function saveSettings(
  settings: AppSettings,
  tokens: TokenMap
) {
  const { apiProfiles, activeProfileId, mcpServers, profileMcpMap, temperature, maxTokens, stream, themeMode } = settings;

  const persisted: PersistedSettings = {
    apiProfiles,
    activeProfileId,
    mcpServers,
    profileMcpMap,
    temperature,
    maxTokens,
    stream,
    themeMode,
  };

  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(persisted)),
    saveTokenMap(tokens),
  ]);
}

/**
 * getTokenForProfile — 从 Token map 中获取指定 profile 的 Token。
 *
 * 便捷函数，避免调用方需要自行维护 Token map。
 */
export function getTokenForProfile(tokens: TokenMap, profileId: string): string {
  return tokens[profileId] ?? "";
}
