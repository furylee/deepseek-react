// ============================================================
// SettingsScreen — 设置页面
// ------------------------------------------------------------
// 用户可以在这里修改：
//   - API 配置：多组 API，可新增/编辑/删除，支持预设+获取模型列表
//   - 生成参数：Temperature、Max Tokens、Stream 开关
//   - 主题：跟随系统 / 浅色 / 深色
//
// 设计要点：
//   - API Token 使用 secureTextEntry 防止被旁人看到
//   - 保存前做必填校验（名称、Base URL、模型名）
//   - 新增空白表单，填写完整才能保存
//   - 预设按钮一键填入大厂配置
//   - 主题切换即时生效
// ============================================================

import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
  Cpu,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Save,
  Search,
  Sun,
  Trash2,
  X,
  Zap,
} from "lucide-react-native";

import { fetchModelList } from "../api/modelsApi";
import { IconButton } from "../components/IconButton";
import { useToast } from "../components/Toast";
import { useAppTheme } from "../contexts/ThemeContext";
import type { ThemeMode } from "../contexts/ThemeContext";
import { API_PRESETS } from "../constants";
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
  const toast = useToast();
  const [form, setForm] = useState<AppSettings>(settings);
  const [tokens, setTokens] = useState<TokenMap>({ ...initialTokens });
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<ApiProfile | null>(null);
  const [editingToken, setEditingToken] = useState("");

  // 模型下拉
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [modelList, setModelList] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // ---- 展开编辑 ----
  function startEdit(profile: ApiProfile) {
    setExpandedId(profile.id);
    setEditingProfile({ ...profile });
    setEditingToken(tokens[profile.id] ?? "");
  }

  // ---- 新建（空白表单） ----
  function startNew() {
    const newProfile: ApiProfile = {
      id: createId("ap"),
      name: "",
      baseUrl: "",
      model: "",
      enabled: true,
    };
    // Add to form immediately so it renders in the list
    setForm((prev) => ({
      ...prev,
      apiProfiles: [...prev.apiProfiles, newProfile],
    }));
    setExpandedId(newProfile.id);
    setEditingProfile(newProfile);
    setEditingToken("");
  }

  // ---- 应用预设 ----
  function applyPreset(preset: (typeof API_PRESETS)[number]) {
    if (editingProfile) {
      // 已有正在编辑的配置，直接填入预设值
      setEditingProfile((p) =>
        p
          ? { ...p, name: preset.name, baseUrl: preset.baseUrl, model: p.model || preset.modelHint }
          : p
      );
      toast.show({ message: `已填入 ${preset.name} 预设` });
    } else {
      // 无编辑中的配置，一键创建新配置并填入预设值
      const newProfile: ApiProfile = {
        id: createId("ap"),
        name: preset.name,
        baseUrl: preset.baseUrl,
        model: preset.modelHint,
        enabled: true,
      };
      setForm((prev) => ({
        ...prev,
        apiProfiles: [...prev.apiProfiles, newProfile],
      }));
      setExpandedId(newProfile.id);
      setEditingProfile(newProfile);
      setEditingToken("");
      toast.show({ message: `已添加 ${preset.name} 配置` });
    }
  }

  // ---- 获取模型列表 ----
  const handleFetchModels = useCallback(async () => {
    const baseUrl = editingProfile?.baseUrl?.trim() ?? "";
    const token = editingToken.trim();

    if (!baseUrl) {
      Alert.alert("请先填写", "需要先填写 Base URL 才能获取模型列表。");
      return;
    }
    if (!token) {
      Alert.alert("请先填写", "需要先填写 API Token 才能获取模型列表。");
      return;
    }

    setLoadingModels(true);
    try {
      const list = await fetchModelList(baseUrl, token);
      if (list.length === 0) {
        Alert.alert("未获取到模型", "请确认 Base URL 和 Token 正确，并检查网络连接。");
      } else {
        setModelList(list);
        setShowModelPicker(true);
      }
    } finally {
      setLoadingModels(false);
    }
  }, [editingProfile?.baseUrl, editingToken]);

  // ---- 取消编辑 ----
  function cancelEdit() {
    setExpandedId(null);
    setEditingProfile(null);
    setEditingToken("");
  }

  // ---- 保存当前 profile ----
  function saveProfile() {
    if (!editingProfile) return;

    const name = editingProfile.name.trim();
    const baseUrl = editingProfile.baseUrl.trim();
    const model = editingProfile.model.trim();

    if (!name) {
      Alert.alert("缺少名称", "请为这组 API 配置起一个名字。");
      return;
    }
    if (!baseUrl) {
      Alert.alert("缺少 Base URL", "请填写接口地址。");
      return;
    }
    if (!model) {
      Alert.alert("缺少模型名", "请填写或选择一个模型。");
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

  // ---- 删除 ----
  function deleteProfile(profileId: string) {
    if (form.apiProfiles.length <= 1) {
      Alert.alert("不能删除", "至少保留一组 API 配置。");
      return;
    }
    Alert.alert("删除配置", "确定删除这组 API 配置吗？", [
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      {/* ---- 模型选择弹窗 ---- */}
      <Modal
        animationType="slide"
        onRequestClose={() => setShowModelPicker(false)}
        transparent
        visible={showModelPicker}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.ink }]}>
                选择模型 ({modelList.length})
              </Text>
              <Pressable
                onPress={() => setShowModelPicker(false)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceAlt }]}
              >
                <X color={theme.ink} size={16} />
              </Pressable>
            </View>
            <FlatList
              data={modelList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setEditingProfile((p) => (p ? { ...p, model: item } : p));
                    setShowModelPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.modelItem,
                    { borderBottomColor: theme.border },
                    editingProfile?.model === item && { backgroundColor: theme.accent + "18" },
                    pressed && { backgroundColor: theme.surfaceAlt },
                  ]}
                >
                  <Text style={[styles.modelItemText, { color: theme.ink }]} numberOfLines={1}>
                    {item}
                  </Text>
                  {editingProfile?.model === item && (
                    <Check color={theme.accent} size={16} />
                  )}
                </Pressable>
              )}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>

      {/* 顶部 */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityLabel="返回聊天"
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <ArrowLeft color={theme.ink} size={22} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.ink }]}>API 设置</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {form.apiProfiles.length} 组配置 · 本地保存
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ---- 预设配置 ---- */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>
              快速预设
            </Text>
            <Zap color={theme.warning} size={14} />
          </View>
          <View style={styles.presetGrid}>
            {API_PRESETS.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => applyPreset(preset)}
                style={({ pressed }) => [
                  styles.presetChip,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                  pressed && { backgroundColor: theme.accent + "18", borderColor: theme.accent },
                ]}
              >
                <Text style={[styles.presetName, { color: theme.ink }]} numberOfLines={1}>
                  {preset.name}
                </Text>
                <Text style={[styles.presetDetail, { color: theme.muted }]} numberOfLines={1}>
                  {preset.modelHint}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ---- API 配置列表 ---- */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>API 配置</Text>
            <Pressable
              onPress={startNew}
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.accent },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Plus color="#FFFFFF" size={16} />
              <Text style={styles.addButtonText}>添加</Text>
            </Pressable>
          </View>

          {form.apiProfiles.map((profile) => {
            const isExpanded = expandedId === profile.id;
            const isActive = form.activeProfileId === profile.id;
            const previewToken = tokens[profile.id] ?? "";

            return (
              <View key={profile.id}>
                <View
                  style={[
                    styles.profileRow,
                    { borderColor: theme.border, opacity: profile.enabled ? 1 : 0.5 },
                    isActive && { borderColor: theme.accent, borderWidth: 2 },
                  ]}
                >
                  <Pressable
                    onPress={() => (isExpanded ? cancelEdit() : startEdit(profile))}
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
                    </View>
                    {isExpanded ? <ChevronUp color={theme.muted} size={18} /> : <ChevronDown color={theme.muted} size={18} />}
                  </Pressable>
                  <Switch
                    onValueChange={(enabled) => {
                      if (!enabled && form.apiProfiles.filter((p) => p.enabled && p.id !== profile.id).length === 0) {
                        Alert.alert("不能禁用", "至少保留一个启用的 API 配置。");
                        return;
                      }
                      setForm((prev) => ({
                        ...prev,
                        apiProfiles: prev.apiProfiles.map((p) => (p.id === profile.id ? { ...p, enabled } : p)),
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
                    {/* 预设快速填入 */}
                    <View style={styles.presetInline}>
                      <Text style={[styles.labelSmall, { color: theme.muted }]}>快速填入预设：</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                        {API_PRESETS.map((p) => (
                          <Pressable
                            key={p.name}
                            onPress={() => applyPreset(p)}
                            style={({ pressed }) => [
                              styles.presetMini,
                              { backgroundColor: theme.surface, borderColor: theme.border },
                              pressed && { borderColor: theme.accent },
                            ]}
                          >
                            <Text style={[styles.presetMiniText, { color: theme.ink }]}>{p.name}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    <Text style={[styles.label, { color: theme.muted }]}>配置名称</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(name) => setEditingProfile((p) => (p ? { ...p, name } : p))}
                      placeholder="必填 · 如 DeepSeek 官方"
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                      value={editingProfile.name}
                    />

                    <Text style={[styles.label, { color: theme.muted }]}>Base URL</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(baseUrl) => setEditingProfile((p) => (p ? { ...p, baseUrl } : p))}
                      placeholder="必填 · https://api.deepseek.com/v1"
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                      value={editingProfile.baseUrl}
                    />

                    <Text style={[styles.label, { color: theme.muted }]}>API Token</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={setEditingToken}
                      placeholder="必填 · sk-..."
                      placeholderTextColor={theme.muted}
                      secureTextEntry
                      style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                      value={editingToken}
                    />

                    {/* Model: 下拉 + 获取按钮 */}
                    <Text style={[styles.label, { color: theme.muted }]}>Model</Text>
                    <View style={styles.modelRow}>
                      <Pressable
                        onPress={() => setShowModelPicker(true)}
                        style={[styles.modelInput, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            color: editingProfile.model ? theme.ink : theme.muted,
                            flex: 1,
                            fontSize: 15,
                          }}
                        >
                          {editingProfile.model || "必填 · 选择或输入模型名"}
                        </Text>
                        <ChevronDown color={theme.muted} size={16} />
                      </Pressable>
                      <Pressable
                        onPress={handleFetchModels}
                        style={({ pressed }) => [
                          styles.fetchBtn,
                          { backgroundColor: theme.accent },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        {loadingModels ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Search color="#FFF" size={16} />
                        )}
                      </Pressable>
                    </View>

                    {/* 模型列表为空或无匹配时的手动输入 */}
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(model) => setEditingProfile((p) => (p ? { ...p, model } : p))}
                      placeholder="或手动输入模型名"
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink, marginTop: 0 }]}
                      value={editingProfile.model}
                    />

                    {/* MCP */}
                    {form.mcpServers.length > 0 && (
                      <View style={styles.mcpSection}>
                        <Text style={[styles.label, { color: theme.muted }]}>启用的 MCP 服务</Text>
                        {form.mcpServers.map((mcp) => {
                          const profileMcps = form.profileMcpMap[profile.id] ?? [];
                          const isMcpOn = profileMcps.includes(mcp.id);
                          return (
                            <Pressable
                              key={mcp.id}
                              onPress={() => {
                                setForm((prev) => {
                                  const current = prev.profileMcpMap[profile.id] ?? [];
                                  const next = isMcpOn ? current.filter((id) => id !== mcp.id) : [...current, mcp.id];
                                  return { ...prev, profileMcpMap: { ...prev.profileMcpMap, [profile.id]: next } };
                                });
                              }}
                              style={[styles.mcpChip, {
                                backgroundColor: isMcpOn ? theme.accent + "22" : theme.surface,
                                borderColor: isMcpOn ? theme.accent : theme.border,
                              }]}
                            >
                              <Cpu color={isMcpOn ? theme.accent : theme.muted} size={14} />
                              <Text style={[styles.mcpChipText, { color: isMcpOn ? theme.accent : theme.muted }]}>
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
                        style={({ pressed }) => [
                          styles.actionBtn,
                          { backgroundColor: theme.accent },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Check color="#FFFFFF" size={16} />
                        <Text style={styles.actionBtnText}>确定</Text>
                      </Pressable>
                      <Pressable
                        onPress={cancelEdit}
                        style={({ pressed }) => [
                          styles.actionBtn,
                          { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <X color={theme.ink} size={16} />
                        <Text style={[styles.actionBtnText, { color: theme.ink }]}>取消</Text>
                      </Pressable>
                      {form.apiProfiles.length > 1 && (
                        <Pressable
                          onPress={() => deleteProfile(profile.id)}
                          style={({ pressed }) => [
                            styles.actionBtn,
                            { backgroundColor: theme.coral },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Trash2 color="#FFFFFF" size={14} />
                        </Pressable>
                      )}
                    </View>

                    {!isActive && (
                      <Pressable
                        onPress={() => setForm((prev) => ({ ...prev, activeProfileId: profile.id }))}
                        style={[styles.setActiveBtn, { borderColor: theme.accent }]}
                      >
                        <Text style={[styles.setActiveText, { color: theme.accent }]}>设为当前使用</Text>
                      </Pressable>
                    )}
                    {isActive && (
                      <Text style={[styles.activeTag, { color: theme.accent, textAlign: "center", marginTop: 8 }]}>
                        当前使用中
                      </Text>
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
                onChangeText={(value) => setForm((c) => ({ ...c, temperature: Number(value) }))}
                style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.ink }]}
                value={String(form.temperature)}
              />
            </View>
            <View style={styles.flexField}>
              <Text style={[styles.label, { color: theme.muted }]}>Max Tokens</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) => setForm((c) => ({ ...c, maxTokens: Number(value) }))}
                style={[styles.input, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.ink }]}
                value={String(form.maxTokens)}
              />
            </View>
          </View>
          <View style={[styles.switchRow, { backgroundColor: theme.surfaceAlt }]}>
            <View style={styles.switchText}>
              <Text style={[styles.switchTitle, { color: theme.ink }]}>流式输出</Text>
              <Text style={[styles.switchHint, { color: theme.muted }]}>接口支持 SSE 时会边生成边显示。</Text>
            </View>
            <Switch
              onValueChange={(stream) => setForm((c) => ({ ...c, stream }))}
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
                  onPress={() => { setThemeMode(mode); setForm((c) => ({ ...c, themeMode: mode })); }}
                  style={[styles.themeChip, {
                    backgroundColor: isSelected ? theme.accent : theme.surfaceAlt,
                    borderColor: isSelected ? theme.accent : theme.border,
                  }]}
                >
                  <Icon color={isSelected ? "#FFF" : theme.ink} size={18} />
                  <Text style={[styles.themeLabel, { color: isSelected ? "#FFF" : theme.ink }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ---- 保存 ---- */}
        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.fullSaveBtn, { backgroundColor: theme.accent }, pressed && { opacity: 0.85 }]}
        >
          <Save color="#FFF" size={18} />
          <Text style={styles.fullSaveBtnText}>{isSaving ? "保存中..." : "保存全部设置"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actionBtn: { alignItems: "center", borderRadius: 8, flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  actionBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  activeTag: { fontSize: 11, fontWeight: "700", marginTop: 3 },
  activeDot: { borderRadius: 4, height: 8, marginRight: 6, width: 8 },
  addButton: { alignItems: "center", borderRadius: 8, flexDirection: "row", gap: 5, paddingHorizontal: 12, paddingVertical: 8 },
  addButtonText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  backButton: { alignItems: "center", borderRadius: 8, borderWidth: 1, height: 42, justifyContent: "center", width: 42 },
  content: { gap: 14, padding: 14, paddingBottom: 40 },
  doubleField: { flexDirection: "row", gap: 10 },
  editActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  editPanel: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, marginTop: -2, padding: 14 },
  fetchBtn: { alignItems: "center", borderRadius: 8, height: 46, justifyContent: "center", marginLeft: 8, width: 46 },
  flexField: { flex: 1 },
  fullSaveBtn: { alignItems: "center", borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", paddingVertical: 14 },
  fullSaveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  header: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 14, padding: 14 },
  headerText: { flex: 1 },
  input: { borderRadius: 8, borderWidth: 1, fontSize: 15, marginBottom: 12, minHeight: 46, paddingHorizontal: 14 },
  label: { fontSize: 13, fontWeight: "800", marginBottom: 7 },
  labelSmall: { fontSize: 11, fontWeight: "700", marginRight: 6 },
  mcpChip: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 10 },
  mcpChipText: { flex: 1, fontSize: 13, fontWeight: "600" },
  mcpSection: { borderColor: "transparent", borderTopWidth: 1, marginTop: 6, paddingTop: 10 },
  modalBackdrop: { backgroundColor: "rgba(0,0,0,0.5)", flex: 1, justifyContent: "flex-end" },
  modalCloseBtn: { alignItems: "center", borderRadius: 20, height: 32, justifyContent: "center", width: 32 },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%", paddingBottom: 30 },
  modalHeader: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: "800" },
  modelInput: { alignItems: "center", borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: "row", height: 46, justifyContent: "space-between", paddingHorizontal: 14 },
  modelItem: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  modelItemText: { flex: 1, fontSize: 14 },
  modelRow: { flexDirection: "row", marginBottom: 12 },
  presetChip: { borderRadius: 10, borderWidth: 1, flexBasis: "30%", marginBottom: 8, padding: 10 },
  presetDetail: { fontSize: 11, marginTop: 2 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetInline: { alignItems: "center", flexDirection: "row", marginBottom: 10 },
  presetMini: { borderRadius: 8, borderWidth: 1, marginRight: 8, paddingHorizontal: 12, paddingVertical: 6 },
  presetMiniText: { fontSize: 12, fontWeight: "600" },
  presetName: { fontSize: 13, fontWeight: "700" },
  presetScroll: { flex: 1 },
  profileDetail: { fontSize: 12, marginTop: 2 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: "700" },
  profileNameRow: { alignItems: "center", flexDirection: "row" },
  profileRow: { alignItems: "center", borderRadius: 10, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: 8, padding: 12 },
  screen: { flex: 1 },
  section: { borderRadius: 14, borderWidth: 1, padding: 14 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "900" },
  setActiveBtn: { alignItems: "center", borderRadius: 8, borderWidth: 1, marginTop: 8, paddingVertical: 10 },
  setActiveText: { fontSize: 13, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 3 },
  switchHint: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  switchRow: { alignItems: "center", borderRadius: 8, flexDirection: "row", gap: 14, justifyContent: "space-between", padding: 14 },
  switchText: { flex: 1 },
  switchTitle: { fontSize: 15, fontWeight: "800" },
  themeChip: { alignItems: "center", borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 12 },
  themeLabel: { fontSize: 13, fontWeight: "700" },
  themeOptions: { flexDirection: "row", gap: 8 },
  title: { fontSize: 26, fontWeight: "900" },
});
