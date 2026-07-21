import { describe, expect, it } from "vitest";
import { parseInstagramWebhook } from "./instagram.js";

describe("parseInstagramWebhook", () => {
  it("extracts inbound text messages and ignores echoes or attachments", () => {
    const messages = parseInstagramWebhook({
      object: "instagram",
      entry: [
        {
          id: "ig-business-1",
          messaging: [
            {
              sender: { id: "ig-user-1" },
              recipient: { id: "ig-business-1" },
              message: { mid: "mid.1", text: "Do you have eggless cake?" },
            },
            {
              sender: { id: "ig-business-1" },
              recipient: { id: "ig-user-1" },
              message: { mid: "mid.echo", text: "Automated reply", is_echo: true },
            },
            {
              sender: { id: "ig-user-2" },
              recipient: { id: "ig-business-1" },
              message: { mid: "mid.attachment", attachments: [{ type: "image" }] },
            },
          ],
        },
      ],
    });

    expect(messages).toEqual([
      {
        accountId: "ig-business-1",
        senderId: "ig-user-1",
        messageId: "mid.1",
        text: "Do you have eggless cake?",
      },
    ]);
  });

  it("rejects unrelated webhook objects", () => {
    expect(parseInstagramWebhook({ object: "page", entry: [] })).toEqual([]);
  });
});
