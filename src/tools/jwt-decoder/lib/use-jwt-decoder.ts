import type { ChangeEvent } from "react"
import { useMemo, useState } from "react"

import { useToolHistory } from "@/lib/use-tool-history"
import { JWT_DECODER_CONFIG } from "@/tools/jwt-decoder/lib/constants"
import { decodeJwt } from "@/tools/jwt-decoder/lib/utils"

export interface JwtDecoderState {
  token: string
  output: string
  fontSize: number
}

function serializeToken(value: string) {
  return value
}

function deserializeToken(value: string) {
  return value
}

export function useJwtDecoder() {
  const { value: token, setValue: setToken } = useToolHistory<string>({
    tool: "jwt-decoder",
    initialValue: "",
    serialize: serializeToken,
    deserialize: deserializeToken,
  })

  const [fontSize, setFontSize] = useState(JWT_DECODER_CONFIG.defaultFontSize)

  const output = useMemo(() => {
    const result = decodeJwt(token)
    if (!token.trim()) return ""
    if (result.error) {
      return JSON.stringify({ error: result.error }, null, 2)
    }
    return result.prettyJson
  }, [token])

  function handleTokenChange(event: ChangeEvent<HTMLInputElement>) {
    setToken(event.target.value)
  }

  function increaseFont() {
    setFontSize((size) => Math.min(size + 1, JWT_DECODER_CONFIG.maxFontSize))
  }

  function decreaseFont() {
    setFontSize((size) => Math.max(size - 1, JWT_DECODER_CONFIG.minFontSize))
  }

  const state: JwtDecoderState = {
    token,
    output,
    fontSize,
  }

  return {
    state,
    handleTokenChange,
    increaseFont,
    decreaseFont,
  }
}
