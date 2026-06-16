// ============================================================
// chatApi — OpenAI-compatible API 请求逻辑
// ------------------------------------------------------------
// 这个文件是整个 App 最核心的模块之一。
// 它负责向 DeepSeek（或任何兼容的 OpenAI 格式 API）发送请求。
//
// 兼容性说明：
//   只要你的 API 服务兼容 OpenAI 的 /chat/completions 格式，
//   就可以直接使用。包括但不限于：
//     - DeepSeek 官方 API
//     - 各种中转/代理服务
//     - 自建的 vLLM / Ollama 等兼容服务
//
// 流式输出（SSE）：
//   当 settings.stream = true 时，会尝试以流式方式读取回复。
//   由于 React Native 各运行环境对 fetch stream 的支持不一致，
//   代码做了降级处理：
//     - 有 getReader() → 边读边显示（真流式）
//     - 没有 getReader() → 等全部响应返回再解析（伪流式）
// ============================================================

import { AppSettings, ChatMessage } from "../types";

// ----------------------------------------------------------
// 内部类型定义（不导出，只在这个文件内使用）
// ----------------------------------------------------------

type CompletionOptions = {
  settings: AppSettings;
  messages: ChatMessage[];
  /** 用于取消请求的 AbortSignal */
  signal?: AbortSignal;
  /** 流式输出时，每收到一段文本就调用一次 */
  onDelta?: (delta: string) => void;
};

type OpenAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type StreamReader = {
  read: () => Promise<{ done: boolean; value?: Uint8Array }>;
};

type TextDecoderLike = {
  decode: (input?: Uint8Array, options?: { stream?: boolean }) => string;
};

type TextDecoderConstructor = new (label?: string) => TextDecoderLike;

// ----------------------------------------------------------
// 工具函数
// ----------------------------------------------------------

/**
 * makeChatEndpoint — 构造完整的 API 请求地址。
 *
 * 逻辑：
 *   如果用户填的地址已经以 /chat/completions 结尾，直接使用；
 *   否则在末尾拼接 /chat/completions。
 *
 * 这样用户既可以填 https://api.deepseek.com/v1
 * 也可以填 https://api.deepseek.com/v1/chat/completions
 */
function makeChatEndpoint(baseUrl: string) {
  const clean = baseUrl.trim().replace(/\/+$/, "");
  if (clean.endsWith("/chat/completions")) {
    return clean;
  }
  return `${clean}/chat/completions`;
}

/**
 * toOpenAiMessages — 把内部消息格式转换为 OpenAI API 格式。
 *
 * 会过滤掉 isError = true 的消息（错误消息不应发送给 API），
 * 并只保留 role 和 content 字段。
 */
