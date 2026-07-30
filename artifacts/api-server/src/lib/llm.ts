import { logger } from "./logger.js";

export type LlmMessageInput = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callLlm(
  messages: LlmMessageInput[],
  temperature = 0.3,
): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (geminiKey) {
    try {
      const systemMessage = messages.find((m) => m.role === "system")?.content;
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      const body: any = {
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
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        logger.warn({ status: res.status, error: errText }, "Gemini API call failed");
        return null;
      }

      const data = await res.json() as any;
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return reply?.trim() || null;
    } catch (error) {
      logger.warn({ error }, "Error calling Gemini API");
      return null;
    }
  }

  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature,
          max_tokens: 1000,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        logger.warn({ status: res.status, error: errText }, "OpenAI API call failed");
        return null;
      }

      const data = await res.json() as any;
      const reply = data.choices?.[0]?.message?.content;
      return reply?.trim() || null;
    } catch (error) {
      logger.warn({ error }, "Error calling OpenAI API");
      return null;
    }
  }

  return null;
}
