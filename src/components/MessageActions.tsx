// ============================================================
// MessageActions — 消息操作菜单
// ------------------------------------------------------------
// 长按 AI 消息时弹出的小菜单，包含：
//   1. 复制 — 把消息内容复制到剪贴板
//   2. 重新生成 — 用同样的上下文重新请求 AI
//
// 使用 Pressable + 绝对定位浮层实现。
// 点击空白区域关闭菜单。
// ============================================================

import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Copy, RefreshCw } from "lucide-react-native";
import { useAppTheme } from "../contexts/ThemeContext";

type MessageActionsProps = {
  visible: boolean;
  onClose: () => void;
  onCopy: () => void;
  onRegenerate?: () => void;
};

export function MessageActions({
  visible,
  onClose,
  onCopy,
  onRegenerate,
}: MessageActionsProps) {
  const { colors: theme } = useAppTheme();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      {/* 点击灰色背景关闭菜单 */}
      <Pressable onPress={onClose} style={styles.backdrop}>
        <View
          style={[
            styles.menu,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          {/* 复制按钮 */}
          <Pressable
            onPress={() => {
              onCopy();
              onClose();
            }}
            style={({ pressed }) => [
              styles.item,
              { borderBottomColor: theme.border },
              pressed && { backgroundColor: theme.surfaceAlt },
            ]}
          >
            <Copy color={theme.ink} size={18} />
            <Text style={[styles.itemText, { color: theme.ink }]}>复制</Text>
          </Pressable>

          {/* 重新生成按钮 */}
          {onRegenerate && (
            <Pressable
              onPress={() => {
                onRegenerate();
                onClose();
              }}
              style={({ pressed }) => [
                styles.item,
                pressed && { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <RefreshCw color={theme.ink} size={18} />
              <Text style={[styles.itemText, { color: theme.ink }]}>
                重新生成
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
    justifyContent: "center",
  },
  item: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  itemText: {
    fontSize: 16,
    fontWeight: "600",
  },
  menu: {
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 200,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
});
