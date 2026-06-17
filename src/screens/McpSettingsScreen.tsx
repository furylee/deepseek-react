// ============================================================
// McpSettingsScreen — MCP 服务配置页
// ------------------------------------------------------------
// 管理 MCP (Model Context Protocol) 服务。
// 支持添加/编辑/删除 MCP 服务，每服务配置：
//   - 名称、传输方式（stdio / sse）
//   - stdio: command + args + 环境变量
//   - sse: 远程 URL
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Plug,
  Plus,
  RefreshCw,
  Terminal,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react-native";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppSettings, McpServer } from "../types";
import { createId } from "../utils/chat";
import { McpStatusMap, testAllMcpConnections, testMcpConnection } from "../utils/mcpTest";

type McpSettingsScreenProps = {
  settings: AppSettings;
  onBack: () => void;
  onSaveSettings: (settings: AppSettings) => void;
};

export function McpSettingsScreen({
  settings,
  onBack,
  onSaveSettings,
}: McpSettingsScreenProps) {
  const { colors: theme } = useAppTheme();
  const [form, setForm] = useState<AppSettings>(settings);
  const [mcpStatuses, setMcpStatuses] = useState<McpStatusMap>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<McpServer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ---- 启动时测试所有 MCP ----
  useEffect(() => {
    testAllMcpConnections(form.mcpServers).then(setMcpStatuses);
  }, []);

  // ---- 获取状态颜色 ----
  function statusColor(status: string | undefined) {
    if (status === "online") return "#22C55E";
    if (status === "offline") return "#EF4444";
    return theme.muted; // unknown
  }

  // ---- 测试单个服务 ----
  async function testOne(server: McpServer) {
    setTestingId(server.id);
    try {
      const status = await testMcpConnection(server);
      setMcpStatuses((prev) => ({ ...prev, [server.id]: status }));
    } finally {
      setTestingId(null);
    }
  }

  // ---- 新建 ----
  function startNew() {
    const server: McpServer = {
      id: createId("mcp"),
      name: "",
      transport: "stdio",
      command: "",
      args: "",
      url: "",
      env: "",
    };
    setExpandedId(server.id);
    setEditing(server);
  }

  // ---- 编辑 ----
  function startEdit(server: McpServer) {
    setExpandedId(server.id);
    setEditing({ ...server });
  }

  // ---- 取消 ----
  function cancelEdit() {
    setExpandedId(null);
    setEditing(null);
  }

  // ---- 保存编辑（并自动测试连接） ----
  function saveServer() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      Alert.alert("缺少名称", "请为 MCP 服务起一个名字。");
      return;
    }
    if (editing.transport === "stdio" && !editing.command.trim()) {
      Alert.alert("缺少命令", "请填写启动命令。");
      return;
    }
    if (editing.transport === "sse" && !editing.url.trim()) {
      Alert.alert("缺少 URL", "请填写远程服务地址。");
      return;
    }

    const saved: McpServer = { ...editing, name, command: editing.command.trim(), url: editing.url.trim() };

    setForm((prev) => {
      const exists = prev.mcpServers.some((s) => s.id === saved.id);
      return {
        ...prev,
        mcpServers: exists
          ? prev.mcpServers.map((s) => (s.id === saved.id ? saved : s))
          : [...prev.mcpServers, saved],
      };
    });
    cancelEdit();
    // 自动测试连接
    testOne(saved);
  }

  // ---- 删除 ----
  function deleteServer(id: string) {
    Alert.alert("删除服务", "确定删除这个 MCP 服务吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          setForm((prev) => ({
            ...prev,
            mcpServers: prev.mcpServers.filter((s) => s.id !== id),
          }));
          if (expandedId === id) cancelEdit();
        },
      },
    ]);
  }

  // ---- 保存全部 ----
  async function save() {
    setIsSaving(true);
    try {
      onSaveSettings(form);
      Alert.alert("已保存", "MCP 设置已更新。");
    } catch (error: any) {
      Alert.alert("保存失败", error?.message ?? "请重试。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* 顶部 */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityLabel="返回"
          onPress={onBack}
          style={[styles.backBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <ArrowLeft color={theme.ink} size={22} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.ink }]}>MCP 设置</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {form.mcpServers.length} 个服务
          </Text>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* 服务列表 */}
        <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.ink }]}>
              MCP 服务
            </Text>
            <Pressable
              accessibilityLabel="添加 MCP 服务"
              onPress={startNew}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: theme.accent },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Plus color="#FFFFFF" size={16} />
              <Text style={styles.addBtnText}>添加</Text>
            </Pressable>
          </View>

          {form.mcpServers.length === 0 && !expandedId && (
            <Text style={[styles.emptyHint, { color: theme.muted }]}>
              暂无 MCP 服务，点击"添加"创建
            </Text>
          )}

          {/* 新添加的、尚未保存的服务（不在 form.mcpServers 中） */}
          {expandedId && editing && !form.mcpServers.some((s) => s.id === editing.id) && (
            <View key={editing.id}>
              <View style={[styles.row, { borderColor: theme.accent }]}>
                <View style={styles.rowIcon}>
                  <Terminal color={theme.accent} size={18} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: theme.accent }]}>
                    {editing.name || "新服务"}
                  </Text>
                  <Text style={[styles.rowDetail, { color: theme.muted }]}>
                    正在编辑...
                  </Text>
                </View>
                <ChevronUp color={theme.accent} size={16} />
              </View>

              {/* 展开编辑（新服务，与下面通用编辑组件逻辑相同，后续可抽取） */}
              <View style={[styles.editPanel, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.label, { color: theme.muted }]}>服务名称</Text>
                <TextInput
                  autoCapitalize="none"
                  autoFocus
                  onChangeText={(name) => setEditing((p) => p ? { ...p, name } : p)}
                  placeholder="如 filesystem、web-search"
                  placeholderTextColor={theme.muted}
                  style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                  value={editing.name}
                />

                <Text style={[styles.label, { color: theme.muted }]}>传输方式</Text>
                <View style={styles.transportRow}>
                  <Pressable
                    onPress={() => setEditing((p) => p ? { ...p, transport: "stdio" } : p)}
                    style={[
                      styles.transportChip,
                      {
                        backgroundColor: editing.transport === "stdio" ? theme.accent : theme.surface,
                        borderColor: editing.transport === "stdio" ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Terminal color={editing.transport === "stdio" ? "#FFF" : theme.ink} size={14} />
                    <Text style={{ color: editing.transport === "stdio" ? "#FFF" : theme.ink, fontSize: 13, fontWeight: "700" }}>
                      stdio
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEditing((p) => p ? { ...p, transport: "sse" } : p)}
                    style={[
                      styles.transportChip,
                      {
                        backgroundColor: editing.transport === "sse" ? theme.blue : theme.surface,
                        borderColor: editing.transport === "sse" ? theme.blue : theme.border,
                      },
                    ]}
                  >
                    <Globe color={editing.transport === "sse" ? "#FFF" : theme.ink} size={14} />
                    <Text style={{ color: editing.transport === "sse" ? "#FFF" : theme.ink, fontSize: 13, fontWeight: "700" }}>
                      sse
                    </Text>
                  </Pressable>
                </View>

                {editing.transport === "stdio" ? (
                  <>
                    <Text style={[styles.label, { color: theme.muted }]}>启动命令</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(command) => setEditing((p) => p ? { ...p, command } : p)}
                      placeholder="npx"
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                      value={editing.command}
                    />
                    <Text style={[styles.label, { color: theme.muted }]}>启动参数（JSON 数组格式）</Text>
                    <TextInput
                      autoCapitalize="none"
                      multiline
                      numberOfLines={4}
                      onChangeText={(args) => setEditing((p) => p ? { ...p, args } : p)}
                      placeholder='["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]'
                      placeholderTextColor={theme.muted}
                      style={[styles.input, styles.multiline, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink, fontFamily: "monospace" }]}
                      value={editing.args}
                    />
                    <Text style={[styles.label, { color: theme.muted }]}>环境变量（JSON 对象格式）</Text>
                    <TextInput
                      autoCapitalize="none"
                      multiline
                      numberOfLines={4}
                      onChangeText={(env) => setEditing((p) => p ? { ...p, env } : p)}
                      placeholder='{"NODE_ENV": "production", "API_KEY": "xxx"}'
                      placeholderTextColor={theme.muted}
                      style={[styles.input, styles.multiline, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink, fontFamily: "monospace" }]}
                      value={editing.env}
                    />
                  </>
                ) : (
                  <>
                    <Text style={[styles.label, { color: theme.muted }]}>服务 URL</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(url) => setEditing((p) => p ? { ...p, url } : p)}
                      placeholder="https://mcp.example.com/sse"
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                      value={editing.url}
                    />
                  </>
                )}

                <View style={styles.editActions}>
                  <Pressable onPress={saveServer} style={[styles.actionBtn, { backgroundColor: theme.accent }]}>
                    <Check color="#FFF" size={16} />
                    <Text style={styles.actionBtnText}>确定</Text>
                  </Pressable>
                  <Pressable onPress={cancelEdit} style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
                    <X color={theme.ink} size={16} />
                    <Text style={[styles.actionBtnText, { color: theme.ink }]}>取消</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {form.mcpServers.map((server) => {
            const isExpanded = expandedId === server.id;
            const status = mcpStatuses[server.id];
            const color = statusColor(status);
            return (
              <View key={server.id}>
                {/* 摘要行 */}
                <View style={[styles.row, { borderColor: theme.border }]}>
                  <Pressable
                    onPress={() => (isExpanded ? cancelEdit() : startEdit(server))}
                    style={styles.rowPressable}
                  >
                    <View style={styles.rowIcon}>
                      {server.transport === "stdio" ? (
                        <Terminal color={theme.accent} size={18} />
                      ) : (
                        <Globe color={theme.blue} size={18} />
                      )}
                    </View>
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowName, { color: theme.ink }]}>
                        {server.name || "未命名"}
                      </Text>
                      <Text style={[styles.rowDetail, { color: theme.muted }]} numberOfLines={1}>
                        {server.transport === "stdio"
                          ? `${server.command} ${server.args}`.trim() || "stdio"
                          : server.url || "sse"}
                      </Text>
                    </View>
                    {/* 连接状态指示点 */}
                    <View style={[styles.statusDot, { backgroundColor: color }]} />
                    {isExpanded ? (
                      <ChevronUp color={theme.muted} size={16} />
                    ) : (
                      <ChevronDown color={theme.muted} size={16} />
                    )}
                  </Pressable>
                </View>

                {/* 展开编辑 */}
                {isExpanded && editing && (
                  <View style={[styles.editPanel, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                    {/* 名称 */}
                    <Text style={[styles.label, { color: theme.muted }]}>服务名称</Text>
                    <TextInput
                      autoCapitalize="none"
                      onChangeText={(name) => setEditing((p) => p ? { ...p, name } : p)}
                      placeholder="如 filesystem、web-search"
                      placeholderTextColor={theme.muted}
                      style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                      value={editing.name}
                    />

                    {/* 传输方式 */}
                    <Text style={[styles.label, { color: theme.muted }]}>传输方式</Text>
                    <View style={styles.transportRow}>
                      <Pressable
                        onPress={() => setEditing((p) => p ? { ...p, transport: "stdio" } : p)}
                        style={[
                          styles.transportChip,
                          {
                            backgroundColor: editing.transport === "stdio" ? theme.accent : theme.surface,
                            borderColor: editing.transport === "stdio" ? theme.accent : theme.border,
                          },
                        ]}
                      >
                        <Terminal color={editing.transport === "stdio" ? "#FFF" : theme.ink} size={14} />
                        <Text style={{ color: editing.transport === "stdio" ? "#FFF" : theme.ink, fontSize: 13, fontWeight: "700" }}>
                          stdio
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setEditing((p) => p ? { ...p, transport: "sse" } : p)}
                        style={[
                          styles.transportChip,
                          {
                            backgroundColor: editing.transport === "sse" ? theme.blue : theme.surface,
                            borderColor: editing.transport === "sse" ? theme.blue : theme.border,
                          },
                        ]}
                      >
                        <Globe color={editing.transport === "sse" ? "#FFF" : theme.ink} size={14} />
                        <Text style={{ color: editing.transport === "sse" ? "#FFF" : theme.ink, fontSize: 13, fontWeight: "700" }}>
                          sse
                        </Text>
                      </Pressable>
                    </View>

                    {editing.transport === "stdio" ? (
                      <>
                        <Text style={[styles.label, { color: theme.muted }]}>启动命令</Text>
                        <TextInput
                          autoCapitalize="none"
                          onChangeText={(command) => setEditing((p) => p ? { ...p, command } : p)}
                          placeholder="npx"
                          placeholderTextColor={theme.muted}
                          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                          value={editing.command}
                        />
                        <Text style={[styles.label, { color: theme.muted }]}>启动参数</Text>
                        <TextInput
                          autoCapitalize="none"
                          onChangeText={(args) => setEditing((p) => p ? { ...p, args } : p)}
                          placeholder="&#8209;y @modelcontextprotocol/server-filesystem /tmp"
                          placeholderTextColor={theme.muted}
                          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                          value={editing.args}
                        />
                        <Text style={[styles.label, { color: theme.muted }]}>环境变量（每行一个 KEY=VALUE）</Text>
                        <TextInput
                          autoCapitalize="none"
                          multiline
                          numberOfLines={3}
                          onChangeText={(env) => setEditing((p) => p ? { ...p, env } : p)}
                          placeholder="NODE_ENV=production"
                          placeholderTextColor={theme.muted}
                          style={[styles.input, styles.multiline, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                          value={editing.env}
                        />
                      </>
                    ) : (
                      <>
                        <Text style={[styles.label, { color: theme.muted }]}>服务 URL</Text>
                        <TextInput
                          autoCapitalize="none"
                          onChangeText={(url) => setEditing((p) => p ? { ...p, url } : p)}
                          placeholder="https://mcp.example.com/sse"
                          placeholderTextColor={theme.muted}
                          style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.ink }]}
                          value={editing.url}
                        />
                      </>
                    )}

                    {/* 操作按钮 */}
                    <View style={styles.editActions}>
                      <Pressable onPress={saveServer} style={[styles.actionBtn, { backgroundColor: theme.accent }]}>
                        <Check color="#FFF" size={16} />
                        <Text style={styles.actionBtnText}>确定</Text>
                      </Pressable>
                      {/* 测试连接按钮 */}
                      <Pressable
                        onPress={() => testOne(editing)}
                        style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}
                      >
                        {testingId === server.id ? (
                          <ActivityIndicator color={theme.ink} size="small" />
                        ) : (
                          <Plug color={theme.ink} size={14} />
                        )}
                        <Text style={[styles.actionBtnText, { color: theme.ink }]}>测试</Text>
                      </Pressable>
                      <Pressable onPress={cancelEdit} style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
                        <X color={theme.ink} size={16} />
                        <Text style={[styles.actionBtnText, { color: theme.ink }]}>取消</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteServer(server.id)} style={[styles.actionBtn, { backgroundColor: theme.coral }]}>
                        <Trash2 color="#FFF" size={14} />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* 保存 */}
        <Pressable
          onPress={save}
          style={[styles.saveBtn, { backgroundColor: theme.accent }]}
        >
          <Text style={styles.saveBtnText}>
            {isSaving ? "保存中..." : "保存 MCP 设置"}
          </Text>
        </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: "center", borderRadius: 8, flexDirection: "row",
    gap: 6, paddingHorizontal: 14, paddingVertical: 10,
  },
  actionBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  addBtn: {
    alignItems: "center", borderRadius: 8, flexDirection: "row",
    gap: 5, paddingHorizontal: 12, paddingVertical: 8,
  },
  addBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  backBtn: {
    alignItems: "center", borderRadius: 8, borderWidth: 1,
    height: 42, justifyContent: "center", width: 42,
  },
  content: { gap: 16, padding: 14, paddingBottom: 40 },
  editActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  editPanel: {
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    borderWidth: 1, borderTopWidth: 0, marginTop: -2, padding: 14,
  },
  emptyHint: { fontSize: 13, padding: 20, textAlign: "center" },
  header: {
    alignItems: "center", borderBottomWidth: 1,
    flexDirection: "row", gap: 14, padding: 14,
  },
  headerText: { flex: 1 },
  input: {
    borderRadius: 8, borderWidth: 1, fontSize: 14,
    marginBottom: 12, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10,
  },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 6 },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  row: {
    alignItems: "center", borderBottomWidth: 1, flexDirection: "row",
  },
  rowDetail: { fontSize: 12, marginTop: 2 },
  rowIcon: { marginRight: 12 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: "700" },
  rowPressable: {
    alignItems: "center", flex: 1, flexDirection: "row",
    gap: 8, paddingHorizontal: 14, paddingVertical: 12,
  },
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  saveBtn: {
    alignItems: "center", borderRadius: 10, paddingVertical: 14,
  },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  screen: { flex: 1 },
  section: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  sectionHeader: {
    alignItems: "center", borderBottomWidth: 1, borderColor: "transparent",
    flexDirection: "row", justifyContent: "space-between",
    padding: 14, paddingBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "900" },
  subtitle: { fontSize: 13, marginTop: 3 },
  title: { fontSize: 26, fontWeight: "900" },
  transportChip: {
    alignItems: "center", borderRadius: 8, borderWidth: 1,
    flex: 1, flexDirection: "row", gap: 6,
    justifyContent: "center", paddingVertical: 10,
  },
  transportRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
});
