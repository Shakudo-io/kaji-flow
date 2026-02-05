import { spawn as bunSpawn, type Subprocess } from "bun"
import { spawn as nodeSpawn, type ChildProcess } from "node:child_process"
import { Readable, Writable } from "node:stream"
import { readFileSync } from "fs"
import { extname, resolve } from "path"
import { pathToFileURL } from "node:url"
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  type MessageConnection,
} from "vscode-jsonrpc/node"
import { getLanguageId } from "./config"
import type { Diagnostic, ResolvedServer } from "./types"
import { log } from "../../shared/logger"
import { getLspSpawnMode, type LspSpawnMode } from "./spawn-mode"

type BunProc = Subprocess<"pipe", "pipe", "pipe">

/**
 * Check if the current Bun version is affected by Windows LSP crash bug.
 * Bun v1.3.5 and earlier have a known segmentation fault issue on Windows
 * when spawning LSP servers. This was addressed in Bun v1.3.6, but some
 * users still report issues on later versions.
 * See: https://github.com/oven-sh/bun/issues/25798
 *
 * @returns Warning info if using Bun spawn on Windows, null otherwise
 */
function checkWindowsBunSpawnWarning(spawnMode: LspSpawnMode): { message: string } | null {
  if (process.platform !== "win32") return null
  if (spawnMode !== "bun") return null

  const version = Bun.version
  const [major, minor, patch] = version.split(".").map((v) => parseInt(v.split("-")[0], 10))

  // Bun v1.3.5 and earlier have known segfault issues
  if (major < 1 || (major === 1 && minor < 3) || (major === 1 && minor === 3 && patch < 6)) {
    return {
      message:
        `⚠️  Windows + Bun v${version} + bun spawn mode: Known segmentation fault risk.\n` +
        `   Upgrade to Bun v1.3.6+ or use Node spawn mode (default on Windows).\n` +
        `   Set OMO_LSP_SPAWN_MODE=node to force Node mode.\n` +
        `   See: https://github.com/oven-sh/bun/issues/25798`,
    }
  }

  // Even on newer versions, warn that Node mode is safer
  return {
    message:
      `⚠️  Windows + Bun spawn mode: Some users report stability issues.\n` +
      `   If LSP crashes, set OMO_LSP_SPAWN_MODE=node (default on Windows).\n` +
      `   See: https://github.com/oven-sh/bun/issues/25798`,
  }
}

interface ManagedClient {
  client: LSPClient
  lastUsedAt: number
  refCount: number
  initPromise?: Promise<void>
  isInitializing: boolean
}

class LSPServerManager {
  private static instance: LSPServerManager
  private clients = new Map<string, ManagedClient>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private readonly IDLE_TIMEOUT = 5 * 60 * 1000

  private constructor() {
    this.startCleanupTimer()
    this.registerProcessCleanup()
  }

  private registerProcessCleanup(): void {
    // Synchronous cleanup for 'exit' event (cannot await)
    const syncCleanup = () => {
      for (const [, managed] of this.clients) {
        try {
          // Fire-and-forget during sync exit - process is terminating
          void managed.client.stop().catch(() => {})
        } catch {}
      }
      this.clients.clear()
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
    }

    // Async cleanup for signal handlers - properly await all stops
    const asyncCleanup = async () => {
      const stopPromises: Promise<void>[] = []
      for (const [, managed] of this.clients) {
        stopPromises.push(managed.client.stop().catch(() => {}))
      }
      await Promise.allSettled(stopPromises)
      this.clients.clear()
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
    }

    process.on("exit", syncCleanup)

    // Don't call process.exit() here - let other handlers complete their cleanup first
    // The background-agent manager handles the final exit call
    // Use async handlers to properly await LSP subprocess cleanup
    process.on("SIGINT", () => void asyncCleanup().catch(() => {}))
    process.on("SIGTERM", () => void asyncCleanup().catch(() => {}))

    if (process.platform === "win32") {
      process.on("SIGBREAK", () => void asyncCleanup().catch(() => {}))
    }
  }

  static getInstance(): LSPServerManager {
    if (!LSPServerManager.instance) {
      LSPServerManager.instance = new LSPServerManager()
    }
    return LSPServerManager.instance
  }

  private getKey(root: string, serverId: string): string {
    return `${root}::${serverId}`
  }

