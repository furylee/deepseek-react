// ============================================================
// SettingsScreen — 设置页面
// ------------------------------------------------------------
// 用户可以在这里修改：
//   - 接口配置：Base URL、API Token、Model
//   - 生成参数：Temperature、Max Tokens、Stream 开关
//   - 主题：跟随系统 / 浅色 / 深色
//   - 数据管理：清除所有聊天记录
//
// 设计要点：
//   - API Token 使用 secureTextEntry 防止被旁人看到
//   - 保存前做基本校验（Base URL 和 Model 不能为空）
//   - 清除聊天记录前弹窗确认
//   - 主题切换即时生效
// ============================================================

import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowLeft, Save, Trash2, Sun, Moon, Monitor } from "lucide-react-native";

import { IconButton } from "../components/IconButton";
import { useAppTheme } from "../contexts/ThemeContext";
import type { ThemeMode } from "../contexts/ThemeContext";
import { AppSettings } from "../types";

type SettingsScreenProps = {
  settings: AppSettings;
  onBack: () => void;
  onClearAllSessions: () => Promise<void>;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
};

// 主题选项配置
const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "system", label: "跟随系统", icon: Monitor },
  { mode: "lit", label: "浅色", icon: Sun },
  { mode: "dim", label: "深色", icon: Moon },
];

export function SettingsScreen({
  settings,
  onBack,
  onClearAllSessions,
  onSaveSettings,
}: SettingsScreenProps) {
  const { colors: theme, themeMode, setThemeMode } = useAppTheme();
  const [form, setForm] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);

  // ---- 保存设置 ----
  async function save() {
    if (!form.baseUrl.trim()) {
      Alert.alert(
        "缺少 Base URL",
        "请填写接口地址，例如 https://api.deepseek.com/v1。"
      );
      return;
    }

    if (!form.model.trim()) {
      Alert.alert("缺少模型名", "请填写模型名，例如 deepseek-chat。");
      return;
    }

    setIsSaving(true);

    try {
      await onSaveSettings({
        ...form,
        baseUrl: form.baseUrl.trim(),
        model: form.model.trim(),
        temperature: Number.isFinite(form.temperature)
          ? form.temperature
          : 0.7,
        maxTokens: Number.isFinite(form.maxTokens)
          ? form.maxTokens
          : 2048,
      });
      Alert.alert("已保存", "API 设置已更新。");
    } finally {
      setIsSaving(false);
    }
  }

  // ---- 清除聊天记录确认 ----
  function confirmClear() {
    Alert.alert("清除所有聊天记录", "这会删除本机保存的全部聊天，无法恢复。", [
      { text: "取消", style: "cancel" },
      {
        text: "清除",
        style: "destructive",
        onPress: async () => {
          try {
            await onClearAllSessions();
            Alert.alert("已清除", "所有聊天记录已清空。");
          } catch (error: any) {
            Alert.alert("清除失败", error?.message ?? "清除聊天记录时出错，请重试。");
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      {/* ---- 顶部标题栏 ---- */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          accessibilityLabel="返回聊天"
          onPress={onBack}
          style={[
            styles.backButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <ArrowLeft color={theme.ink} size={22} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.ink }]}>设置</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            修改 API Token、模型和本地记录
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---- 接口配置 ---- */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>
            接口配置
          </Text>

          <Text style={[styles.label, { color: theme.muted }]}>Base URL</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(baseUrl) =>
              setForm((current) => ({ ...current, baseUrl }))
            }
            placeholder="https://api.deepseek.com/v1"
            placeholderTextColor={theme.muted}
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                color: theme.ink,
              },
            ]}
            value={form.baseUrl}
          />

          <Text style={[styles.label, { color: theme.muted }]}>API Token</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(apiToken) =>
              setForm((current) => ({ ...current, apiToken }))
            }
            placeholder="sk-..."
            placeholderTextColor={theme.muted}
            secureTextEntry
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                color: theme.ink,
              },
            ]}
            value={form.apiToken}
          />

          <Text style={[styles.label, { color: theme.muted }]}>Model</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(model) =>
              setForm((current) => ({ ...current, model }))
            }
            placeholder="deepseek-chat"
            placeholderTextColor={theme.muted}
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                color: theme.ink,
              },
            ]}
            value={form.model}
          />
        </View>

        {/* ---- 生成参数 ---- */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>
            生成参数
          </Text>

          <View style={styles.doubleField}>
            <View style={styles.flexField}>
              <Text style={[styles.label, { color: theme.muted }]}>
                Temperature
              </Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    temperature: Number(value),
                  }))
                }
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                    color: theme.ink,
                  },
                ]}
                value={String(form.temperature)}
              />
            </View>
            <View style={styles.flexField}>
              <Text style={[styles.label, { color: theme.muted }]}>
                Max Tokens
              </Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    maxTokens: Number(value),
                  }))
                }
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                    color: theme.ink,
                  },
                ]}
                value={String(form.maxTokens)}
              />
            </View>
          </View>

          {/* 流式输出开关 */}
          <View
            style={[
              styles.switchRow,
              { backgroundColor: theme.surfaceAlt },
            ]}
          >
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: theme.ink }]}>
                流式输出
              </Text>
              <Text style={[styles.switchHint, { color: theme.muted }]}>
                接口支持 SSE 时会边生成边显示。
              </Text>
            </View>
            <Switch
              onValueChange={(stream) =>
                setForm((current) => ({ ...current, stream }))
              }
              thumbColor="#FFFFFF"
              trackColor={{ false: theme.border, true: theme.accent }}
              value={form.stream}
            />
          </View>
        </View>

        {/* ---- 主题设置 ---- */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>
            外观
          </Text>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => {
              const isSelected = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setThemeMode(mode);
                    // 同步更新表单中的 themeMode
                    setForm((current) => ({ ...current, themeMode: mode }));
                  }}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: isSelected
                        ? theme.accent
                        : theme.surfaceAlt,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Icon
                    color={isSelected ? "#FFFFFF" : theme.ink}
                    size={18}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? "#FFFFFF" : theme.ink },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ---- 操作按钮 ---- */}
        <View style={styles.actions}>
          <IconButton
            icon={Save}
            label={isSaving ? "保存中" : "保存设置"}
            onPress={save}
            tone="accent"
          />
          <IconButton
            icon={Trash2}
            label="清除聊天记录"
            onPress={confirmClear}
            tone="danger"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  backButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  content: {
    gap: 14,
    padding: 14,
    paddingBottom: 28,
  },
  doubleField: {
    flexDirection: "row",
    gap: 10,
  },
  flexField: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  headerText: {
    flex: 1,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 14,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  screen: {
    flex: 1,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
  },
  switchHint: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 3,
  },
  switchRow: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    padding: 14,
  },
  switchText: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  themeChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  themeOptions: {
    flexDirection: "row",
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
  },
});
