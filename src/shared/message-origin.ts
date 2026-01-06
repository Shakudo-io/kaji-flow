export type PartWithMetadata = Record<string, unknown> & {
  metadata?: Record<string, unknown>
}

export function hasPartOrigin(parts: PartWithMetadata[], origin: string): boolean {
  return parts.some((part) => {
    const metadata = part.metadata
    if (!metadata) return false
    return metadata.origin === origin
  })
}