  private startCleanupTimer(): void {
    if (this.cleanupInterval) return
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleClients()
    }, 60000)
  }

  private cleanupIdleClients(): void {
    const now = Date.now()
    for (const [key, managed] of this.clients) {
      if (managed.refCount === 0 && now - managed.lastUsedAt > this.IDLE_TIMEOUT) {
        managed.client.stop()
        this.clients.delete(key)
      }
    }
  }

  async getClient(root: string, server: ResolvedServer): Promise<LSPClient> {
    const key = this.getKey(root, server.id)

    let managed = this.clients.get(key)
    if (managed) {
      if (managed.initPromise) {
        await managed.initPromise
      }
      if (managed.client.isAlive()) {
        managed.refCount++
        managed.lastUsedAt = Date.now()
        return managed.client
      }
      await managed.client.stop()
      this.clients.delete(key)
    }

    const client = new LSPClient(root, server)
    const initPromise = (async () => {
      await client.start()
      await client.initialize()
    })()

    this.clients.set(key, {
      client,
      lastUsedAt: Date.now(),
      refCount: 1,
      initPromise,
      isInitializing: true,
    })

    await initPromise
    const m = this.clients.get(key)
    if (m) {
      m.initPromise = undefined
      m.isInitializing = false
    }

    return client
  }

  warmupClient(root: string, server: ResolvedServer): void {
    const key = this.getKey(root, server.id)
    if (this.clients.has(key)) return

    const client = new LSPClient(root, server)
    const initPromise = (async () => {
      await client.start()
      await client.initialize()
    })()

    this.clients.set(key, {
      client,
      lastUsedAt: Date.now(),
      refCount: 0,
      initPromise,
      isInitializing: true,
    })

    initPromise.then(() => {
      const m = this.clients.get(key)
      if (m) {
        m.initPromise = undefined
        m.isInitializing = false
      }
    })
  }

  releaseClient(root: string, serverId: string): void {
    const key = this.getKey(root, serverId)
    const managed = this.clients.get(key)
    if (managed && managed.refCount > 0) {
      managed.refCount--
      managed.lastUsedAt = Date.now()
    }
  }

  isServerInitializing(root: string, serverId: string): boolean {
    const key = this.getKey(root, serverId)
    const managed = this.clients.get(key)
    return managed?.isInitializing ?? false
  }

  async stopAll(): Promise<void> {
    for (const [, managed] of this.clients) {
      await managed.client.stop()
    }
    this.clients.clear()
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  async cleanupTempDirectoryClients(): Promise<void> {
    const keysToRemove: string[] = []
    for (const [key, managed] of this.clients.entries()) {
      const isTempDir = key.startsWith("/tmp/") || key.startsWith("/var/folders/")
      const isIdle = managed.refCount === 0
      if (isTempDir && isIdle) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      const managed = this.clients.get(key)
      if (managed) {
        this.clients.delete(key)
        try {
          await managed.client.stop()
        } catch {}
      }
    }
  }
}

export const lspManager = LSPServerManager.getInstance()

export class LSPClient {
  private bunProc: BunProc | null = null
  private nodeProc: ChildProcess | null = null
  private spawnMode: LspSpawnMode = "bun"
  private nodeExitedPromise: Promise<number | null> | null = null
  private connection: MessageConnection | null = null
  private openedFiles = new Set<string>()
  private documentVersions = new Map<string, number>()
  private lastSyncedText = new Map<string, string>()
  private stderrBuffer: string[] = []
  private processExited = false
  private diagnosticsStore = new Map<string, Diagnostic[]>()
  private readonly REQUEST_TIMEOUT = 15000

  constructor(
    private root: string,
    private server: ResolvedServer
  ) {}

  async start(): Promise<void> {
    this.spawnMode = getLspSpawnMode()
    
    // Log warning if using Bun spawn on Windows
    const warning = checkWindowsBunSpawnWarning(this.spawnMode)
    if (warning) {
      log(warning.message)
    }

    const env = {
      ...process.env,
      ...this.server.env,
    }

    if (this.spawnMode === "node") {
      await this.startWithNode(env)
    } else {
      await this.startWithBun(env)
    }
  }

