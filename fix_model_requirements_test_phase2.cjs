const fs = require('fs');
let content = fs.readFileSync('src/shared/model-requirements.test.ts', 'utf8');

// 1. Librarian: Expect "anthropic" instead of "zai-coding-plan" (Done but maybe failed regex?)
// The error says: Expected: "zai-coding-plan", Received: "anthropic".
// This means the test STILL expects "zai-coding-plan".
// My previous regex replacement failed or didn't match exactly.

content = content.replace(
  /expect\(primary\.providers\[0\]\)\.toBe\("zai-coding-plan"\)/g,
  'expect(primary.providers[0]).toBe("anthropic")'
);

// 2. Explore: Expect "anthropic" instead of "github-copilot"
// Error: Expected "github-copilot", Received "anthropic".
content = content.replace(
  /expect\(primary\.providers\)\.toContain\("github-copilot"\)/g,
  'expect(primary.providers).toContain("anthropic")'
);

// 3. Atlas: Expect "anthropic" instead of "kimi-for-coding"
// Error: Expected "kimi-for-coding", Received "anthropic".
content = content.replace(
  /expect\(primary\.providers\[0\]\)\.toBe\("kimi-for-coding"\)/g,
  'expect(primary.providers[0]).toBe("anthropic")'
);

// 4. Ultrabrain / Deep / RequiresModel: Expect "gpt-5.2" instead of "gpt-5.2-codex"?
// Wait, I updated  in code to use .
// But the error says: Expected "gpt-5.2-codex", Received "gpt-5.2".
// This means the CODE has "gpt-5.2" but test expects "gpt-5.2-codex".
// Let's check  again.

// I wrote  for  agent.
// But for , I might have written  in some places?
// In Step 49, I wrote:
//   ultrabrain: ... model: "gpt-5.2-codex"
//   deep: ... model: "gpt-5.2-codex"
//   deep requiresModel: "gpt-5.2-codex"
//   "unspecified-low": ... model: "gpt-5.2-codex"
//   "unspecified-high": ... model: "gpt-5.2"
//   writing: ... model: "gpt-5.2"

// If the test receives "gpt-5.2", it means the  file has "gpt-5.2".
// Did I revert to  in ?
// Yes! In Step 48, I wrote  fallback chain:
// { providers: ... model: "gpt-5.2", variant: "high" }, // Primary
// { providers: ... model: "gpt-5.2-codex", variant: "medium" }, // Fallback

// But ?
// In Step 49, I updated  AGAIN.
// But I might have copied the OLD  block that used ?
// Let's inspect .

// I'll skip editing the test for a moment and check the source code.
