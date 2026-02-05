#!/usr/bin/env node
/**
 * Node-side LSP proxy.
 *
 * Why?
 * Bun on Windows has had intermittent crashes when spawning + piping LSP servers.
 * By spawning a single Node.js process from Bun and letting Node spawn the actual
 * LSP server, we avoid the problematic Bun spawn path on Windows.
 */

import { spawn } from "node:child_process"

function fatal(message: string, err?: unknown): never {
  const suffix = err instanceof Error ? `\n${err.stack ?? err.message}` : err ? `\n${String(err)}` : ""
  process.stderr.write(`${message}${suffix}\n`)
  process.exit(1)
}

const commandJson = process.env.OH_MY_OPENCODE_LSP_PROXY_COMMAND
if (!commandJson) {
  fatal(
    "Missing env OH_MY_OPENCODE_LSP_PROXY_COMMAND. This script is not meant to be run directly."
  )
}

let command: unknown
try {
  command = JSON.parse(commandJson)
} catch (e) {
  fatal("Failed to parse OH_MY_OPENCODE_LSP_PROXY_COMMAND as JSON", e)
}

if (!Array.isArray(command) || command.length === 0 || !command.every((x) => typeof x === "string")) {
  fatal("OH_MY_OPENCODE_LSP_PROXY_COMMAND must be a JSON array of strings")
}

const [cmd, ...args] = command as string[]
const cwd = process.env.OH_MY_OPENCODE_LSP_PROXY_CWD || process.cwd()

const child = spawn(cmd, args, {
  cwd,
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
  shell: false,
})

child.on("error", (e) => {
  fatal(`Failed to spawn LSP server: ${[cmd, ...args].join(" ")}`, e)
})

// Proxy stdio to behave exactly like the real LSP server.
process.stdin.pipe(child.stdin)
child.stdout.pipe(process.stdout)
child.stderr.pipe(process.stderr)

child.on("exit", (code, signal) => {
  if (signal) {
    process.stderr.write(`LSP server exited with signal ${signal}\n`)
    process.exit(1)
  }
  process.exit(code ?? 1)
})
