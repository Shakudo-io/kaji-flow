import { describe, expect, test } from "bun:test"

import { hasPartOrigin } from "./message-origin"

describe("hasPartOrigin", () => {
  test("returns true when a part matches origin", () => {
    // #given
    const parts = [
      { metadata: { origin: "background-notification" } },
      { metadata: { origin: "user" } },
    ]

    // #when
    const result = hasPartOrigin(parts, "background-notification")

    // #then
    expect(result).toBe(true)
  })

  test("returns false when no part matches origin", () => {
    // #given
    const parts = [{ metadata: { origin: "user" } }, {}]

    // #when
    const result = hasPartOrigin(parts, "background-notification")

    // #then
    expect(result).toBe(false)
  })
})
