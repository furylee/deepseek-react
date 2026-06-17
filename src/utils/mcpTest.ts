// ============================================================
// mcpTest — MCP 服务连接测试工具
// ------------------------------------------------------------
// 由于 React Native 无法启动子进程，stdio 模式无法测试。
// sse 模式通过 fetch HEAD 请求来检测服务是否可达。
// ============================================================

import { McpServer } from "../types";

/** MCP 连接状态 */
export type McpStatus = "unknown" | "online" | "offline";

/** { [serverId]: status } */
export type McpStatusMap = Record<string, McpStatus>;

/**
 * testMcpConnection — 测试单个 MCP 服务的连接状态。
 *
 * - sse：HEAD 请求目标 URL，2xx 返回 online，否则 offline
 * - stdio：无法在 React Native 中测试，返回 unknown
 *
 * 超时时间 5 秒，超时视为 offline。
 */
export async function testMcpConnection(server: McpServer): Promise<McpStatus> {
  // stdio 模式在手机上无法验证（无 child_process），跳过
  if (server.transport === "stdio") {
    return "unknown";
  }

  // sse 模式：尝试 HEAD/GET 请求
  const url = server.url.trim();
  if (!url) {
    return "offline";
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

/**
 * testAllMcpConnections — 批量测试所有 MCP 服务的连接状态。
 *
 * 并发执行，每个服务独立测试，互不影响。
 * 返回 Map：{ [serverId]: "online" | "offline" | "unknown" }
 */
export async function testAllMcpConnections(
  servers: McpServer[]
): Promise<McpStatusMap> {
  if (servers.length === 0) return {};

  const results = await Promise.all(
    servers.map(async (server) => {
      const status = await testMcpConnection(server);
      return { id: server.id, status };
    })
  );

  const map: McpStatusMap = {};
  for (const { id, status } of results) {
    map[id] = status;
  }
  return map;
}
