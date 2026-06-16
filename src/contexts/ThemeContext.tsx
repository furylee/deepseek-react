// ============================================================
// ThemeContext — 主题上下文
// ------------------------------------------------------------
// 为整个 App 提供浅色/深色/跟随系统的主题切换能力。
//
// 使用方式：
//   const { colors, themeMode, setThemeMode } = useAppTheme();
//   // colors 是当前生效的主题颜色对象
//
// 工作原理：
//   1. App 启动时从本地存储读取用户选择的 themeMode。
//   2. 如果 themeMode 是 "system"，则监听系统的颜色方案（useColorScheme）。
//   3. 把对应的颜色对象写入全局的 colors 变量 + React Context。
//   4. 所有子组件通过 useAppTheme() 获取最新颜色。
// ============================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeColors } from "../styles/theme";
import { colors as globalColors, litColors, dimColors } from "../styles/theme";

// ----------------------------------------------------------
// 类型定义
// ----------------------------------------------------------

/** 主题模式：浅色 | 深色 | 跟随系统 */
export type ThemeMode = "lit" | "dim" | "system";

/** 主题上下文中暴露的值 */
type ThemeContextValue = {
  /** 当前生效的颜色对象 */
  colors: ThemeColors;
  /** 用户选择的主题模式 */
  themeMode: ThemeMode;
  /** 切换主题模式并持久化到本地 */
  setThemeMode: (mode: ThemeMode) => Promise<void>;
};

// ----------------------------------------------------------
// Context 创建
// ----------------------------------------------------------

const ThemeContext = createContext<ThemeContextValue>({
  colors: litColors,
  themeMode: "system",
  setThemeMode: async () => {},
});

// ----------------------------------------------------------
// 存储 key
// ----------------------------------------------------------

const THEME_STORAGE_KEY = "deepseek-custom.theme.v1";

// ----------------------------------------------------------
// Provider 组件
// ----------------------------------------------------------

type ThemeProviderProps = {
  /** 从本地存储恢复的初始主题模式 */
  initialMode?: ThemeMode;
  children: React.ReactNode;
};

/**
 * ThemeProvider
 * 必须在 App 根组件中包裹所有 UI 组件。
 * 它会：
 * 1. 读取 initialMode（来自 AsyncStorage）
 * 2. 监听系统颜色方案变化
 * 3. 把解析后的颜色写入 React Context + 全局变量
 */
export function ThemeProvider({ initialMode = "system", children }: ThemeProviderProps) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null
  const [themeMode, setThemeModeState] = React.useState<ThemeMode>(initialMode);

  // 持久化主题选择
  const setThemeModeAndSave = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  // 根据 themeMode + systemScheme 计算出最终的颜色方案
  const resolvedScheme = useMemo<"light" | "dark">(() => {
    if (themeMode === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return themeMode === "dim" ? "dark" : "light";
  }, [themeMode, systemScheme]);

  // 拿到对应主题的颜色对象
  const resolvedColors = useMemo<ThemeColors>(() => {
    return (resolvedScheme === "dark" ? dimColors : litColors) as ThemeColors;
  }, [resolvedScheme]);

  // 同步到全局 colors 对象（为了那些不方便用 hook 的地方）
  useEffect(() => {
    try {
      Object.assign(globalColors, resolvedColors);
    } catch {
      // 极端情况：全局对象被冻结，不影响 UI（所有组件走 Context）
    }
  }, [resolvedColors]);

  // 如果 initialMode 变化（比如设置页改了值重新加载），同步更新
  useEffect(() => {
    setThemeModeState(initialMode);
  }, [initialMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: resolvedColors,
      themeMode,
      setThemeMode: setThemeModeAndSave,
    }),
    [resolvedColors, themeMode, setThemeModeAndSave]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ----------------------------------------------------------
// Hook
// ----------------------------------------------------------

/**
 * useAppTheme — 在任意组件中获取当前主题信息。
 *
 * 返回值：
 *   - colors: 当前生效的颜色对象
 *   - themeMode: 用户选择的模式（"lit" | "dim" | "system"）
 *   - setThemeMode: 切换模式的函数（会自动保存到本地）
 */
export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
