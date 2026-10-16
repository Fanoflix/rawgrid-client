import { useRef, useState } from "react";

import type { JsonEditorHandle } from "@/components/json-editor";
import { EMPTY_CUSTOM_THEME } from "@/lib/custom-theme";
import { FONT_SCALE } from "@/lib/font-scale";
import {
  settingsFieldWidgets,
  type SettingsFieldOpenRequest,
} from "@/lib/settings-field-widgets";
import {
  parseSettingsJson,
  settingsToJson,
  type SettingsJsonError,
} from "@/lib/settings-json";
import { useCustomTheme } from "@/lib/use-custom-theme";
import { useFontScale } from "@/lib/use-font-scale";

export function useSettingsJsonView() {
  const { level, setFontScaleLevel } = useFontScale();
  const { theme, replaceTheme } = useCustomTheme();
  const editorRef = useRef<JsonEditorHandle>(null);
  const [text, setText] = useState(() =>
    settingsToJson({ fontScaleLevel: level, theme })
  );
  const [errors, setErrors] = useState<SettingsJsonError[]>([]);
  const [openField, setOpenField] = useState<SettingsFieldOpenRequest | null>(null);
  const [extensions] = useState(() => [settingsFieldWidgets(setOpenField)]);

  function handleTextChange(nextText: string) {
    setText(nextText);
    const result = parseSettingsJson(nextText);
    if (result.errors) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setFontScaleLevel(result.settings.fontScaleLevel);
    replaceTheme(result.settings.theme);
  }

  function loadDefaults() {
    handleTextChange(
      settingsToJson({ fontScaleLevel: FONT_SCALE.defaultLevel, theme: EMPTY_CUSTOM_THEME })
    );
  }

  function pickFieldValue(value: string) {
    if (!openField) return;
    const literal = JSON.stringify(value);
    const { from, to } = openField.range;
    editorRef.current?.replaceRange(from, to, literal);
    setOpenField({
      ...openField,
      range: { ...openField.range, to: from + literal.length, value },
    });
  }

  function closeField() {
    setOpenField(null);
  }

  return {
    state: { text, errors, openField, extensions },
    editorRef,
    handleTextChange,
    loadDefaults,
    pickFieldValue,
    closeField,
  };
}
