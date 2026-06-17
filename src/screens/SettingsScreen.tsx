// ============================================================
// SettingsScreen — 设置页面
// ------------------------------------------------------------
// 用户可以在这里修改：
//   - API 配置：多组 API（Base URL + API Token + Model），可新增/编辑/删除
//   - 生成参数：Temperature、Max Tokens、Stream 开关
//   - 主题：跟随系统 / 浅色 / 深色
//   - 数据管理：清除所有聊天记录
//
// 设计要点：
//   - API Token 使用 secureTextEntry 防止被旁人看到
//   - 保存前做基本校验（配置名、Base URL 和 Model 不能为空）
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
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  Sun,
  Moon,
  Cpu,
  Monitor,
} from "lucide-react-native";

import { IconButton } from "../components/IconButton";
import { useAppTheme } from "../contexts/ThemeContext";
import type { ThemeMode } from "../contexts/ThemeContext";
import { ApiProfile, AppSettings } from "../types";
import { createId } from "../utils/chat";

type TokenMap = Record<string, string>;

type SettingsScreenProps = {
  settings: AppSettings;
  tokens: TokenMap;
  onBack: () => void;
  onClearAllSessions: () => Promise<void>;
  onSaveSettings: (settings: AppSettings, tokens: TokenMap) => Promise<void>;
};

// 主题选项配置
const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "system", label: "跟随系统", icon: Monitor },
  { mode: "lit", label: "浅色", icon: Sun },
  { mode: "dim", label: "深色", icon: Moon },
];

