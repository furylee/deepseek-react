// ============================================================
// ErrorBoundary — React 渲染错误边界
// ------------------------------------------------------------
// 捕获子组件树中的渲染崩溃，防止一个组件出错导致整个 App 白屏。
// 当捕获到错误时，显示友好的错误提示而不是闪退。
// ============================================================

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; errorMessage: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? "未知错误" };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 生产环境下仅打印到控制台，不暴露给用户
    console.error("ErrorBoundary 捕获到错误：", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>出错了</Text>
          <Text style={styles.message}>
            App 遇到了一个意外错误。{"\n"}
            这通常是暂时的，请点击下方按钮重试。
          </Text>
          <Text style={styles.detail}>{this.state.errorMessage}</Text>
          <TouchableOpacity onPress={this.handleReset} style={styles.button}>
            <Text style={styles.buttonText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#17A589",
    borderRadius: 10,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    alignItems: "center",
    backgroundColor: "#F6F7FB",
    flex: 1,
    justifyContent: "center",
    padding: 30,
  },
  detail: {
    color: "#667085",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
  message: {
    color: "#667085",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center",
  },
  title: {
    color: "#172033",
    fontSize: 24,
    fontWeight: "900",
  },
});
