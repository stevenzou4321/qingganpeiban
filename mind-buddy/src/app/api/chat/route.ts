import { NextRequest } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.KIMI_API_KEY,
  baseURL: "https://api.moonshot.cn/v1",
});

export async function POST(req: NextRequest) {
  const { messages, systemPrompt } = await req.json();

  // Filter out empty assistant messages
  const cleanMessages = messages.filter(
    (m: { role: string; content: string }) => m.content.trim() !== ""
  );

  try {
    const stream = await client.chat.completions.create({
      model: "moonshot-v1-8k",
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...cleanMessages.map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: "\n\n[网络异常，请稍后重试]" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "API 调用失败" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
