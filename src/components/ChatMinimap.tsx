// ============================================================
// ChatMinimap — 聊天导航锚点
// ------------------------------------------------------------
// 在聊天消息列表右侧显示垂直锚点条，每个用户提问对应一个
// 锚点。点击锚点跳转到对应的提问位置。
//
// 特性：
//   - 只对 user 角色的消息生成锚点
//   - 高亮当前可见区域的用户消息对应的锚点
//   - 半透明背板 + 圆点设计，不遮挡消息
//   - pointerEvents="box-none" 确保滑动不受影响
//   - 支持深色/浅色主题
// ============================================================

import { StyleSheet, View, Pressable } from "react-native";

import type { ChatMessage } from "../types";
import { useAppTheme } from "../contexts/ThemeContext";

type ChatMinimapProps = {
  /** 全部消息列表 */
  messages: ChatMessage[];
  /** 当前可见的用户消息在 messages 数组中的索引 */
  currentVisibleIndex?: number;
  /** 点击锚点时回调，传入目标消息在 messages 数组中的索引 */
  onAnchorPress: (msgIndex: number) => void;
};

export function ChatMinimap({
  messages,
  currentVisibleIndex,
  onAnchorPress,
}: ChatMinimapProps) {
  const { colors: theme } = useAppTheme();

  // 筛选所有用户消息，保留其在原数组中的索引
  const userQuestionEntries = messages.reduce<
    { msgIndex: number; questionIndex: number }[]
  >((acc, msg, idx) => {
    if (msg.role === "user") {
      acc.push({ msgIndex: idx, questionIndex: acc.length });
    }
    return acc;
  }, []);

  // 没有用户问题时隐藏 minimap
  const totalQ = userQuestionEntries.length;
  if (totalQ === 0) return null;

  // 找出当前激活的锚点：与 currentVisibleIndex 最接近的用户消息
  let activeQIndex = 0;
  if (currentVisibleIndex !== undefined && totalQ > 0) {
    let bestDistance = Infinity;
    for (let i = 0; i < totalQ; i++) {
      const distance = Math.abs(
        userQuestionEntries[i].msgIndex - currentVisibleIndex
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        activeQIndex = i;
      }
    }
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* 半透明背板 */}
      <View
        style={[
          styles.backdrop,
          { backgroundColor: withAlpha(theme.surface, 0.6), borderColor: theme.border },
        ]}
      >
        {/* 锚点区域 */}
        <View style={styles.dotsArea}>
          {userQuestionEntries.map(({ msgIndex, questionIndex }) => {
            const isActive = questionIndex === activeQIndex;
            // 按比例计算位置 — 单个消息时居中
            const ratio =
              totalQ === 1
                ? 0.5
                : questionIndex / (totalQ - 1);
            return (
              <Pressable
                key={msgIndex}
                hitSlop={10}
                onPress={() => onAnchorPress(msgIndex)}
                style={[
                  styles.dotWrapper,
                  {
                    top: ratio * (MINIMAP_CONTENT_HEIGHT - 8),
                  },
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: isActive ? theme.accent : theme.muted,
                      opacity: isActive ? 1 : 0.4,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ----------------------------------------------------------
// 辅助函数：为 hex 颜色添加 alpha
// ----------------------------------------------------------

function withAlpha(hex: string, alpha: number): string {
  // 去掉 # 前缀
  const raw = hex.replace("#", "");
  const r = parseInt(raw.substring(0, 2), 16);
  const g = parseInt(raw.substring(2, 4), 16);
  const b = parseInt(raw.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ----------------------------------------------------------
// 常量
// ----------------------------------------------------------

/** 锚点区域高度（与 minimap 内容区等高） */
const MINIMAP_CONTENT_HEIGHT = 300;

// ----------------------------------------------------------
// 样式
// ----------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingVertical: 10,
    width: 28,
  },
  container: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    pointerEvents: "box-none",
    position: "absolute",
    right: 4,
    top: 0,
    width: 36,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  dotWrapper: {
    alignItems: "center",
    height: 8,
    justifyContent: "center",
    position: "absolute",
    width: 8,
  },
  dotsArea: {
    height: MINIMAP_CONTENT_HEIGHT,
    position: "relative",
    width: 8,
  },
});
