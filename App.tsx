// ============================================================
// App.tsx — 应用根组件
// ------------------------------------------------------------
// 这是整个 App 的入口文件。
// 它负责：
//   1. 启动时从本地存储加载设置和聊天记录
//   2. 管理聊天页 / 设置页之间的切换
//   3. 提供全局主题上下文
//
// 如果你要添加新的全局状态，通常在这里管理，然后通过 props 下传。
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ChatScreen } from "./src/screens/ChatScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ThemeProvider, useAppTheme } from "./src/contexts/ThemeContext";
import { createEmptySession, createWelcomeSession } from "./src/utils/chat";
import { loadSessions, saveSessions } from "./src/storage/chatStorage";
import { loadSettings, saveSettings } from "./src/storage/settingsStorage";
import { AppSettings, ChatSession } from "./src/types";
import { loadThemeMode } from "./src/storage/themeStorage";

// ----------------------------------------------------------
// AppContent — 在 ThemeProvider 内部渲染实际 UI
// 这样 useAppTheme() 才能正常工作
// ----------------------------------------------------------
function AppContent() {
  const { colors: theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<"chat" | "settings">("chat");
  const [isBooting, setIsBooting] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  // ---- 启动：加载本地数据 ----
  useEffect(() => {
    async function boot() {
      const [savedSettings, savedSessions] = await Promise.all([
        loadSettings(),
        loadSessions(),
      ]);

      // 如果没有聊天记录，显示欢迎页
      const initialSessions =
        savedSessions.length > 0 ? savedSessions : [createWelcomeSession()];

      setSettings(savedSettings);
      setSessions(initialSessions);
      setActiveSessionId(initialSessions[0].id);
      setIsBooting(false);
    }

    boot().catch((error) => {
      console.error(error);
      Alert.alert("启动失败", "读取本地配置时出错，请重新打开 App。");
    });
  }, []);

  // ---- 聊天记录变化时自动保存 ----
  useEffect(() => {
    if (!isBooting) {
      saveSessions(sessions).catch((error) => console.error(error));
    }
  }, [isBooting, sessions]);

  // ---- 当前激活的会话 ----
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions]
  );

  // ---- 保存设置 ----
  const updateSettings = useCallback(async (nextSettings: AppSettings) => {
    setSettings(nextSettings);
    await saveSettings(nextSettings);
  }, []);

  // ---- 更新单个会话 ----
  const updateSession = useCallback((nextSession: ChatSession) => {
    setSessions((current) =>
      current
        .map((session) => (session.id === nextSession.id ? nextSession : session))
        // 按更新时间排序，最近聊过的放前面
        .sort((left, right) => right.updatedAt - left.updatedAt)
    );
    setActiveSessionId(nextSession.id);
  }, []);

  // ---- 创建新会话 ----
  const createSession = useCallback(() => {
    const nextSession = createEmptySession();
    setSessions((current) => [nextSession, ...current]);
    setActiveSessionId(nextSession.id);
    setActiveTab("chat");
  }, []);

  // ---- 删除某个会话 ----
  const removeSession = useCallback((sessionId: string) => {
    setSessions((current) => {
      const remaining = current.filter((session) => session.id !== sessionId);
      // 至少保留一个会话
      const nextSessions = remaining.length > 0 ? remaining : [createEmptySession()];
      setActiveSessionId(nextSessions[0].id);
      return nextSessions;
    });
  }, []);

  // ---- 清除所有聊天记录 ----
  const clearAllSessions = useCallback(async () => {
    const nextSession = createEmptySession();
    setSessions([nextSession]);
    setActiveSessionId(nextSession.id);
    await saveSessions([nextSession]);
  }, []);

  // ---- 启动中显示加载动画 ----
  if (isBooting || !settings || !activeSession) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.bootContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator color={theme.accent} size="large" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 根据当前主题决定 StatusBar 样式
  const isDark = theme.ink === "#EEF2FA";

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {activeTab === "chat" ? (
          <ChatScreen
            activeSession={activeSession}
            allSessions={sessions}
            settings={settings}
            onCreateSession={createSession}
            onDeleteSession={removeSession}
            onOpenSettings={() => setActiveTab("settings")}
            onSelectSession={setActiveSessionId}
            onUpdateSession={updateSession}
          />
        ) : (
          <SettingsScreen
            settings={settings}
            onBack={() => setActiveTab("chat")}
            onClearAllSessions={clearAllSessions}
            onSaveSettings={updateSettings}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ----------------------------------------------------------
// App — 根组件
// 包裹 ThemeProvider 提供主题上下文
// ----------------------------------------------------------
export default function App() {
  const [initialThemeMode, setInitialThemeMode] = useState<"system" | "lit" | "dim">("system");
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    loadThemeMode()
      .then((mode) => {
        setInitialThemeMode(mode);
      })
      .catch((error) => {
        console.error("读取主题模式失败：", error);
        // 使用默认值 "system" 继续
      })
      .finally(() => {
        setThemeReady(true);
      });
  }, []);

  if (!themeReady) {
    return (
      <SafeAreaProvider>
        <View style={[styles.bootContainer, { backgroundColor: "#F6F7FB" }]}>
          <ActivityIndicator color="#17A589" size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <ThemeProvider initialMode={initialThemeMode}>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
});
