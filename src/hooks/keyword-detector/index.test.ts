import { describe, expect, test } from "bun:test"

import { createKeywordDetectorHook } from "./index"

describe("keyword-detector hook", () => {
  function createMockInput() {
    const toastCalls: Array<{ title: string; message: string }> = []

    const ctx = {
      client: {
        tui: {
          showToast: async (opts: any) => {
            toastCalls.push({
              title: opts.body.title,
              message: opts.body.message,
            })
            return {}
          },
        },
      },
    } as any

    return { ctx, toastCalls }
  }

  test("skips keyword detection for background notifications", async () => {
    // #given
    const { ctx, toastCalls } = createMockInput()
    const hook = createKeywordDetectorHook(ctx)
    const output = {
      message: {} as Record<string, unknown>,
      parts: [
        {
          type: "text",
          text: "ultrawork",
          metadata: { origin: "background-notification" },
        },
      ],
    }

    // #when
    await hook["chat.message"](
      { sessionID: "ses-1", agent: "sisyphus" },
      output,
    )

    // #then
    expect(output.message.variant).toBeUndefined()
    expect(toastCalls).toHaveLength(0)
  })

  test("applies ultrawork behavior for regular user messages", async () => {
    // #given
    const { ctx, toastCalls } = createMockInput()
    const hook = createKeywordDetectorHook(ctx)
    const output = {
      message: {} as Record<string, unknown>,
      parts: [{ type: "text", text: "ultrawork" }],
    }

    // #when
    await hook["chat.message"](
      { sessionID: "ses-2", agent: "sisyphus" },
      output,
    )

    // #then
    expect(output.message.variant).toBe("max")
    expect(toastCalls).toHaveLength(1)
  })
})
