// ============================================================
// ChatScreen — 聊天主页面
// ------------------------------------------------------------
// 这是用户看到的第一个页面，包含：
//   1. 顶部标题栏（右上角：+ 新建聊天、☰ 菜单按钮）
//   2. 消息列表（FlatList，自动滚到最新消息）
//   3. 底部输入框（ChatComposer）
//
// 侧滑抽屉（☰）包含历史对话列表、API 设置、MCP 设置。
//
// 核心逻辑：sendMessage 负责发送消息、处理流式回复、错误恢复。
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ChevronDown, Menu, PenSquare } from "lucide-react-native";

import { requestAssistantReply } from "../api/chatApi";
import { ChatComposer } from "../components/ChatComposer";
import { Drawer } from "../components/Drawer";
import { MessageBubble } from "../components/MessageBubble";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppSettings, ChatMessage, ChatSession, getActiveProfile } from "../types";
import { createMessage, makeSessionTitle } from "../utils/chat";

type ChatScreenProps = {
  activeSession: ChatSession;
  allSessions: ChatSession[];
  settings: AppSettings;
  activeApiToken: string;
  onSwitchProfile?: (profileId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  onOpenMcpSettings?: () => void;
  onClearAll?: () => void;
  onSelectSession: (sessionId: string) => void;
  onUpdateSession: (session: ChatSession) => void;
};

export function ChatScreen({
  activeSession,
  allSessions,
  settings,
  activeApiToken,
  onSwitchProfile,
  onCreateSession,
  onDeleteSession,
  onOpenSettings,
  onOpenMcpSettings,
  onClearAll,
  onSelectSession,
  onUpdateSession,
}: ChatScreenProps) {
  const { colors: theme } = useAppTheme();
  const abortRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeProfile = getActiveProfile(settings);

  const isDark = theme.ink === "#EEF2FA";
  const headerGradientColors: [string, string] = isDark
    ? ["#1A2235", "#1A2A25"]
    : ["#FFFFFF", "#EDF7F6"];

  // ---- 替换消息列表中的某一条消息 ----
  function replaceMessage(messages: ChatMessage[], nextMessage: ChatMessage) {
    return messages.map((message) =>
      message.id === nextMessage.id ? nextMessage : message
    );
  }

  // ---- 发送消息 ----
  async function sendMessage() {
    const content = draft.trim();
    if (!content || isSending) return;

    const userMessage = createMessage("user", content);
    const assistantMessage = createMessage("assistant", "");
    const nextMessages = [
      ...activeSession.messages,
      userMessage,
      assistantMessage,
    ];
    const controller = new AbortController();
    const nextSession: ChatSession = {
      ...activeSession,
      title:
        activeSession.messages.length === 0
          ? makeSessionTitle(content)
          : activeSession.title,
      updatedAt: Date.now(),
      messages: nextMessages,
    };

    abortRef.current = controller;
    setDraft("");
    setIsSending(true);
    onUpdateSession(nextSession);

    let streamedText = "";

    const requestSettings = {
      baseUrl: activeProfile?.baseUrl ?? "",
      apiToken: activeApiToken,
      model: activeProfile?.model ?? "",
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      stream: settings.stream,
    };

    try {
      const reply = await requestAssistantReply({
        settings: requestSettings,
        messages: nextMessages.filter(
          (message) => message.id !== assistantMessage.id
        ),
        signal: controller.signal,
        onDelta: (delta) => {
          streamedText += delta;
          onUpdateSession({
            ...nextSession,
            updatedAt: Date.now(),
            messages: replaceMessage(nextMessages, {
              ...assistantMessage,
              content: streamedText,
            }),
          });
        },
      });

      onUpdateSession({
        ...nextSession,
        updatedAt: Date.now(),
        messages: replaceMessage(nextMessages, {
          ...assistantMessage,
          content: reply || streamedText || "接口没有返回内容。",
        }),
      });
    } catch (error: any) {
      if (error?.name === "AbortError" || controller.signal.aborted) {
        onUpdateSession({
          ...nextSession,
          updatedAt: Date.now(),
          messages: replaceMessage(nextMessages, {
            ...assistantMessage,
            content: streamedText || "已停止生成。",
          }),
        });
      } else {
        onUpdateSession({
          ...nextSession,
          updatedAt: Date.now(),
          messages: replaceMessage(nextMessages, {
            ...assistantMessage,
            content: error?.message ?? "请求接口失败，请检查设置。",
            isError: true,
          }),
        });
      }
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
  }

  // ---- 复制 ----
  const handleCopy = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("已复制", "消息内容已复制到剪贴板。");
    } catch (error: any) {
      Alert.alert("复制失败", error?.message ?? "无法访问剪贴板，请重试。");
    }
  }, []);

  // ---- 重新生成 ----
  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;
  const activeProfileRef = useRef(activeProfile);
  activeProfileRef.current = activeProfile;
  const activeApiTokenRef = useRef(activeApiToken);
  activeApiTokenRef.current = activeApiToken;

  const handleRegenerate = useCallback(() => {
    const session = activeSessionRef.current;
    if (isSendingRef.current) {
      Alert.alert("请稍后", "正在生成回复中，请等待完成后再重新生成。");
      return;
    }

    const messages = session.messages;
    let lastUserIndex = -1;
    let lastAssistantIndex = -1;

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && lastAssistantIndex === -1) {
        lastAssistantIndex = i;
      }
      if (messages[i].role === "user" && lastAssistantIndex !== -1) {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1 || lastAssistantIndex === -1) {
      Alert.alert("无法重新生成", "没有找到可重新生成的对话。");
      return;
    }

    const trimmedMessages = messages.slice(0, lastAssistantIndex);
    const nextSession: ChatSession = {
      ...session,
      updatedAt: Date.now(),
      messages: trimmedMessages,
    };
    onUpdateSession(nextSession);

    const lastUserContent = messages[lastUserIndex].content;
    setDraft(lastUserContent);
    setTimeout(() => {
      triggerRegenerateSend(lastUserContent);
    }, 100);
  }, [onUpdateSession]);

  async function triggerRegenerateSend(content: string) {
    if (isSendingRef.current) return;

    const session = activeSessionRef.current;
    const profile = activeProfileRef.current;
    const token = activeApiTokenRef.current;

    const userMessage = createMessage("user", content);
    const assistantMessage = createMessage("assistant", "");
    const nextMessages = [...session.messages, userMessage, assistantMessage];
    const controller = new AbortController();
    const nextSession: ChatSession = {
      ...session,
      updatedAt: Date.now(),
      messages: nextMessages,
    };

    abortRef.current = controller;
    setDraft("");
    setIsSending(true);
    onUpdateSession(nextSession);

    let streamedText = "";

    const requestSettings = {
      baseUrl: profile?.baseUrl ?? "",
      apiToken: token,
      model: profile?.model ?? "",
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      stream: settings.stream,
    };

    try {
      const reply = await requestAssistantReply({
        settings: requestSettings,
        messages: nextMessages.filter(
          (message) => message.id !== assistantMessage.id
        ),
        signal: controller.signal,
        onDelta: (delta) => {
          streamedText += delta;
          onUpdateSession({
            ...nextSession,
            updatedAt: Date.now(),
            messages: replaceMessage(nextMessages, {
              ...assistantMessage,
              content: streamedText,
            }),
          });
        },
      });

      onUpdateSession({
        ...nextSession,
        updatedAt: Date.now(),
        messages: replaceMessage(nextMessages, {
          ...assistantMessage,
          content: reply || streamedText || "接口没有返回内容。",
        }),
      });
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        onUpdateSession({
          ...nextSession,
          updatedAt: Date.now(),
          messages: replaceMessage(nextMessages, {
            ...assistantMessage,
            content: error?.message ?? "请求接口失败，请检查设置。",
            isError: true,
          }),
        });
      }
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  }

  // ---- 自动滚到底部 ----
  useEffect(() => {
    if (activeSession.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeSession.messages.length, activeSession.messages[activeSession.messages.length - 1]?.content]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      {/* ---- 侧滑抽屉 ---- */}
      <Drawer
        activeSessionId={activeSession.id}
        onCreateSession={onCreateSession}
        onClose={() => setDrawerOpen(false)}
        onDeleteSession={onDeleteSession}
        onOpenMcpSettings={onOpenMcpSettings}
        onOpenSettings={onOpenSettings}
        onSelectSession={onSelectSession}
        onClearAll={onClearAll}
        sessions={allSessions}
        visible={drawerOpen}
      />

      {/* ---- 顶部标题栏 ---- */}
      <LinearGradient
        colors={headerGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        {/* 左侧：标题 + 当前 API */}
        <View style={styles.titleBlock}>
          <Text style={[styles.kicker, { color: theme.accentDark }]}>
            自定义 API CHAT
          </Text>
          {/* <Text style={[styles.title, { color: theme.ink }]}>
            DeepSeek Custom
          </Text> */}
          <Pressable
            onPress={() => setShowProfileMenu(!showProfileMenu)}
            style={styles.profileSelector}
          >
            <Text style={[styles.subtitle, { color: theme.muted }]}>
              {activeProfile ? `${activeProfile.name} · ${activeProfile.model}` : "未配置 API"}
            </Text>
            {settings.apiProfiles.length > 1 && (
              <ChevronDown color={theme.muted} size={14} style={styles.chevron} />
            )}
          </Pressable>
        </View>

        {/* 右侧：新建对话 + 菜单图标 */}
        <View style={styles.headerIcons}>
          <Pressable
            accessibilityLabel="新建对话"
            onPress={onCreateSession}
            style={styles.iconBtn}
          >
            <PenSquare color={theme.ink} size={20} />
          </Pressable>
          <Pressable
            accessibilityLabel="打开菜单"
            onPress={() => setDrawerOpen(true)}
            style={styles.iconBtn}
          >
            <Menu color={theme.ink} size={22} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* ---- API 配置下拉菜单 ---- */}
      {showProfileMenu && settings.apiProfiles.length > 1 && (
        <View style={[styles.profileMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {settings.apiProfiles.map((profile) => {
            const isActive = profile.id === settings.activeProfileId;
            return (
              <Pressable
                key={profile.id}
                onPress={() => {
                  onSwitchProfile?.(profile.id);
                  setShowProfileMenu(false);
                }}
                style={[
                  styles.profileMenuItem,
                  { borderBottomColor: theme.border },
                  isActive && { backgroundColor: theme.surfaceAlt },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.profileMenuName, { color: theme.ink }]}>
                    {profile.name}
                  </Text>
                  <Text style={[styles.profileMenuDetail, { color: theme.muted }]}>
                    {profile.model}
                  </Text>
                </View>
                {isActive && <Check color={theme.accent} size={16} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ---- 消息列表 ---- */}
      <FlatList
        contentContainerStyle={styles.messageList}
        data={activeSession.messages}
        keyExtractor={(message) => message.id}
        keyboardShouldPersistTaps="handled"
        ref={flatListRef}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>
              开始新的对话
            </Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              你的消息会保存在本机。{"\n"}
              点击左上角 ☰ 查看历史对话和设置。
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            onCopy={handleCopy}
            onRegenerate={
              item.role === "assistant" && !item.isError
                ? handleRegenerate
                : undefined
            }
          />
        )}
      />

      {/* ---- 底部输入区 ---- */}
      <View style={styles.composerShell}>
        <ChatComposer
          disabled={!activeApiToken.trim()}
          isSending={isSending}
          onChangeText={setDraft}
          onSend={sendMessage}
          onStop={stopGenerating}
          value={draft}
        />
        {!activeApiToken.trim() && (
          <Text style={[styles.tokenHint, { color: theme.warning }]}>
            请先在侧滑菜单 → API 设置里填写 API Token
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chevron: { marginLeft: 4 },
  composerShell: { gap: 10, padding: 14, paddingTop: 10 },
  emptyState: {
    alignSelf: "center",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 54,
    maxWidth: 330,
    padding: 20,
  },
  emptyText: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  header: {
    alignItems: "flex-start",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 20,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  iconBtn: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  kicker: { fontSize: 12, fontWeight: "800" },
  messageList: { padding: 14, paddingBottom: 20 },
  profileMenu: {
    borderBottomWidth: 1,
    maxHeight: 200,
  },
  profileMenuDetail: { fontSize: 12, marginTop: 2 },
  profileMenuItem: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  profileMenuName: { fontSize: 14, fontWeight: "700" },
  profileSelector: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: 4,
  },
  screen: { flex: 1 },
  subtitle: { fontSize: 14, marginTop: 4 },
  title: { fontSize: 30, fontWeight: "900", marginTop: 4 },
  titleBlock: { flex: 1, gap: 2 },
  tokenHint: { fontSize: 13, fontWeight: "700", textAlign: "center" },
});
