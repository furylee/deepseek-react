// ============================================================
// Drawer — 侧滑抽屉组件
// ------------------------------------------------------------
// 从屏幕左侧滑入的导航面板，包含：
//   1. 新建对话
//   2. 历史对话列表（可点击切换、左滑删除）
//   3. API 设置（跳转设置页）
//   4. MCP 设置（预留）
//
// 实现方式：纯 React Native Animated API，不额外引入依赖。
// 通过 translateX 动画实现滑入/滑出，遮罩层点击关闭。
// ============================================================

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  MessageSquarePlus,
  MessageSquare,
  Settings,
  Cpu,
  Trash2,
  X,
} from "lucide-react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { ChatSession } from "../types";
import { formatSessionTime } from "../utils/chat";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.78;

type DrawerProps = {
  visible: boolean;
  onClose: () => void;
  /** 所有聊天会话 */
  sessions: ChatSession[];
  /** 当前激活的会话 ID */
  activeSessionId: string;
  /** 切换会话 */
  onSelectSession: (sessionId: string) => void;
  /** 删除会话 */
  onDeleteSession: (sessionId: string) => void;
  /** 新建对话 */
  onCreateSession: () => void;
  /** 打开 API 设置 */
  onOpenSettings: () => void;
  /** 打开 MCP 设置 */
  onOpenMcpSettings?: () => void;
  /** 清空所有聊天记录 */
  onClearAll?: () => void;
};

export function Drawer({
  visible,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onCreateSession,
  onOpenSettings,
  onOpenMcpSettings,
  onClearAll,
}: DrawerProps) {
  const { colors: theme } = useAppTheme();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateX]);

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.container}>
        {/* 遮罩层 */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* 抽屉面板 */}
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: theme.surface,
              borderRightColor: theme.border,
              transform: [{ translateX }],
              width: DRAWER_WIDTH,
            },
          ]}
        >
          {/* 顶部：用户头像区 + 关闭 */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View>
              <Text style={[styles.appName, { color: theme.ink }]}>
                自定义 API 聊天
              </Text>
              <Text style={[styles.appDesc, { color: theme.muted }]}>
                自定义 API · 本地存储
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceAlt }]}
            >
              <X color={theme.ink} size={18} />
            </Pressable>
          </View>

          {/* 菜单项 */}
          <View style={[styles.menuSection, { borderBottomColor: theme.border }]}>
            {/* 新建对话 */}
            <Pressable
              onPress={() => {
                onCreateSession();
                onClose();
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <MessageSquarePlus color={theme.accent} size={20} />
              <Text style={[styles.menuText, { color: theme.ink }]}>
                新建对话
              </Text>
            </Pressable>

            {/* API 设置 */}
            <Pressable
              onPress={() => {
                onOpenSettings();
                onClose();
              }}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <Settings color={theme.muted} size={20} />
              <Text style={[styles.menuText, { color: theme.ink }]}>
                API 设置
              </Text>
            </Pressable>

            {/* MCP 设置 */}
            {onOpenMcpSettings && (
              <Pressable
                onPress={() => {
                  onOpenMcpSettings();
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: theme.surfaceAlt },
                ]}
              >
                <Cpu color={theme.muted} size={20} />
                <Text style={[styles.menuText, { color: theme.ink }]}>
                  MCP 设置
                </Text>
              </Pressable>
            )}
          </View>

          {/* 历史对话列表 */}
          <View style={[styles.historyHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.historyTitle, { color: theme.muted }]}>
              对话历史
            </Text>
          </View>
          <ScrollView
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
          >
            {sessions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.muted }]}>
                暂无对话记录
              </Text>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <Pressable
                    key={session.id}
                    onPress={() => {
                      onSelectSession(session.id);
                      onClose();
                    }}
                    style={({ pressed }) => [
                      styles.historyItem,
                      {
                        backgroundColor: isActive
                          ? theme.surfaceAlt
                          : "transparent",
                      },
                      pressed && {
                        backgroundColor: theme.surfaceAlt,
                      },
                    ]}
                  >
                    <View style={styles.historyInfo}>
                      <View style={styles.historyTitleRow}>
                        <MessageSquare
                          color={isActive ? theme.accent : theme.muted}
                          size={14}
                        />
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.historyItemTitle,
                            {
                              color: isActive ? theme.ink : theme.ink,
                              fontWeight: (isActive ? "700" : "500") as any,
                            },
                          ]}
                        >
                          {session.title}
                        </Text>
                      </View>
                      <Text
                        style={[styles.historyTime, { color: theme.muted }]}
                      >
                        {formatSessionTime(session.updatedAt)}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => onDeleteSession(session.id)}
                      style={styles.deleteBtn}
                    >
                      <Trash2 color={theme.muted} size={14} />
                    </Pressable>
                  </Pressable>
                );
              })
            )}
          </ScrollView>

          {/* 底部提示 + 清空聊天按钮 */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.muted }]}>
              {sessions.length} 个对话 · 本地存储
            </Text>
            {sessions.length > 0 && (
              <Pressable
                onPress={onClearAll}
                style={({ pressed }) => [
                  styles.clearBtn,
                  { borderColor: theme.coral },
                  pressed && { backgroundColor: theme.coral + "18" },
                ]}
              >
                <Trash2 color={theme.coral} size={12} />
                <Text style={[styles.clearBtnText, { color: theme.coral }]}>
                  清空所有记录
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  appDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  appName: {
    fontSize: 20,
    fontWeight: "900",
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
  },
  clearBtn: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  closeBtn: {
    alignItems: "center",
    borderRadius: 20,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },
  deleteBtn: {
    padding: 6,
  },
  drawer: {
    borderRightWidth: 1,
    flex: 1,
    left: 0,
    maxWidth: DRAWER_WIDTH,
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  emptyText: {
    fontSize: 13,
    padding: 20,
    textAlign: "center",
  },
  footer: {
    borderTopWidth: 1,
    padding: 14,
  },
  footerText: {
    fontSize: 11,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
    paddingTop: 50,
  },
  historyHeader: {
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  historyItemTitle: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  historyList: {
    flex: 1,
  },
  historyTime: {
    fontSize: 11,
    marginLeft: 22,
    marginTop: 2,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  historyTitleRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  menuItem: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuSection: {
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
