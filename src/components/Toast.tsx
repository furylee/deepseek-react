// ============================================================
// Toast — 自定义顶部弹窗提示组件
// ------------------------------------------------------------
// 不依赖第三方库，纯 React Native + Animated API 实现。
// 从顶部滑入，短暂停留后自动消失，替换掉 react-native-simple-toast。
// ============================================================

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableWithoutFeedback } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";

// ---- 类型 ----

/** Toast 弹出位置 */
type ToastPosition = "top" | "bottom";

type ToastOptions = {
  /** 显示的文本 */
  message: string;
  /** 显示时长（毫秒），short=1800，long=3500 */
  duration?: number;
  /** 弹出位置，默认顶部 */
  position?: ToastPosition;
};

type ToastContextValue = {
  show: (options: ToastOptions) => void;
};

// ---- Context ----

const ToastContext = createContext<ToastContextValue>({
  show: () => {},
});

/** 在组件树中任意地方调用 useToast().show({ message, duration, position }) 弹出提示 */
export function useToast() {
  return useContext(ToastContext);
}

// ---- Provider ----

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors: theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const [text, setText] = useState("");
  const [pos, setPos] = useState<ToastPosition>("top");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (options: ToastOptions) => {
      // 先清掉之前的定时器
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const duration = options.duration ?? 1800;
      const position = options.position ?? "top";

      setText(options.message);
      setPos(position);
      setVisible(true);

      // 滑入
      translateY.setValue(-100);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();

      // 自动消失
      timerRef.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
        });
      }, duration);
    },
    [translateY]
  );

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const isTop = pos === "top";

  return (
    <ToastContext.Provider value={{ show }}>
      {children}

      {visible && (
        <TouchableWithoutFeedback onPress={() => {}}>
          <Animated.View
            style={[
              styles.toast,
              {
                backgroundColor: theme.ink,
              },
              isTop
                ? { top: insets.top + 12 }
                : { bottom: insets.bottom + 12 },
              { transform: [{ translateY }] },
            ]}
          >
            <Text style={[styles.toastText, { color: theme.background }]}>
              {text}
            </Text>
          </Animated.View>
        </TouchableWithoutFeedback>
      )}
    </ToastContext.Provider>
  );
}

// ---- 样式 ----

const styles = StyleSheet.create({
  toast: {
    alignSelf: "center",
    borderRadius: 10,
    elevation: 10,
    marginHorizontal: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 9999,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
