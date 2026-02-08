import type { PermissionValue } from "../../shared/permission-compat"

export function mapPermissionsToTools(permissions: Record<string, PermissionValue>): Record<string, boolean> {
  const tools: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(permissions)) {
    tools[key] = value === "allow"
  }
  return tools
}
