// ============================================================
// ChatScreen — 聊天主页面
// ------------------------------------------------------------
// 这是用户看到的第一个页面，包含：
//   1. 顶部标题栏（带新聊天和设置按钮）
//   2. 历史会话横向滚动条（可切换、删除）
//   3. 消息列表（FlatList，自动滚到最新消息）
//   4. 底部输入框（ChatComposer）
//
// 核心逻辑：sendMessage 负责发送消息、处理流式回复、错误恢复。
//
// 新增功能：
//   - 支持复制消息（通过 Clipboard）
//   - 支持重新生成最后一条 AI 回复
//   - 自动滚动到最新消息
//   - 深色/浅色主题自适应
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { MessageSquarePlus, Settings, Trash2 } from "lucide-react-native";

import { requestAssistantReply } from "../api/chatApi";
import { ChatComposer } from "../components/ChatComposer";
import { IconButton } from "../components/IconButton";
import { MessageBubble } from "../components/MessageBubble";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppSettings, ChatMessage, ChatSession } from "../types";
import { createMessage, formatSessionTime, makeSessionTitle } from "../utils/chat";

type ChatScreenProps = {
  activeSession: ChatSession;
  allSessions: ChatSession[];
  settings: AppSettings;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenSettings: () => void;
  onSelectSession: (sessionId: string) => void;
  onUpdateSession: (session: ChatSession) => void;
};

export function ChatScreen({
  activeSession,
  allSessions,
  settings,
  onCreateSession,
  onDeleteSession,
  onOpenSettings,
  onSelectSession,
  onUpdateSession,
}: ChatScreenProps) {
  const { colors: theme } = useAppTheme();
  const abortRef = useRef<AbortController | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 标题栏渐变：浅色模式用白到绿，深色模式用深色
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
      // 第一条消息自动设为标题
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

    try {
      const reply = await requestAssistantReply({
        settings,
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
        // 用户主动点击停止
        onUpdateSession({
          ...nextSession,
          updatedAt: Date.now(),
          messages: replaceMessage(nextMessages, {
            ...assistantMessage,
            content: streamedText || "已停止生成。",
          }),
        });
      } else {
        // 网络错误或其他异常
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

  // ---- 停止生成 ----
  function stopGenerating() {
    abortRef.current?.abort();
  }

  // ---- 删除会话确认 ----
  function confirmDeleteSession(sessionId: string) {
    Alert.alert("删除聊天", "确定删除这条聊天记录吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => onDeleteSession(sessionId),
      },
    ]);
  }

  // ---- 复制消息到剪贴板 ----
  const handleCopy = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("已复制", "消息内容已复制到剪贴板。");
    } catch (error: any) {
      // Clipboard 可能在某些安全策略下失败，不影响 App 继续运行
      Alert.alert("复制失败", error?.message ?? "无法访问剪贴板，请重试。");
    }
  }, []);

  // ---- 重新生成最后一条 AI 回复 ----
  // 使用 ref 避免闭包过时导致的竞态条件
  const activeSessionRef = useRef(activeSession);
  activeSessionRef.current = activeSession;
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;

  const handleRegenerate = useCallback(() => {
    const session = activeSessionRef.current;
    if (isSendingRef.current) {
      Alert.alert("请稍后", "正在生成回复中，请等待完成后再重新生成。");
      return;
    }

    const messages = session.messages;
    // 找到最后一条用户消息和 AI 消息的位置
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

    // 移除最后一条 AI 消息，然后自动重新发送
    const trimmedMessages = messages.slice(0, lastAssistantIndex);
    const nextSession: ChatSession = {
      ...session,
      updatedAt: Date.now(),
      messages: trimmedMessages,
    };
    onUpdateSession(nextSession);

    const lastUserContent = messages[lastUserIndex].content;
    // 直接把用户消息内容设为草稿，由 sendMessage 统一处理
    setDraft(lastUserContent);
    // 等状态更新后触发发送
    setTimeout(() => {
      // 直接调用内部发送函数，避免重复拼接消息
      triggerRegenerateSend(lastUserContent);
    }, 100);
  }, [onUpdateSession]);

  // ---- 内部重新发送函数（避免与 sendMessage 逻辑重复） ----
  async function triggerRegenerateSend(content: string) {
    if (isSendingRef.current) return;

    const session = activeSessionRef.current;
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

    try {
      const reply = await requestAssistantReply({
        settings,
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

  // ---- 新消息到来时自动滚到底部 ----
  useEffect(() => {
    if (activeSession.messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [activeSession.messages.length, activeSession.messages[activeSession.messages.length - 1]?.content]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      {/* ---- 顶部标题栏 ---- */}
      <LinearGradient
        colors={headerGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        <View style={styles.titleBlock}>
          <Text style={[styles.kicker, { color: theme.accentDark }]}>
            CUSTOM API CHAT
          </Text>
          <Text style={[styles.title, { color: theme.ink }]}>
            DeepSeek Custom
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {settings.model} · 本地保存聊天
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon={MessageSquarePlus}
            label="新聊天"
            onPress={onCreateSession}
          />
          <IconButton icon={Settings} label="设置" onPress={onOpenSettings} />
        </View>
      </LinearGradient>

      {/* ---- 历史会话横滑栏 ---- */}
      <View
        style={[
          styles.sessionRail,
          { borderBottomColor: theme.border },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {allSessions.map((session) => {
            const isActive = session.id === activeSession.id;
            return (
              <Pressable
                key={session.id}
                onPress={() => onSelectSession(session.id)}
                style={[
                  styles.sessionChip,
                  {
                    backgroundColor: isActive ? theme.ink : theme.surface,
                    borderColor: isActive ? theme.ink : theme.border,
                  },
                ]}
              >
                <View style={styles.sessionTextWrap}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.sessionTitle,
                      { color: isActive ? "#FFFFFF" : theme.ink },
                    ]}
                  >
                    {session.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.sessionTime,
                      {
                        color: isActive
                          ? "#D7E2F0"
                          : theme.muted,
                      },
                    ]}
                  >
                    {formatSessionTime(session.updatedAt)}
                  </Text>
                </View>
                {isActive && (
                  <Pressable
                    accessibilityLabel="删除当前聊天"
                    onPress={() => confirmDeleteSession(session.id)}
                    style={styles.smallIcon}
                  >
                    <Trash2 color="#FFFFFF" size={14} />
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

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
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.ink }]}>
              开始新的对话
            </Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              你的消息会保存在本机。{"\n"}
              更换 API Token 或清空记录，请进入设置。
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
          disabled={!settings.apiToken.trim()}
          isSending={isSending}
          onChangeText={setDraft}
          onSend={sendMessage}
          onStop={stopGenerating}
          value={draft}
        />
        {!settings.apiToken.trim() && (
          <Text style={[styles.tokenHint, { color: theme.warning }]}>
            请先在设置里填写 API Token
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  composerShell: {
    gap: 10,
    padding: 14,
    paddingTop: 10,
  },
  emptyState: {
    alignSelf: "center",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 54,
    maxWidth: 330,
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 20,
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
  },
  messageList: {
    padding: 14,
    paddingBottom: 20,
  },
  screen: {
    flex: 1,
  },
  sessionChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginRight: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    width: 160,
  },
  sessionRail: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sessionTextWrap: {
    flex: 1,
  },
  sessionTime: {
    fontSize: 11,
    marginTop: 3,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  smallIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 7,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  titleBlock: {
    gap: 2,
  },
  tokenHint: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
