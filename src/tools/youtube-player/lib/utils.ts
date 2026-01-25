function parseUrl(raw: string) {
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

export function extractYouTubeId(input: string) {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

  const url = parseUrl(trimmed)
  if (!url) return null

  if (url.hostname.includes("youtu.be")) {
    return url.pathname.replace("/", "") || null
  }

  if (url.searchParams.has("v")) {
    return url.searchParams.get("v")
  }

  const pathParts = url.pathname.split("/")
  const embedIndex = pathParts.findIndex((part) => part === "embed")
  if (embedIndex >= 0 && pathParts[embedIndex + 1]) {
    return pathParts[embedIndex + 1]
  }

  return null
}
