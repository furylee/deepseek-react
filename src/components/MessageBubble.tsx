// ============================================================
// MessageBubble — 消息气泡组件
// ------------------------------------------------------------
// 在聊天列表中渲染单条消息。
// - 用户消息：右对齐，深色背景
// - AI 消息：左对齐，支持 Markdown 渲染
// - 错误消息：特殊红色背景
//
// 新增功能：
//   - 长按 AI 消息可以复制内容或重新生成
//   - 响应深色/浅色主题
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";

import { ChatMessage } from "../types";
import { useAppTheme } from "../contexts/ThemeContext";
import { spacing } from "../styles/theme";
import { MessageActions } from "./MessageActions";

type MessageBubbleProps = {
  message: ChatMessage;
  /** 长按 AI 消息时的回调，用于展示操作菜单 */
  onCopy?: (text: string) => void;
  onRegenerate?: () => void;
  /** 当助手消息正在流式输出时显示 loading 指示器 */
  isStreaming?: boolean;
};

export function MessageBubble({
  message,
  onCopy,
  onRegenerate,
  isStreaming,
}: MessageBubbleProps) {
  const { colors: theme } = useAppTheme();
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const [showActions, setShowActions] = useState(false);

  // 长按打开操作菜单（仅 AI 消息）
  const handleLongPress = useCallback(() => {
    if (isAssistant && onCopy) {
      setShowActions(true);
    }
  }, [isAssistant, onCopy]);

  const handleCloseActions = useCallback(() => {
    setShowActions(false);
  }, []);

  // 是否显示 loading 指示器：助手消息无内容且正在流式输出
  const showLoading = isAssistant && !message.isError && !message.content && isStreaming;

  return (
    <View>
      <View style={[styles.row, isUser && styles.userRow]}>
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={400}
          style={[
            styles.bubble,
            { backgroundColor: isUser ? theme.userBubble : theme.assistantBubble },
            { borderColor: isUser ? theme.userBubble : theme.border },
            message.isError && { backgroundColor: "#FFF2F0", borderColor: "#FFB4AC" },
          ]}
        >
          {showLoading ? (
            <LoadingDots color={theme.muted} />
          ) : isAssistant && !message.isError ? (
            <Markdown key={message.id} style={makeMarkdownStyles(theme)}>
              {message.content || " "}
            </Markdown>
          ) : (
            <Text
              style={[
                styles.text,
                { color: isUser ? "#FFFFFF" : theme.ink },
                message.isError && { color: theme.coral },
              ]}
            >
              {message.content}
            </Text>
          )}
        </Pressable>
      </View>

      {/* 长按 AI 消息时弹出的操作菜单 */}
      {showActions && onCopy && (
        <MessageActions
          onClose={handleCloseActions}
          onCopy={() => onCopy(message.content)}
          onRegenerate={onRegenerate}
          visible={showActions}
        />
      )}
    </View>
  );
}

// ---- 三个跳动点 loading 指示器 ----

function LoadingDots({ color }: { color: string }) {
  const animValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const animations = animValues.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay((2 - i) * 200),
        ])
      )
    );
    Animated.parallel(animations).start();
    return () => {
      animValues.forEach(a => a.setValue(0));
    };
  }, []);

  return (
    <View style={loadingDotsStyles.row}>
      {animValues.map((anim, i) => {
        const translateY = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        });
        return (
          <Animated.View
            key={i}
            style={[
              loadingDotsStyles.dot,
              { backgroundColor: color, transform: [{ translateY }] },
            ]}
          />
        );
      })}
    </View>
  );
}

const loadingDotsStyles = StyleSheet.create({
  dot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  row: {
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    paddingVertical: 4,
  },
});

// ---- 样式 ----

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: "88%",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    marginBottom: 14,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  userRow: {
    justifyContent: "flex-end",
  },
});

// ---- Markdown 样式（根据主题动态生成） ----

function makeMarkdownStyles(theme: ReturnType<typeof useAppTheme>["colors"]) {
  return {
    body: {
      color: theme.ink,
      fontSize: 16,
      lineHeight: 24,
    },
    code_inline: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 6,
      color: theme.blue,
      paddingHorizontal: 5,
    },
    fence: {
      backgroundColor: "#101828", // 代码块在深色模式下保持深色背景
      borderRadius: 8,
      color: "#F8FAFC",
      padding: 12,
    },
    heading1: {
      color: theme.ink,
      fontSize: 22,
      fontWeight: "800" as const,
    },
    heading2: {
      color: theme.ink,
      fontSize: 20,
      fontWeight: "800" as const,
    },
    link: {
      color: theme.blue,
    },
    paragraph: {
      marginBottom: 6,
      marginTop: 0,
    },
    strong: {
      fontWeight: "800" as const,
    },
  } as const;
}
