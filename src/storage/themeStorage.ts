// ============================================================
// themeStorage — 主题偏好本地存储
// ------------------------------------------------------------
// 和 settings 分开存储，因为主题需要在 ThemeProvider 初始化前
// 就读取（settings 加载太慢会导致主题闪烁）。
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeMode } from "../contexts/ThemeContext";

const THEME_KEY = "deepseek-custom.theme.v1";

export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    const value = await AsyncStorage.getItem(THEME_KEY);
    if (value === "lit" || value === "dim" || value === "system") {
      return value;
    }
  } catch {
    // 读取失败，使用默认值
  }
  return "system";
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, mode);
}
