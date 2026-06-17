// ============================================================
// App.tsx — 应用根组件
// ------------------------------------------------------------
// 这是整个 App 的入口文件。
// 它负责：
//   1. 启动时从本地存储加载设置和聊天记录
//   2. 管理聊天页 / 设置页之间的切换
//   3. 提供全局主题上下文
//   4. 管理 Token map（每个 API 配置组独立存储 Token）
//
// 如果你要添加新的全局状态，通常在这里管理，然后通过 props 下传。
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ChatScreen } from "./src/screens/ChatScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { McpSettingsScreen } from "./src/screens/McpSettingsScreen";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { ThemeProvider, useAppTheme } from "./src/contexts/ThemeContext";
import { createEmptySession, createWelcomeSession } from "./src/utils/chat";
import { loadSessions, saveSessions } from "./src/storage/chatStorage";
import { loadSettings, saveSettings, getTokenForProfile } from "./src/storage/settingsStorage";
import { AppSettings, ChatSession } from "./src/types";
import { loadThemeMode } from "./src/storage/themeStorage";

/** Token map 类型：{ [profileId]: apiToken } */
type TokenMap = Record<string, string>;

// ----------------------------------------------------------
// AppContent — 在 ThemeProvider 内部渲染实际 UI
// 这样 useAppTheme() 才能正常工作
// ----------------------------------------------------------
function AppContent() {
  const { colors: theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<"chat" | "settings" | "mcp">("chat");
  const [isBooting, setIsBooting] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tokens, setTokens] = useState<TokenMap>({});
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");

  // ---- 启动：加载本地数据 ----
  useEffect(() => {
    async function boot() {
      const [{ settings: savedSettings, tokens: savedTokens }, savedSessions] = await Promise.all([
        loadSettings(),
        loadSessions(),
      ]);

      // 如果没有聊天记录，显示欢迎页
      const initialSessions =
        savedSessions.length > 0 ? savedSessions : [createWelcomeSession()];

      setSettings(savedSettings);
      setTokens(savedTokens);
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

  // ---- 获取当前激活 profile 的 Token ----
  const activeApiToken = useMemo(() => {
    if (!settings) return "";
    return getTokenForProfile(tokens, settings.activeProfileId);
  }, [settings, tokens]);

  // ---- 保存设置 + Token ----
  const updateSettings = useCallback(async (nextSettings: AppSettings, nextTokens?: TokenMap) => {
    const mergedTokens = nextTokens ?? tokens;
    setSettings(nextSettings);
    setTokens(mergedTokens);
    await saveSettings(nextSettings, mergedTokens);
  }, [tokens]);

  // ---- 更新单个会话 ----
  const updateSession = useCallback((nextSession: ChatSession) => {
    setSessions((current) =>
      current
        .map((session) => (session.id === nextSession.id ? nextSession : session))
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
            activeApiToken={activeApiToken}
            onSwitchProfile={(profileId) => {
              setSettings((s) => s ? { ...s, activeProfileId: profileId } : s);
              saveSettings(
                { ...settings, activeProfileId: profileId },
                tokens
              ).catch(console.error);
            }}
            onCreateSession={createSession}
            onDeleteSession={removeSession}
            onOpenSettings={() => setActiveTab("settings")}
            onOpenMcpSettings={() => setActiveTab("mcp")}
            onSelectSession={setActiveSessionId}
            onUpdateSession={updateSession}
          />
        ) : activeTab === "settings" ? (
          <SettingsScreen
            settings={settings}
            tokens={tokens}
            onBack={() => setActiveTab("chat")}
            onClearAllSessions={clearAllSessions}
            onSaveSettings={updateSettings}
          />
        ) : (
          <McpSettingsScreen
            settings={settings}
            onBack={() => setActiveTab("chat")}
            onSaveSettings={(next) => {
              setSettings(next);
              saveSettings(next, tokens).catch(console.error);
            }}
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
