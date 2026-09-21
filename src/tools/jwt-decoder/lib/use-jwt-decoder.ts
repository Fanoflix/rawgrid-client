import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

import { useFont } from "@/lib/use-font";
import { useToolHistory } from "@/lib/use-tool-history";
import { JWT_DECODER_CONFIG } from "@/tools/jwt-decoder/lib/constants";
import { decodeJwt, encodeJwt } from "@/tools/jwt-decoder/lib/utils";

export interface JwtDecoderState {
  token: string;
  output: string;
  editorJson: string;
  hasDraft: boolean;
  /** Why the draft can't be turned into a token, if it can't. */
  draftError: string | null;
  fontSize: number;
}

function serializeToken(value: string) {
  return value;
}

function deserializeToken(value: string) {
  return value;
}

export const DEFAULT_DUMMY_VALUE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";

export function useJwtDecoder() {
  const { value: token, setValue: setStoredToken } = useToolHistory<string>({
    tool: "jwt-decoder",
    initialValue: DEFAULT_DUMMY_VALUE,
    serialize: serializeToken,
    deserialize: deserializeToken,
  });

  const { fontSize, increaseFont, decreaseFont } = useFont({
    defaultSize: JWT_DECODER_CONFIG.defaultFontSize,
    minSize: JWT_DECODER_CONFIG.minFontSize,
    maxSize: JWT_DECODER_CONFIG.maxFontSize,
  });

  const output = useMemo(() => {
    const result = decodeJwt(token);
    if (!token.trim()) return "";
    if (result.error) {
      return JSON.stringify({ error: result.error }, null, 2);
    }
    return result.prettyJson;
  }, [token]);

  // Edits to the decoded json stay a draft until confirmed. Editing the token
  // itself wins: it replaces the draft with a fresh decode.
  const [draft, setDraft] = useState<string | null>(null);
  const reencodedDraft = useMemo(
    () => (draft === null ? null : encodeJwt(draft)),
    [draft]
  );

  function setToken(nextToken: string) {
    setDraft(null);
    setStoredToken(nextToken);
  }

  function handleTokenChange(event: ChangeEvent<HTMLInputElement>) {
    setToken(event.target.value);
  }

  function handleOutputChange(nextJson: string) {
    setDraft(nextJson === output ? null : nextJson);
  }

  function confirmEdits() {
    if (reencodedDraft?.token) setToken(reencodedDraft.token);
  }

  const state: JwtDecoderState = {
    token,
    output,
    editorJson: draft ?? output,
    hasDraft: draft !== null,
    draftError: reencodedDraft?.error ?? null,
    fontSize,
  };

  return {
    state,
    setToken,
    handleTokenChange,
    handleOutputChange,
    confirmEdits,
    increaseFont,
    decreaseFont,
  };
}