  private async startWithBun(env: NodeJS.ProcessEnv): Promise<void> {
    this.bunProc = bunSpawn(this.server.command, {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      cwd: this.root,
      env,
    })

    if (!this.bunProc) {
      throw new Error(`Failed to spawn LSP server: ${this.server.command.join(" ")}`)
    }

    this.startStderrReadingBun()

    await new Promise((resolve) => setTimeout(resolve, 100))

    if (this.bunProc.exitCode !== null) {
      const stderr = this.stderrBuffer.join("\n")
      throw new Error(
        `LSP server exited immediately with code ${this.bunProc.exitCode}` + (stderr ? `\nstderr: ${stderr}` : "")
      )
    }

    const stdoutReader = this.bunProc.stdout.getReader()
    const nodeReadable = new Readable({
      async read() {
        try {
          const { done, value } = await stdoutReader.read()
          if (done) {
            this.push(null)
          } else {
            this.push(Buffer.from(value))
          }
        } catch {
          this.push(null)
        }
      },
    })

    const stdin = this.bunProc.stdin
    const nodeWritable = new Writable({
      write(chunk, _encoding, callback) {
        try {
          stdin.write(chunk)
          callback()
        } catch (err) {
          callback(err as Error)
        }
      },
    })

    this.setupConnection(nodeReadable, nodeWritable)
  }

  private async startWithNode(env: NodeJS.ProcessEnv): Promise<void> {
    const [cmd, ...args] = this.server.command
    
    this.nodeProc = nodeSpawn(cmd, args, {
      cwd: this.root,
      env,
      stdio: ["pipe", "pipe", "pipe"],
      // On Windows, use shell for .cmd/.bat/.ps1 files
      shell: process.platform === "win32",
      windowsHide: true,
    })

    if (!this.nodeProc || !this.nodeProc.stdin || !this.nodeProc.stdout || !this.nodeProc.stderr) {
      throw new Error(`Failed to spawn LSP server: ${this.server.command.join(" ")}`)
    }

    // Create a promise that resolves when the process exits
    this.nodeExitedPromise = new Promise((resolve) => {
      this.nodeProc!.on("exit", (code) => {
        this.processExited = true
        resolve(code)
      })
      this.nodeProc!.on("error", () => {
        this.processExited = true
        resolve(null)
      })
    })

    this.startStderrReadingNode()

    await new Promise((resolve) => setTimeout(resolve, 100))

    if (this.nodeProc.exitCode !== null) {
      const stderr = this.stderrBuffer.join("\n")
      throw new Error(
        `LSP server exited immediately with code ${this.nodeProc.exitCode}` + (stderr ? `\nstderr: ${stderr}` : "")
      )
    }

    this.setupConnection(this.nodeProc.stdout, this.nodeProc.stdin)
  }

  private setupConnection(readable: Readable, writable: Writable): void {
    this.connection = createMessageConnection(
      new StreamMessageReader(readable),
      new StreamMessageWriter(writable)
    )

    this.connection.onNotification("textDocument/publishDiagnostics", (params: { uri?: string; diagnostics?: Diagnostic[] }) => {
      if (params.uri) {
        this.diagnosticsStore.set(params.uri, params.diagnostics ?? [])
      }
    })

    this.connection.onRequest("workspace/configuration", (params: { items?: Array<{ section?: string }> }) => {
      const items = params?.items ?? []
      return items.map((item) => {
        if (item.section === "json") return { validate: { enable: true } }
        return {}
      })
    })

    this.connection.onRequest("client/registerCapability", () => null)
    this.connection.onRequest("window/workDoneProgress/create", () => null)

    this.connection.onClose(() => {
      this.processExited = true
    })

    this.connection.onError((error) => {
      log("LSP connection error:", error)
    })

    this.connection.listen()
  }

