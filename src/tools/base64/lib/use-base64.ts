import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

import { useFont } from "@/lib/use-font";
import { useToolHistory } from "@/lib/use-tool-history";
import {
  BASE64_CONFIG,
  DEFAULT_DECODED_VALUE,
  DEFAULT_ENCODED_VALUE,
} from "@/tools/base64/lib/constants";
import {
  areBoxesInSync,
  decodeBase64,
  encodeBase64,
} from "@/tools/base64/lib/utils";

export interface Base64Boxes {
  encoded: string;
  decoded: string;
}

export interface Base64State extends Base64Boxes {
  encodedError: string | null;
  decodedError: string | null;
  isInSync: boolean;
  fontSize: number;
}

const DEFAULT_BOXES: Base64Boxes = {
  encoded: DEFAULT_ENCODED_VALUE,
  decoded: DEFAULT_DECODED_VALUE,
};

function serializeBoxes(boxes: Base64Boxes) {
  return JSON.stringify(boxes);
}

function deserializeBoxes(raw: string): Base64Boxes {
  try {
    const parsed = JSON.parse(raw) as Partial<Base64Boxes>;
    return {
      encoded: parsed?.encoded ?? "",
      decoded: parsed?.decoded ?? "",
    };
  } catch {
    return { ...DEFAULT_BOXES };
  }
}

export function useBase64() {
  const initialValue = useMemo<Base64Boxes>(() => ({ ...DEFAULT_BOXES }), []);
  const { value: boxes, setValue: setBoxes } = useToolHistory<Base64Boxes>({
    tool: "base64",
    initialValue,
    serialize: serializeBoxes,
    deserialize: deserializeBoxes,
  });

  const [encodedError, setEncodedError] = useState<string | null>(null);
  const [decodedError, setDecodedError] = useState<string | null>(null);

  const { fontSize, increaseFont, decreaseFont } = useFont({
    defaultSize: BASE64_CONFIG.defaultFontSize,
    minSize: BASE64_CONFIG.minFontSize,
    maxSize: BASE64_CONFIG.maxFontSize,
  });

  function setEncoded(nextEncoded: string) {
    setEncodedError(null);
    setBoxes((previous) => ({ ...previous, encoded: nextEncoded }));
  }

  function setDecoded(nextDecoded: string) {
    setDecodedError(null);
    setBoxes((previous) => ({ ...previous, decoded: nextDecoded }));
  }

  function handleEncodedChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setEncoded(event.target.value);
  }

  function handleDecodedChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDecoded(event.target.value);
  }

  /** base64 box -> plain text box */
  function decode(source = boxes.encoded) {
    const result = decodeBase64(source);
    setEncodedError(result.error);
    if (result.error) return;
    setDecodedError(null);
    setBoxes((previous) => ({ ...previous, decoded: result.value }));
  }

  /** plain text box -> base64 box */
  function encode(source = boxes.decoded) {
    const result = encodeBase64(source);
    setDecodedError(result.error);
    if (result.error) return;
    setEncodedError(null);
    setBoxes((previous) => ({ ...previous, encoded: result.value }));
  }

  function decodeFrom(nextEncoded: string) {
    setEncoded(nextEncoded);
    decode(nextEncoded);
  }

  function encodeFrom(nextDecoded: string) {
    setDecoded(nextDecoded);
    encode(nextDecoded);
  }

  const isInSync = useMemo(
    () => areBoxesInSync(boxes.encoded, boxes.decoded),
    [boxes.encoded, boxes.decoded]
  );

  const state: Base64State = {
    ...boxes,
    encodedError,
    decodedError,
    isInSync,
    fontSize,
  };

  return {
    state,
    setEncoded,
    setDecoded,
    handleEncodedChange,
    handleDecodedChange,
    decode,
    encode,
    decodeFrom,
    encodeFrom,
    increaseFont,
    decreaseFont,
  };
}
