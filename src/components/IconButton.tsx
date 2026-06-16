// ============================================================
// IconButton — 图标按钮组件
// ------------------------------------------------------------
// 一个带图标的通用按钮，支持三种色调：
//   - plain：普通灰白按钮（默认）
//   - accent：绿底白字，用于主要操作
//   - danger：红底白字，用于危险操作
//
// 使用 lucide-react-native 图标库。
// 支持按下缩放动画和深色/浅色主题。
// ============================================================

import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import { LucideIcon } from "lucide-react-native";

import { useAppTheme } from "../contexts/ThemeContext";

type IconButtonProps = {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  /** 按钮色调：plain（普通）| accent（强调绿）| danger（危险红） */
  tone?: "plain" | "accent" | "danger";
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon: Icon,
  label,
  onPress,
  tone = "plain",
  style,
}: IconButtonProps) {
  const { colors: theme } = useAppTheme();
  const isAccent = tone === "accent";
  const isDanger = tone === "danger";

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isAccent ? theme.accent : isDanger ? theme.coral : theme.surface,
          borderColor: isAccent ? theme.accent : isDanger ? theme.coral : theme.border,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon
        color={isAccent || isDanger ? "#FFFFFF" : theme.ink}
        size={18}
        strokeWidth={2.2}
      />
      <Text
        style={[
          styles.label,
          { color: isAccent || isDanger ? "#FFFFFF" : theme.ink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
