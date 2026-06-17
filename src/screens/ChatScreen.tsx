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
  Keyboard,
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
import { ChatMinimap } from "../components/ChatMinimap";
import { Drawer } from "../components/Drawer";
import { MessageBubble } from "../components/MessageBubble";
import { useToast } from "../components/Toast";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppSettings, ChatMessage, ChatSession, getActiveProfile } from "../types";
import { createMessage, makeSessionTitle } from "../utils/chat";

type ChatScreenProps = {
  activeSession: ChatSession;
  allSessions: ChatSession[];
  settings: AppSettings;
  activeApiToken: string;
  onSwitchProfile?: (profileId: string) => void;
  onCreateSession: (currentSession: ChatSession) => void;
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
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [visibleUserMsgIndex, setVisibleUserMsgIndex] = useState<number | undefined>();
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 20 });
  /** 用户是否手动向上滚动离开了底部（流式输出期间不抢焦点） */
  const userScrolledUp = useRef(false);

  const activeProfile = getActiveProfile(settings);

  const isDark = theme.ink === "#EEF2FA";
  const headerGradientColors: [string, string] = isDark
    ? ["#1A2235", "#1A2A25"]
    : ["#FFFFFF", "#EDF7F6"];

  // ---- 手动管理键盘高度，避免 KeyboardAvoidingView 的空白残留问题 ----
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // iOS 用 keyboardWillShow/Hide 与系统动画同步
    // Android 只有 keyboardDidShow/Hide
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

    userScrolledUp.current = false; // 用户主动发送，强制跟随底部

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

    userScrolledUp.current = false; // 重新生成也强制跟随底部

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

  // ---- minimap 锚点点击：滚动到指定消息 ----
  function handleMinimapAnchorPress(msgIndex: number) {
    userScrolledUp.current = false;
    flatListRef.current?.scrollToIndex({
      index: msgIndex,
      animated: true,
      viewPosition: 0.1,
    });
  }

  // ---- 检测用户手动上滑 ----
  const handleScroll = useCallback(
    ({ nativeEvent }: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { y } = nativeEvent.contentOffset;
      const bottomOffset =
        nativeEvent.contentSize.height -
        nativeEvent.layoutMeasurement.height -
        y;
      // 距离底部超过 60px 视为用户主动上滑离开底部
      userScrolledUp.current = bottomOffset > 60;
    },
    []
  );

  // ---- 自动滚到底部（仅当用户未手动上滑时）----
  useEffect(() => {
    if (activeSession.messages.length > 0 && !userScrolledUp.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeSession.messages.length, activeSession.messages[activeSession.messages.length - 1]?.content]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* ---- 侧滑抽屉 ---- */}
      <Drawer
        activeSessionId={activeSession.id}
        activeSession={activeSession}
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
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={headerGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { borderBottomColor: theme.border }]}
        >
          {/* 左侧：标题 + 快速切换模型按钮 */}
          <View style={styles.titleBlock}>
            <Text style={[styles.kicker, { color: theme.accentDark }]}>
              自定义 API CHAT
            </Text>
            <Pressable
              onPress={() => setShowProfileMenu(!showProfileMenu)}
              style={styles.profileSelector}
            >
              <Text
                style={[styles.modelBtn, { color: theme.ink }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {activeProfile ? activeProfile.model : "未配置"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                <ChevronDown
                  color={theme.accent}
                  size={14}
                  style={showProfileMenu ? { transform: [{ rotate: "180deg" }] } : {}}
                />
                <Text
                  style={[styles.profileHint, { color: theme.muted }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {activeProfile ? activeProfile.name : "请先配置 API"}
                </Text>
              </View>
            </Pressable>

                {/* ---- API 配置下拉菜单（浮层） ---- */}
                {showProfileMenu && settings.apiProfiles.filter(p => p.enabled).length > 0 && (
                  <View style={[styles.profileMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {settings.apiProfiles.filter(p => p.enabled).map((profile) => {
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
                          <View style={styles.profileMenuItemText}>
                            <Text
                              style={[styles.profileMenuName, { color: theme.ink }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {profile.name}
                            </Text>
                            <Text
                              style={[styles.profileMenuDetail, { color: theme.muted }]}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {profile.model}
                            </Text>
                          </View>
                          {isActive && <Check color={theme.accent} size={16} />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>

          {/* 右侧：新建对话 + 菜单图标 */}
          <View style={styles.headerIcons}>
            <Pressable
              accessibilityLabel="新建对话"
              onPress={() => {
                onCreateSession(activeSession);
                toast.show({ message: "已创建新对话" });
              }}
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
      </View>

      {/* ---- 消息列表（含 minimap 锚点） ---- */}
      <View style={{ flex: 1,flexShrink: 0 }}>
        <FlatList
          contentContainerStyle={[
            styles.messageList,
            { paddingBottom: keyboardHeight > 0 ? keyboardHeight : styles.messageList.paddingBottom },
          ]}
          data={activeSession.messages}
          keyExtractor={(message) => message.id}
          keyboardShouldPersistTaps="handled"
          ref={flatListRef}
          style={{ flex: 1 }}
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
          onScroll={handleScroll}
          onScrollToIndexFailed={(info) => {
            // fallback：用平均高度估算偏移量
            const offset = info.index * info.averageItemLength;
            flatListRef.current?.scrollToOffset({
              offset,
              animated: true,
            });
          }}
          onViewableItemsChanged={({ viewableItems }) => {
            const userItem = viewableItems.find(
              (item) => item.item.role === "user"
            );
            if (userItem) {
              setVisibleUserMsgIndex(userItem.index ?? undefined);
            }
          }}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onCopy={handleCopy}
              onRegenerate={
                item.role === "assistant" && !item.isError
                  ? handleRegenerate
                  : undefined
              }
              isStreaming={
                isSending &&
                item.role === "assistant" &&
                item.id === activeSession.messages[activeSession.messages.length - 1]?.id
              }
            />
          )}
          viewabilityConfig={viewabilityConfigRef.current}
        />
        <ChatMinimap
          messages={activeSession.messages}
          currentVisibleIndex={visibleUserMsgIndex}
          onAnchorPress={handleMinimapAnchorPress}
        />
      </View>

      {/* ---- 底部输入区 ---- */}
      <View style={[styles.composerShell, { paddingBottom: (keyboardHeight > 0 ? keyboardHeight + 10 : 14) }]}>
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
    </View>
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
  headerContainer: { position: "relative", zIndex: 10 },
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
  kicker: { fontSize: 12, fontWeight: "800", marginRight: 4 },
  messageList: { padding: 14, paddingBottom: 20 },
  profileMenu: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    left: 0,
    maxHeight: 220,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    top: "100%",
    zIndex: 20,
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
  profileMenuItemText: { flex: 1, minWidth: 0 },
  profileMenuName: { fontSize: 14, fontWeight: "700" },
  profileSelector: {
    marginTop: 4,
  },
  screen: { flex: 1 },
  subtitle: { fontSize: 14, marginTop: 4 },
  modelBtn: { fontSize: 18, fontWeight: "900" },
  profileHint: { fontSize: 12, marginTop: 2 },
  title: { fontSize: 30, fontWeight: "900", marginTop: 4 },
  titleBlock: { flex: 1, gap: 2, position: "relative" },
  tokenHint: { fontSize: 13, fontWeight: "700", textAlign: "center" },
});
