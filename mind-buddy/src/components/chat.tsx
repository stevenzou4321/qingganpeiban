"use client";

import { useState, useRef, useEffect } from "react";
import { Message, Memory } from "@/lib/types";
import {
  loadMessages,
  saveMessages,
  loadMemories,
  addMemory,
  addEmotion,
} from "@/lib/storage";
import { buildSystemPrompt } from "@/lib/prompt";

function parseMeta(text: string) {
  const match = text.match(/<!--meta\s*([\s\S]*?)\s*meta-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function stripMeta(text: string) {
  return text
    .replace(/<!--meta[\s\S]*?meta-->/, "")
    .replace(/<!--meta[\s\S]*$/, "")
    .trim();
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(loadMessages());
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsStreaming(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const memories: Memory[] = loadMemories();
    const systemPrompt = buildSystemPrompt(memories);

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    const withAssistant = [...updated, assistantMsg];
    setMessages(withAssistant);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          for (const line of parts) {
            const trimmed = line.trim();
            if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
              try {
                const { text } = JSON.parse(trimmed.slice(6));
                fullText += text;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = {
                    ...copy[copy.length - 1],
                    content: stripMeta(fullText),
                  };
                  return copy;
                });
              } catch {}
            }
          }
        }
      }

      // Process metadata
      const meta = parseMeta(fullText);
      if (meta) {
        if (meta.memories_to_save?.length) {
          for (const mem of meta.memories_to_save) {
            addMemory({
              type: mem.type,
              content: mem.content,
              created_at: Date.now(),
            });
          }
        }
        if (meta.emotion) {
          const today = new Date().toISOString().split("T")[0];
          addEmotion({
            date: today,
            emotion: meta.emotion,
            score: meta.emotion_score || 3,
            event: meta.memories_to_save?.[0]?.content,
          });
        }
      }

      // Save final messages
      const finalMessages = [...updated, {
        ...assistantMsg,
        content: stripMeta(fullText),
        emotion: meta?.emotion,
      }];
      setMessages(finalMessages);
      saveMessages(finalMessages);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          content: "抱歉，出了点问题，请稍后再试。",
        };
        return copy;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl">🌿</span>
            <p style={{ color: "var(--text-secondary)" }} className="text-lg">
              有什么想聊的吗？
            </p>
            <p style={{ color: "var(--text-muted)" }} className="text-sm">
              不管是焦虑、迷茫还是单纯想说说话，我都在
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
              }`}
              style={{
                background:
                  msg.role === "user"
                    ? "var(--user-bubble)"
                    : "var(--ai-bubble)",
                color:
                  msg.role === "user"
                    ? "var(--user-bubble-text)"
                    : "var(--ai-bubble-text)",
              }}
            >
              {msg.content || (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce">·</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>·</span>
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="sticky bottom-0 border-t px-4 py-3"
        style={{
          background: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl border px-3 py-2"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="说说你的感受..."
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-relaxed"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
            style={{ background: "var(--accent)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
