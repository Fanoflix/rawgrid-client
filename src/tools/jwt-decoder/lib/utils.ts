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

function encodeBase64Url(value: string) {
  const binary = Array.from(new TextEncoder().encode(value), (byte) =>
    String.fromCharCode(byte)
  ).join("")
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Turns edited decoder output ({ header, payload, signature }) back into a
 * token. The signature is carried over as-is: without the signing key it
 * can't be recomputed, so an edited token won't verify.
 */
export function encodeJwt(json: string): { token: string | null; error: string | null } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { token: null, error: "invalid json" }
  }

  if (!isPlainObject(parsed)) return { token: null, error: "expected an object" }
  const { header, payload, signature = "" } = parsed
  if (!isPlainObject(header)) return { token: null, error: "header must be an object" }
  if (!isPlainObject(payload)) return { token: null, error: "payload must be an object" }
  if (typeof signature !== "string") return { token: null, error: "signature must be a string" }

  const encodedHeader = encodeBase64Url(JSON.stringify(header))
  const encodedPayload = encodeBase64Url(JSON.stringify(payload))
  return { token: `${encodedHeader}.${encodedPayload}.${signature}`, error: null }
}
