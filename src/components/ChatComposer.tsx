// ============================================================
// ChatComposer — 消息输入框组件
// ------------------------------------------------------------
// 聊天页底部的输入区域，包含：
//   - 多行文本输入框，支持自动扩展（最高 130px）
//   - 发送/停止按钮（通过渐变背景区分状态）
//     - 蓝色渐变 = 可发送
//     - 红色渐变 = 正在生成（点击停止）
//     - 半透明 = 未填写 API Token，不可发送
//
// 支持深色/浅色主题自适应。
// ============================================================

import { SendHorizontal, Square } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { useAppTheme } from "../contexts/ThemeContext";

type ChatComposerProps = {
  /** 是否禁用输入（通常在 API Token 为空时） */
  disabled: boolean;
  /** 是否正在等待 AI 回复 */
  isSending: boolean;
  /** 输入框当前文字 */
  value: string;
  /** 文字变化回调 */
  onChangeText: (text: string) => void;
  /** 点击发送 */
  onSend: () => void;
  /** 点击停止生成 */
  onStop: () => void;
};

export function ChatComposer({
  disabled,
  isSending,
  value,
  onChangeText,
  onSend,
  onStop,
}: ChatComposerProps) {
  const { colors: theme } = useAppTheme();
  const canSend = value.trim().length > 0 && !disabled;

  // 发送/停止按钮的渐变配色
  const sendGradientColors: [string, string] = isSending
    ? [theme.coral, "#D94B3D"]
    : [theme.accent, theme.blue];

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}
    >
      <TextInput
        multiline
        onChangeText={onChangeText}
        placeholder="输入消息，支持 Markdown..."
        placeholderTextColor={theme.muted}
        style={[styles.input, { color: theme.ink }]}
        value={value}
      />
      <Pressable
        accessibilityLabel={isSending ? "停止生成" : "发送消息"}
        disabled={!isSending && !canSend}
        onPress={isSending ? onStop : onSend}
        style={({ pressed }) => [
          styles.sendButton,
          (!isSending && !canSend) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <LinearGradient
          colors={sendGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sendGradient}
        >
          {isSending ? (
            <Square color="#FFFFFF" fill="#FFFFFF" size={18} />
          ) : (
            <SendHorizontal color="#FFFFFF" size={20} />
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.45,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 130,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  sendButton: {
    alignSelf: "flex-end",
    borderRadius: 8,
    marginBottom: 8,
    marginRight: 8,
    marginTop: 8,
  },
  sendGradient: {
    alignItems: "center",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  wrap: {
    alignItems: "flex-end",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
});