  private startStderrReadingBun(): void {
    if (!this.bunProc) return

    const reader = this.bunProc.stderr.getReader()
    const read = async () => {
      const decoder = new TextDecoder()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value)
          this.stderrBuffer.push(text)
          if (this.stderrBuffer.length > 100) {
            this.stderrBuffer.shift()
          }
        }
      } catch {}
    }
    read()
  }

  private startStderrReadingNode(): void {
    if (!this.nodeProc?.stderr) return

    this.nodeProc.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString()
      this.stderrBuffer.push(text)
      if (this.stderrBuffer.length > 100) {
        this.stderrBuffer.shift()
      }
    })
  }

  private getExitCode(): number | null {
    if (this.spawnMode === "node") {
      return this.nodeProc?.exitCode ?? null
    }
    return this.bunProc?.exitCode ?? null
  }

  private async sendRequest<T>(method: string, params?: unknown): Promise<T> {
    if (!this.connection) throw new Error("LSP client not started")

    const exitCode = this.getExitCode()
    if (this.processExited || exitCode !== null) {
      const stderr = this.stderrBuffer.slice(-10).join("\n")
      throw new Error(`LSP server already exited (code: ${exitCode})` + (stderr ? `\nstderr: ${stderr}` : ""))
    }

    let timeoutId: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        const stderr = this.stderrBuffer.slice(-5).join("\n")
        reject(new Error(`LSP request timeout (method: ${method})` + (stderr ? `\nrecent stderr: ${stderr}` : "")))
      }, this.REQUEST_TIMEOUT)
    })

    const requestPromise = this.connection.sendRequest(method, params) as Promise<T>

    try {
      const result = await Promise.race([requestPromise, timeoutPromise])
      clearTimeout(timeoutId!)
      return result
    } catch (error) {
      clearTimeout(timeoutId!)
      throw error
    }
  }

  private sendNotification(method: string, params?: unknown): void {
    if (!this.connection) return
    const exitCode = this.getExitCode()
    if (this.processExited || exitCode !== null) return

    this.connection.sendNotification(method, params)
  }

  async initialize(): Promise<void> {
    const rootUri = pathToFileURL(this.root).href
    await this.sendRequest("initialize", {
      processId: process.pid,
      rootUri,
      rootPath: this.root,
      workspaceFolders: [{ uri: rootUri, name: "workspace" }],
      capabilities: {
        textDocument: {
          hover: { contentFormat: ["markdown", "plaintext"] },
          definition: { linkSupport: true },
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          publishDiagnostics: {},
          rename: {
            prepareSupport: true,
            prepareSupportDefaultBehavior: 1,
            honorsChangeAnnotations: true,
          },
          codeAction: {
            codeActionLiteralSupport: {
              codeActionKind: {
                valueSet: [
                  "quickfix",
                  "refactor",
                  "refactor.extract",
                  "refactor.inline",
                  "refactor.rewrite",
                  "source",
                  "source.organizeImports",
                  "source.fixAll",
                ],
              },
            },
            isPreferredSupport: true,
            disabledSupport: true,
            dataSupport: true,
            resolveSupport: {
              properties: ["edit", "command"],
            },
          },
        },
        workspace: {
          symbol: {},
          workspaceFolders: true,
          configuration: true,
          applyEdit: true,
          workspaceEdit: {
            documentChanges: true,
          },
        },
      },
      ...this.server.initialization,
    })
    this.sendNotification("initialized")
    this.sendNotification("workspace/didChangeConfiguration", {
      settings: { json: { validate: { enable: true } } },
    })
    await new Promise((r) => setTimeout(r, 300))
  }

  async openFile(filePath: string): Promise<void> {
    const absPath = resolve(filePath)

    const uri = pathToFileURL(absPath).href
    const text = readFileSync(absPath, "utf-8")

    if (!this.openedFiles.has(absPath)) {
      const ext = extname(absPath)
      const languageId = getLanguageId(ext)
      const version = 1

      this.sendNotification("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId,
          version,
          text,
        },
      })

      this.openedFiles.add(absPath)
      this.documentVersions.set(uri, version)
      this.lastSyncedText.set(uri, text)
      await new Promise((r) => setTimeout(r, 1000))
      return
    }

    const prevText = this.lastSyncedText.get(uri)
    if (prevText === text) {
      return
    }

    const nextVersion = (this.documentVersions.get(uri) ?? 1) + 1
    this.documentVersions.set(uri, nextVersion)
    this.lastSyncedText.set(uri, text)

    this.sendNotification("textDocument/didChange", {
      textDocument: { uri, version: nextVersion },
      contentChanges: [{ text }],
    })

    // Some servers update diagnostics only after save
    this.sendNotification("textDocument/didSave", {
      textDocument: { uri },
      text,
    })
  }

  async definition(filePath: string, line: number, character: number): Promise<unknown> {
    const absPath = resolve(filePath)
    await this.openFile(absPath)
    return this.sendRequest("textDocument/definition", {
      textDocument: { uri: pathToFileURL(absPath).href },
      position: { line: line - 1, character },
    })
  }

  async references(filePath: string, line: number, character: number, includeDeclaration = true): Promise<unknown> {
    const absPath = resolve(filePath)
    await this.openFile(absPath)
    return this.sendRequest("textDocument/references", {
      textDocument: { uri: pathToFileURL(absPath).href },
      position: { line: line - 1, character },
      context: { includeDeclaration },
    })
  }

  async documentSymbols(filePath: string): Promise<unknown> {
    const absPath = resolve(filePath)
    await this.openFile(absPath)
    return this.sendRequest("textDocument/documentSymbol", {
      textDocument: { uri: pathToFileURL(absPath).href },
    })
  }

  async workspaceSymbols(query: string): Promise<unknown> {
    return this.sendRequest("workspace/symbol", { query })
  }

  async diagnostics(filePath: string): Promise<{ items: Diagnostic[] }> {
    const absPath = resolve(filePath)
    const uri = pathToFileURL(absPath).href
    await this.openFile(absPath)
    await new Promise((r) => setTimeout(r, 500))

    try {
      const result = await this.sendRequest<{ items?: Diagnostic[] }>("textDocument/diagnostic", {
        textDocument: { uri },
      })
      if (result && typeof result === "object" && "items" in result) {
        return result as { items: Diagnostic[] }
      }
    } catch {}

    return { items: this.diagnosticsStore.get(uri) ?? [] }
  }

  async prepareRename(filePath: string, line: number, character: number): Promise<unknown> {
    const absPath = resolve(filePath)
    await this.openFile(absPath)
    return this.sendRequest("textDocument/prepareRename", {
      textDocument: { uri: pathToFileURL(absPath).href },
      position: { line: line - 1, character },
    })
  }

  async rename(filePath: string, line: number, character: number, newName: string): Promise<unknown> {
    const absPath = resolve(filePath)
    await this.openFile(absPath)
    return this.sendRequest("textDocument/rename", {
      textDocument: { uri: pathToFileURL(absPath).href },
      position: { line: line - 1, character },
      newName,
    })
  }

  isAlive(): boolean {
    if (this.processExited) return false
    
    if (this.spawnMode === "node") {
      return this.nodeProc !== null && this.nodeProc.exitCode === null
    }
    return this.bunProc !== null && this.bunProc.exitCode === null
  }

  async stop(): Promise<void> {
    if (this.connection) {
      try {
        this.sendNotification("shutdown", {})
        this.sendNotification("exit")
      } catch {}
      this.connection.dispose()
      this.connection = null
    }

    if (this.spawnMode === "node") {
      await this.stopNodeProc()
    } else {
      await this.stopBunProc()
    }

    this.processExited = true
    this.diagnosticsStore.clear()
  }

  private async stopBunProc(): Promise<void> {
    const proc = this.bunProc
    if (!proc) return
    
    this.bunProc = null
    let exitedBeforeTimeout = false
    try {
      proc.kill()
      // Wait for exit with timeout to prevent indefinite hang
      let timeoutId: ReturnType<typeof setTimeout> | undefined
      const timeoutPromise = new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, 5000)
      })
      await Promise.race([
        proc.exited.then(() => { exitedBeforeTimeout = true }).finally(() => timeoutId && clearTimeout(timeoutId)),
        timeoutPromise,
      ])
      if (!exitedBeforeTimeout) {
        log("[LSPClient] Process did not exit within timeout, escalating to SIGKILL")
        try {
          proc.kill("SIGKILL")
          // Wait briefly for SIGKILL to take effect
          await Promise.race([
            proc.exited,
            new Promise<void>((resolve) => setTimeout(resolve, 1000)),
          ])
        } catch {}
      }
    } catch {}
  }

  private async stopNodeProc(): Promise<void> {
    const proc = this.nodeProc
    if (!proc) return

    this.nodeProc = null
    let exitedBeforeTimeout = false
    try {
      proc.kill()
      // Wait for exit with timeout
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 5000))
      await Promise.race([
        this.nodeExitedPromise?.then(() => { exitedBeforeTimeout = true }) ?? Promise.resolve(),
        timeoutPromise,
      ])
      if (!exitedBeforeTimeout) {
        log("[LSPClient] Process did not exit within timeout, escalating to SIGKILL")
        try {
          proc.kill("SIGKILL")
          await Promise.race([
            this.nodeExitedPromise ?? Promise.resolve(),
            new Promise<void>((resolve) => setTimeout(resolve, 1000)),
          ])
        } catch {}
      }
    } catch {}
  }
}
