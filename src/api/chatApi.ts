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
//   当 settings.stream = true 且调用方提供 onDelta 时，
//   使用 react-native-sse 监听 SSE 事件并逐段回调。
// ============================================================

import EventSource from "react-native-sse";

import { AppSettings, ChatMessage } from "../types";

// ----------------------------------------------------------
// 内部类型定义（不导出，只在这个文件内使用）
// ----------------------------------------------------------

/** 请求时需要的设置子集（兼容 AppSettings 的旧字段和新字段） */
type RequestSettings = {
  baseUrl: string;
  apiToken: string;
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
};

type CompletionOptions = {
  settings: RequestSettings;
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

function buildRequestBody(settings: RequestSettings, messages: ChatMessage[]) {
  return JSON.stringify({
    model: settings.model.trim(),
    messages: toOpenAiMessages(messages),
    temperature: settings.temperature,
    max_tokens: settings.maxTokens,
    stream: settings.stream,
  });
}

function createAbortError() {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function streamAssistantReply({
  settings,
  messages,
  signal,
  onDelta,
}: CompletionOptions) {
  const endpoint = makeChatEndpoint(settings.baseUrl);
  const body = buildRequestBody(settings, messages);
  const abortError = createAbortError();

  let fullText = "";
  let settled = false;
  let es: EventSource | null = null;
  let resolveReply: (value: string) => void = () => {};
  let rejectReply: (reason?: unknown) => void = () => {};

  const cleanup = () => {
    es?.removeAllEventListeners();
    es?.close();
    es = null;
  };

  const finish = (value: string) => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveReply(value);
  };

  const fail = (error: Error) => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectReply(error);
  };

  const reply = new Promise<string>((resolve, reject) => {
    resolveReply = resolve;
    rejectReply = reject;

    if (signal?.aborted) {
      fail(abortError);
      return;
    }

    try {
      es = new EventSource(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.apiToken.trim()}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
        body,
        pollingInterval: 0,
        timeout: 0,
        timeoutBeforeConnection: 0,
      });
    } catch (error: any) {
      fail(error instanceof Error ? error : new Error(error?.message ?? "SSE 初始化失败。"));
      return;
    }

    const handleMessage = (event: any) => {
      if (settled) return;

      const raw = typeof event?.data === "string" ? event.data.trim() : "";
      if (!raw) return;
      if (raw === "[DONE]") {
        finish(fullText);
        return;
      }

      try {
        const payload = JSON.parse(raw);
        const delta = readContentFromJson(payload);
        if (delta) {
          fullText += delta;
          onDelta?.(delta);
        }
      } catch {
        // 忽略非 JSON 数据，避免少量厂商附加事件打断整条回复。
      }
    };

    const handleError = (event: any) => {
      if (settled) return;

      if (signal?.aborted) {
        fail(abortError);
        return;
      }

      if (event?.type === "timeout") {
        fail(new Error("SSE 连接超时。"));
        return;
      }

      if (event?.type === "exception" && event?.error instanceof Error) {
        fail(event.error);
        return;
      }

      const message =
        typeof event?.message === "string" && event.message.trim()
          ? event.message.trim()
          : "SSE 连接发生错误。";
      fail(new Error(message));
    };

    const handleClose = () => {
      if (!settled) {
        finish(fullText);
      }
    };

    es.addEventListener("message", handleMessage);
    es.addEventListener("error", handleError);
    es.addEventListener("close", handleClose);

    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          fail(createAbortError());
        },
        { once: true }
      );
    }
  });

  return reply;
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

  if (settings.stream && onDelta) {
    return streamAssistantReply({ settings, messages, signal, onDelta });
  }

  let response: Response;
  try {
    response = await fetch(makeChatEndpoint(settings.baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiToken.trim()}`,
        "Content-Type": "application/json",
      },
      body: buildRequestBody(settings, messages),
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

  // 非流式输出：直接解析 JSON
  const payload = await response.json();
  return readContentFromJson(payload);
}