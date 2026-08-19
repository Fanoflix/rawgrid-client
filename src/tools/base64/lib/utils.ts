export interface Base64Result {
  value: string
  error: string | null
}

const CHUNK_SIZE = 0x8000

function bytesToBinaryString(bytes: Uint8Array) {
  let binary = ""
  for (let index = 0; index < bytes.length; index += CHUNK_SIZE) {
    const chunk = bytes.subarray(index, index + CHUNK_SIZE)
    binary += String.fromCharCode(...chunk)
  }
  return binary
}

export function encodeBase64(text: string): Base64Result {
  if (!text) {
    return { value: "", error: null }
  }

  try {
    const bytes = new TextEncoder().encode(text)
    return { value: btoa(bytesToBinaryString(bytes)), error: null }
  } catch {
    return { value: "", error: "could not encode this text" }
  }
}

export function decodeBase64(encoded: string): Base64Result {
  const normalized = encoded.trim()

  if (!normalized) {
    return { value: "", error: null }
  }

  if (/[^A-Za-z0-9+/=\-_\s]/.test(normalized)) {
    return { value: "", error: "invalid base64: unexpected characters" }
  }

  const stripped = normalized.replace(/\s+/g, "")
  const standard = stripped.replace(/-/g, "+").replace(/_/g, "/")
  const padded = `${standard}${"=".repeat((4 - (standard.length % 4)) % 4)}`

  let binary: string
  try {
    binary = atob(padded)
  } catch {
    return { value: "", error: "invalid base64: malformed input" }
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

  try {
    return {
      value: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      error: null,
    }
  } catch {
    return { value: "", error: "decoded bytes are not valid utf-8 text" }
  }
}

/**
 * The two boxes are edited independently, so they drift apart until the user
 * runs encode or decode. Returns true only when the base64 box actually
 * represents the text box.
 */
export function areBoxesInSync(encoded: string, decoded: string) {
  if (!encoded.trim() && !decoded) return true

  const result = decodeBase64(encoded)
  if (result.error) return false

  return result.value === decoded
}
