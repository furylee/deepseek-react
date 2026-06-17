// ============================================================
// modelsApi — 获取模型列表
// ------------------------------------------------------------
// 调用 OpenAI 兼容的 /models 接口，获取可用模型 ID 列表。
// 用于设置页的模型下拉选择。
// ============================================================

/**
 * fetchModelList — 从 API 服务获取可用模型列表。
 *
 * @param baseUrl - API 基础地址
 * @param apiToken - Bearer Token
 * @returns 模型 ID 列表，失败返回空数组
 */
export async function fetchModelList(
  baseUrl: string,
  apiToken: string
): Promise<string[]> {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  if (!clean || !apiToken.trim()) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${clean}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const payload = await response.json();
    const data = payload?.data ?? [];
    if (!Array.isArray(data)) return [];

    // 提取 id 字段并排序
    return data
      .map((m: any) => m?.id ?? "")
      .filter((id: string) => id.length > 0)
      .sort();
  } catch {
    return [];
  }
}
