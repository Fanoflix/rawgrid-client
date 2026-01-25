export interface JwtDecodedPayload {
  header: Record<string, unknown> | null
  payload: Record<string, unknown> | null
  signature: string | null
}

export interface JwtDecodeOutput {
  prettyJson: string
  error: string | null
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4)
  const base64 = `${normalized}${padding}`

  try {
    return decodeURIComponent(
      Array.from(atob(base64))
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    )
  } catch {
    return atob(base64)
  }
}

function parseJwtSection(section: string) {
  const decoded = decodeBase64Url(section)
  return JSON.parse(decoded) as Record<string, unknown>
}

export function decodeJwt(token: string): JwtDecodeOutput {
  if (!token.trim()) {
    return { prettyJson: "", error: null }
  }

  const parts = token.split(".")
  if (parts.length < 2) {
    return { prettyJson: "", error: "invalid token" }
  }

  try {
    const header = parseJwtSection(parts[0])
    const payload = parseJwtSection(parts[1])
    const signature = parts[2] ?? ""
    const decoded: JwtDecodedPayload = {
      header,
      payload,
      signature,
    }
    return {
      prettyJson: JSON.stringify(decoded, null, 2),
      error: null,
    }
  } catch {
    return { prettyJson: "", error: "invalid token" }
  }
}
