// ============================================================
// 设计令牌 — Design Tokens
// ------------------------------------------------------------
// 这个文件定义了整个 App 的颜色、间距、圆角。
// 修改这里的值会影响所有使用了这些变量的组件。
// 如果你想让 App 换一个主色调，修改 accent 即可。
// ============================================================

// ----------------------------------------------------------
// 浅色主题颜色 — 适合白天使用，背景偏白
// ----------------------------------------------------------
export const litColors = {
  /** 页面背景色（浅灰） */
  background: "#F6F7FB",
  /** 卡片/输入框背景色（纯白） */
  surface: "#FFFFFF",
  /** 次要表面色（比 surface 深一点） */
  surfaceAlt: "#EEF3F8",
  /** 主要文字颜色（深蓝黑） */
  ink: "#172033",
  /** 次要文字颜色（中灰） */
  muted: "#667085",
  /** 边框颜色 */
  border: "#DEE5EF",
  /** 强调色（青绿色，用于按钮、开关等） */
  accent: "#17A589",
  /** 深色变体强调色（用于顶部标签） */
  accentDark: "#0E7769",
  /** 蓝色（用于链接、渐变） */
  blue: "#3A6FF7",
  /** 珊瑚红（用于删除、停止等危险操作） */
  coral: "#F46D5E",
  /** 警告色（用于提示用户填写 API Token） */
  warning: "#B7791F",
  /** 用户消息气泡背景色 */
  userBubble: "#17324D",
  /** AI 助手消息气泡背景色 */
  assistantBubble: "#FFFFFF",
  /** 阴影颜色 */
  shadow: "rgba(23, 32, 51, 0.12)",
} as const;

// ----------------------------------------------------------
// 深色主题颜色 — 适合夜间使用，背景偏深
// ----------------------------------------------------------
export const dimColors = {
  background: "#0F1420",
  surface: "#1A2235",
  surfaceAlt: "#242E42",
  ink: "#EEF2FA",
  muted: "#8896B4",
  border: "#2A3550",
  accent: "#1BC4A8",
  accentDark: "#0E9E87",
  blue: "#5B8AF7",
  coral: "#F4726B",
  warning: "#F0B85E",
  userBubble: "#2E4A6E",
  assistantBubble: "#1E2A3E",
  shadow: "rgba(0, 0, 0, 0.35)",
} as const;

/** 主题颜色类型 — 两种主题共享同样的 key（值都是 string） */
export type ThemeColors = {
  readonly background: string;
  readonly surface: string;
  readonly surfaceAlt: string;
  readonly ink: string;
  readonly muted: string;
  readonly border: string;
  readonly accent: string;
  readonly accentDark: string;
  readonly blue: string;
  readonly coral: string;
  readonly warning: string;
  readonly userBubble: string;
  readonly assistantBubble: string;
  readonly shadow: string;
};

/**
 * 当前主题颜色（默认指向浅色）
 * 组件可以直接 import { colors } 使用。
 * 如果需要在组件中获取主题感知的颜色，推荐使用 useAppTheme()。
 */
export const colors: ThemeColors = { ...litColors };

export const spacing = {
  /** 极小间距 — 6px */
  xs: 6,
  /** 小间距 — 10px */
  sm: 10,
  /** 中等间距 — 14px */
  md: 14,
  /** 大间距 — 20px */
  lg: 20,
  /** 超大间距 — 28px */
  xl: 28,
} as const;

export const radius = {
  /** 小圆角 — 8px，用于按钮、小型卡片 */
  sm: 8,
  /** 中圆角 — 14px，用于气泡、输入框 */
  md: 14,
  /** 大圆角 — 20px，用于大卡片 */
  lg: 20,
} as const;