export function SettingsScreen({
  settings,
  tokens: initialTokens,
  onBack,
  onClearAllSessions,
  onSaveSettings,
}: SettingsScreenProps) {
  const { colors: theme, themeMode, setThemeMode } = useAppTheme();
  const [form, setForm] = useState<AppSettings>(settings);
  const [tokens, setTokens] = useState<TokenMap>({ ...initialTokens });
  const [isSaving, setIsSaving] = useState(false);
  // 当前展开编辑的 profile（null = 全部折叠）
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 编辑中的 profile 临时数据
  const [editingProfile, setEditingProfile] = useState<ApiProfile | null>(null);
  const [editingToken, setEditingToken] = useState("");

  // ---- 展开编辑某个配置 ----
  function startEdit(profile: ApiProfile) {
    setExpandedId(profile.id);
    setEditingProfile({ ...profile });
    setEditingToken(tokens[profile.id] ?? "");
  }

  // ---- 新建配置 ----
  function startNew() {
    const newProfile: ApiProfile = {
      id: createId("ap"),
      name: "",
      baseUrl: "",
      model: "",
      enabled: true,
    };
    setExpandedId(newProfile.id);
    setEditingProfile(newProfile);
    setEditingToken("");
  }

  // ---- 取消编辑 ----
  function cancelEdit() {
    setExpandedId(null);
    setEditingProfile(null);
    setEditingToken("");
  }

  // ---- 保存当前编辑的配置 ----
  function saveProfile() {
    if (!editingProfile) return;

    const name = editingProfile.name.trim();
    const baseUrl = editingProfile.baseUrl.trim();
    const model = editingProfile.model.trim();

    if (!name) {
      Alert.alert("缺少名称", "请为这组 API 配置起一个名字，如「DeepSeek 官方」。");
      return;
    }
    if (!baseUrl) {
      Alert.alert("缺少 Base URL", "请填写接口地址。");
      return;
    }
    if (!model) {
      Alert.alert("缺少模型名", "请填写模型名。");
      return;
    }

    const savedProfile: ApiProfile = { ...editingProfile, name, baseUrl, model };

    setForm((prev) => {
      const exists = prev.apiProfiles.some((p) => p.id === savedProfile.id);
      const nextProfiles = exists
        ? prev.apiProfiles.map((p) => (p.id === savedProfile.id ? savedProfile : p))
        : [...prev.apiProfiles, savedProfile];
      return { ...prev, apiProfiles: nextProfiles };
    });

    setTokens((prev) => {
      const next = { ...prev };
      if (editingToken.trim()) {
        next[savedProfile.id] = editingToken.trim();
      } else {
        delete next[savedProfile.id];
      }
      return next;
    });

    cancelEdit();
  }

  // ---- 删除某个配置 ----
  function deleteProfile(profileId: string) {
    if (form.apiProfiles.length <= 1) {
      Alert.alert("不能删除", "至少保留一组 API 配置。");
      return;
    }

    Alert.alert("删除配置", `确定删除这组 API 配置吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          setForm((prev) => {
            const nextProfiles = prev.apiProfiles.filter((p) => p.id !== profileId);
            const nextActiveId =
              prev.activeProfileId === profileId
                ? nextProfiles[0]?.id ?? prev.activeProfileId
                : prev.activeProfileId;
            return { ...prev, apiProfiles: nextProfiles, activeProfileId: nextActiveId };
          });
          setTokens((prev) => {
            const next = { ...prev };
            delete next[profileId];
            return next;
          });
          if (expandedId === profileId) cancelEdit();
        },
      },
    ]);
  }

  // ---- 全部保存 ----
  async function save() {
    setIsSaving(true);
    try {
      await onSaveSettings(form, tokens);
      Alert.alert("已保存", "所有设置已更新。");
    } catch (error: any) {
      Alert.alert("保存失败", error?.message ?? "请重试。");
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
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityLabel="返回聊天"
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <ArrowLeft color={theme.ink} size={22} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.ink }]}>设置</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {form.apiProfiles.length} 组 API · 本地保存
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ---- API 配置列表 ---- */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>API 配置</Text>
            <Pressable
              onPress={startNew}
              style={[styles.addButton, { backgroundColor: theme.accent }]}
            >
              <Plus color="#FFFFFF" size={16} />
              <Text style={styles.addButtonText}>添加</Text>
            </Pressable>
          </View>

          {/* 配置列表 */}
          {form.apiProfiles.map((profile) => {
            const isExpanded = expandedId === profile.id;
            const isActive = form.activeProfileId === profile.id;
            const previewToken = tokens[profile.id] ?? "";

            return (
              <View key={profile.id}>
                {/* 折叠状态：一行摘要 + 启用开关 */}
                <View
                  style={[
                    styles.profileRow,
                    { borderColor: theme.border, opacity: profile.enabled ? 1 : 0.5 },
                    isActive && { borderColor: theme.accent, borderWidth: 2 },
                  ]}
                >
                  <Pressable
                    onPress={() => {
                      if (isExpanded) {
                        cancelEdit();
                      } else {
                        startEdit(profile);
                      }
                    }}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                  >
                    <View style={styles.profileInfo}>
                      <View style={styles.profileNameRow}>
                        {isActive && <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />}
                        <Text style={[styles.profileName, { color: theme.ink }]} numberOfLines={1}>
                          {profile.name || "未命名"}
                        </Text>
                      </View>
                      <Text style={[styles.profileDetail, { color: theme.muted }]} numberOfLines={1}>
                        {profile.model} · {profile.baseUrl}
                      </Text>
                      {isActive && (
                          <Text style={[styles.activeTag, { color: theme.accent }]}>当前使用</Text>
                        )}
                      </View>
                      {isExpanded ? (
                        <ChevronUp color={theme.muted} size={18} />
                      ) : (
                        <ChevronDown color={theme.muted} size={18} />
                      )}
                    </Pressable>
                    {/* 启用/禁用开关 */}
                    <Switch
                      onValueChange={(enabled) => {
                        if (!enabled) {
                          const enabledCount = form.apiProfiles.filter((p) => p.enabled && p.id !== profile.id).length;
                          if (enabledCount === 0) {
                            Alert.alert("不能禁用", "至少保留一个启用的 API 配置。");
                            return;
                          }
                        }
                        setForm((prev) => ({
                          ...prev,
                          apiProfiles: prev.apiProfiles.map((p) =>
                            p.id === profile.id ? { ...p, enabled } : p
                          ),
                          activeProfileId:
                            !enabled && prev.activeProfileId === profile.id
                              ? prev.apiProfiles.find((p) => p.enabled && p.id !== profile.id)?.id ?? prev.activeProfileId
                              : prev.activeProfileId,
                        }));
                      }}
                      thumbColor="#FFFFFF"
                      trackColor={{ false: theme.border, true: theme.accent }}
                      value={profile.enabled}
                    />
                  </View>

                  {/* 展开编辑 */}
                  {isExpanded && editingProfile && (
                    <View style={[styles.editPanel, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                      <Text style={[styles.label, { color: theme.muted }]}>配置名称</Text>
                      <TextInput
                        autoCapitalize="none"
                        onChangeText={(name) => setEditingProfile((p) => p ? { ...p, name } : p)}
                        placeholder="如：DeepSeek 官方、硅基流动"
                        placeholderTextColor={theme.muted}
                        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                        value={editingProfile.name}
                      />

                      <Text style={[styles.label, { color: theme.muted }]}>Base URL</Text>
                      <TextInput
                        autoCapitalize="none"
                        onChangeText={(baseUrl) => setEditingProfile((p) => p ? { ...p, baseUrl } : p)}
                        placeholder="https://api.deepseek.com/v1"
                        placeholderTextColor={theme.muted}
                        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                        value={editingProfile.baseUrl}
                      />

                      <Text style={[styles.label, { color: theme.muted }]}>API Token</Text>
                      <TextInput
                        autoCapitalize="none"
                        onChangeText={setEditingToken}
                        placeholder="sk-..."
                        placeholderTextColor={theme.muted}
                        secureTextEntry
                        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                        value={editingToken}
                      />
                      {previewToken && !editingToken && (
                        <Text style={[styles.tokenHint, { color: theme.muted }]}>
                          Token 已保存（重新编辑时不显示）
                        </Text>
                      )}

                      <Text style={[styles.label, { color: theme.muted }]}>Model</Text>
                      <TextInput
                        autoCapitalize="none"
                        onChangeText={(model) => setEditingProfile((p) => p ? { ...p, model } : p)}
                        placeholder="deepseek-chat"
                        placeholderTextColor={theme.muted}
                        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                        value={editingProfile.model}
                      />

                      {/* MCP 服务选择 */}
                      {form.mcpServers.length > 0 && (
                        <View style={styles.mcpSection}>
                          <Text style={[styles.label, { color: theme.muted }]}>
                            启用的 MCP 服务
                          </Text>
                          {form.mcpServers.map((mcp) => {
                            const profileMcps = form.profileMcpMap[profile.id] ?? [];
                            const isMcpOn = profileMcps.includes(mcp.id);
                            return (
                              <Pressable
                                key={mcp.id}
                                onPress={() => {
                                  setForm((prev) => {
                                    const current = prev.profileMcpMap[profile.id] ?? [];
                                    const next = isMcpOn
                                      ? current.filter((id) => id !== mcp.id)
                                      : [...current, mcp.id];
                                    return {
                                      ...prev,
                                      profileMcpMap: { ...prev.profileMcpMap, [profile.id]: next },
                                    };
                                  });
                                }}
                                style={[styles.mcpChip, {
                                  backgroundColor: isMcpOn ? theme.accent + "22" : theme.surface,
                                  borderColor: isMcpOn ? theme.accent : theme.border,
                                }]}
                              >
                                <Cpu color={isMcpOn ? theme.accent : theme.muted} size={14} />
                                <Text style={[styles.mcpChipText, {
                                  color: isMcpOn ? theme.accent : theme.muted,
                                }]}>
                                  {mcp.name}
                                </Text>
                                {isMcpOn && <Check color={theme.accent} size={12} />}
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      <View style={styles.editActions}>
                        <Pressable
                          onPress={saveProfile}
                          style={[styles.actionBtn, { backgroundColor: theme.accent }]}
                        >
                          <Check color="#FFFFFF" size={16} />
                          <Text style={styles.actionBtnText}>确定</Text>
                        </Pressable>
                        <Pressable
                          onPress={cancelEdit}
                          style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
                        >
                          <X color={theme.ink} size={16} />
                          <Text style={[styles.actionBtnText, { color: theme.ink }]}>取消</Text>
                        </Pressable>
                        {form.apiProfiles.length > 1 && (
                          <Pressable
                            onPress={() => deleteProfile(profile.id)}
                            style={[styles.actionBtn, { backgroundColor: theme.coral }]}
                          >
                            <Trash2 color="#FFFFFF" size={14} />
                          </Pressable>
                        )}
                      </View>

                      {/* 设为当前使用 */}
                      {!isActive && (
                        <Pressable
                          onPress={() => {
                            setForm((prev) => ({ ...prev, activeProfileId: profile.id }));
                          }}
                          style={[styles.setActiveBtn, { borderColor: theme.accent }]}
                        >
                          <Text style={[styles.setActiveText, { color: theme.accent }]}>
                            设为当前使用
                          </Text>
                        </Pressable>
                      )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ---- 生成参数 ---- */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>生成参数</Text>

          <View style={styles.doubleField}>
            <View style={styles.flexField}>
              <Text style={[styles.label, { color: theme.muted }]}>Temperature</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, temperature: Number(value) }))
                }
                style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.ink }]}
                value={String(form.temperature)}
              />
            </View>
            <View style={styles.flexField}>
              <Text style={[styles.label, { color: theme.muted }]}>Max Tokens</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setForm((current) => ({ ...current, maxTokens: Number(value) }))
                }
                style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.ink }]}
                value={String(form.maxTokens)}
              />
            </View>
          </View>

          {/* 流式输出开关 */}
          <View style={[styles.switchRow, { backgroundColor: theme.surfaceAlt }]}>
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: theme.ink }]}>流式输出</Text>
              <Text style={[styles.switchHint, { color: theme.muted }]}>
                接口支持 SSE 时会边生成边显示。
              </Text>
            </View>
            <Switch
              onValueChange={(stream) => setForm((current) => ({ ...current, stream }))}
              thumbColor="#FFFFFF"
              trackColor={{ false: theme.border, true: theme.accent }}
              value={form.stream}
            />
          </View>
        </View>

        {/* ---- 外观 ---- */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.ink }]}>外观</Text>
          <View style={styles.themeOptions}>
            {THEME_OPTIONS.map(({ mode, label, icon: Icon }) => {
              const isSelected = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setThemeMode(mode);
                    setForm((current) => ({ ...current, themeMode: mode }));
                  }}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: isSelected ? theme.accent : theme.surfaceAlt,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Icon color={isSelected ? "#FFFFFF" : theme.ink} size={18} />
                  <Text style={[styles.themeLabel, { color: isSelected ? "#FFFFFF" : theme.ink }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ---- 操作按钮 ---- */}
        <Pressable
          onPress={save}
          style={({ pressed }) => [
            styles.fullSaveBtn,
            { backgroundColor: theme.accent },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Save color="#FFF" size={18} />
          <Text style={styles.fullSaveBtnText}>
            {isSaving ? "保存中..." : "保存全部设置"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  fullSaveBtn: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  fullSaveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  activeDot: {
    borderRadius: 4,
    height: 8,
    marginRight: 6,
    width: 8,
  },
  activeTag: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  addButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
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
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  editPanel: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    marginTop: -2,
    padding: 14,
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
    marginBottom: 12,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  profileDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: "700",
  },
  profileNameRow: {
    alignItems: "center",
    flexDirection: "row",
  },
  profileRow: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: 12,
  },
  screen: {
    flex: 1,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  setActiveBtn: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 10,
  },
  setActiveText: {
    fontSize: 13,
    fontWeight: "700",
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
  tokenHint: {
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 8,
  },
  // MCP 选择样式
  mcpSection: {
    borderColor: "transparent",
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 10,
  },
  mcpChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  mcpChipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
});
