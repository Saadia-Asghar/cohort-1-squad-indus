import { logger } from "./logger.js";

export type LlmMessageInput = {
  role: "system" | "user" | "assistant";
  content: string;
};

async function callOpenAiCompatibleChat(input: {
  url: string;
  apiKey: string;
  model: string;
  messages: LlmMessageInput[];
  temperature: number;
  provider: string;
}): Promise<string | null> {
  try {
    const res = await fetch(input.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logger.warn({ status: res.status, error: errText, provider: input.provider }, "LLM API call failed");
      return null;
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const reply = data.choices?.[0]?.message?.content;
    return reply?.trim() || null;
  } catch (error) {
    logger.warn({ error, provider: input.provider }, "Error calling LLM API");
    return null;
  }
}

export async function callLlm(
  messages: LlmMessageInput[],
  temperature = 0.3,
): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (groqKey) {
    const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
    const reply = await callOpenAiCompatibleChat({
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqKey,
      model,
      messages,
      temperature,
      provider: "groq",
    });
    if (reply) return reply;
  }

  if (geminiKey) {
    try {
      const systemMessage = messages.find((m) => m.role === "system")?.content;
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const body: Record<string, unknown> = {
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: 1000,
        },
      };

      if (systemMessage) {
        body.systemInstruction = {
          parts: [{ text: systemMessage }],
        };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        logger.warn({ status: res.status, error: errText }, "Gemini API call failed");
      } else {
        const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply?.trim()) return reply.trim();
      }
    } catch (error) {
      logger.warn({ error }, "Error calling Gemini API");
    }
  }

  if (openaiKey) {
    return callOpenAiCompatibleChat({
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: openaiKey,
      model: "gpt-4o-mini",
      messages,
      temperature,
      provider: "openai",
    });
  }

  return null;
}