function toOpenAiMessages(messages: ChatMessage[]): OpenAiMessage[] {
  return messages
    .filter((message) => !message.isError)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

/**
 * readContentFromJson — 从 OpenAI API 的 JSON 响应中提取文本内容。
 *
 * 同时兼容：
 *   - 非流式响应：choices[0].message.content
 *   - 流式响应：choices[0].delta.content
 */
function readContentFromJson(payload: any) {
  const choice = payload?.choices?.[0];
  return choice?.message?.content ?? choice?.delta?.content ?? "";
}

/**
 * parseSseLine — 解析单行 SSE（Server-Sent Events）数据。
 *
 * SSE 格式：
 *   data: {"choices":[{"delta":{"content":"你好"}}]}
 *   data: [DONE]
 *
 * 返回该行包含的新文本（如果行不包含内容则返回空字符串）。
 */
function parseSseLine(line: string) {
  if (!line.startsWith("data:")) return "";
  const value = line.replace(/^data:\s*/, "");
  if (value === "[DONE]") return "";
  try {
    return readContentFromJson(JSON.parse(value));
  } catch {
    return "";
  }
}

/**
 * readStreamingResponse — 以流式方式读取 API 响应。
 *
 * 这是流式输出的核心函数。
 *
 * 兼容策略：
 *   1. 如果 response.body 支持 getReader()，按行读取 SSE 数据，
 *      每解析出一段文本就调用 onDelta 回调。
 *   2. 如果不支持（部分旧版 React Native 环境），
 *      等待整个响应结束后一次性解析所有 SSE 行。
 *   3. TextDecoder 不存在时用 String.fromCharCode 兜底。
 *   4. 流读取过程中网络断开时，返回已收到的内容而不崩溃。
 */
async function readStreamingResponse(
  response: Response,
  onDelta: (delta: string) => void
) {
  // 安全获取 reader，部分 RN 环境可能抛出而非返回 null
  let reader: StreamReader | undefined;
  try {
    reader = (
      response.body as { getReader?: () => StreamReader } | null
    )?.getReader?.();
  } catch {
    // 获取 reader 失败，走回退路径
  }

  // 路径 A：不支持流式读取，等全部返回后再解析
  if (!reader) {
    const text = await response.text();
    return text
      .split("\n")
      .map(parseSseLine)
      .join("");
  }

  // 路径 A：不支持流式读取，等全部返回后再解析
  if (!reader) {
    const text = await response.text();
    return text
      .split("\n")
      .map(parseSseLine)
      .join("");
  }

  // 路径 B：真流式读取
  // 注意：TextDecoder 在这里手动获取，不在全局声明，避免和 DOM 类型冲突。
  // TextDecoder 可能在部分 React Native 环境不存在（如旧版 Hermes），做安全兜底。
  let decoder: TextDecoderLike | null = null;
  try {
    const TextDecoderCtor = (
      globalThis as unknown as { TextDecoder?: TextDecoderConstructor }
    ).TextDecoder;
    if (TextDecoderCtor) {
      decoder = new TextDecoderCtor("utf-8");
    }
  } catch {
    // TextDecoder 不可用，回退到手动字符串拼接
  }

  let fullText = "";
  let buffer = "";

  while (true) {
    let done = false;
    let value: Uint8Array | undefined;
    try {
      const result = await reader.read();
      done = result.done;
      value = result.value;
    } catch (readError) {
      // 流读取中断（网络断开等），返回已经收到的内容
      break;
    }
    if (done) break;

    // 逐块解码：优先 TextDecoder，否则用 String.fromCharCode 兜底
    const chunk = decoder
      ? decoder.decode(value, { stream: true })
      : String.fromCharCode(...(value ?? new Uint8Array()));
    buffer += chunk;

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // 最后一行可能不完整，保留到下次循环

    for (const line of lines) {
      const delta = parseSseLine(line.trim());
      if (delta) {
        fullText += delta;
        onDelta(delta);
      }
    }
  }

  return fullText;
}

// ----------------------------------------------------------
// 导出函数
// ----------------------------------------------------------

/**
 * requestAssistantReply — 向 API 发送聊天请求并获取 AI 回复。
 *
 * 使用方式：
 *   const reply = await requestAssistantReply({
 *     settings,           // App 设置（包含 baseUrl、apiToken、model 等）
 *     messages,           // 当前会话的消息列表
 *     signal,             // AbortSignal，用于取消请求
 *     onDelta: (delta) => { ... }  // 流式输出回调
 *   });
 *
 * 错误处理：
 *   - API Token 为空 → 抛出 "请先在设置里填写 API Token。"
 *   - HTTP 状态码非 200 → 抛出服务端返回的错误信息
 *   - 网络错误 → 抛出底层异常（在 ChatScreen 中捕获）
 */
export async function requestAssistantReply({
  settings,
  messages,
  signal,
  onDelta,
}: CompletionOptions) {
  // 没有 API Token 直接报错，让用户去设置
  if (!settings.apiToken.trim()) {
    throw new Error("请先在设置里填写 API Token。");
  }

  let response: Response;
  try {
    response = await fetch(makeChatEndpoint(settings.baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model.trim(),
        messages: toOpenAiMessages(messages),
        temperature: settings.temperature,
        max_tokens: settings.maxTokens,
        stream: settings.stream,
      }),
      signal,
    });
  } catch (fetchError: any) {
    // 网络层面的错误（断网、DNS 失败、TLS 错误等），给用户友好提示
    const message = fetchError?.message ?? "";
    if (message.includes("Abort") || fetchError?.name === "AbortError") {
      throw fetchError; // 用户取消的，原样抛出让 ChatScreen 处理
    }
    throw new Error(
      `无法连接到 API 服务器。\n请检查：\n1. 手机是否联网\n2. Base URL 是否正确\n\n${message}`
    );
  }

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      // 读取失败也不影响后续流程
    }
    throw new Error(errorBody || `请求失败，HTTP 状态码：${response.status}`);
  }

  // 流式输出：启用 SSE 并且调用方提供了 onDelta 回调
  if (settings.stream && onDelta) {
    return readStreamingResponse(response, onDelta);
  }

  // 非流式输出：直接解析 JSON
  const payload = await response.json();
  return readContentFromJson(payload);
}
