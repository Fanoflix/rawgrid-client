import { useEffect, useState } from "react";

import { dispatch, subscribe } from "@/lib/command-bus";

export const SETTINGS_COMMANDS = {
  open: "settings:open",
  returnToPalette: "palette:return",
} as const;

export const SETTINGS_SOURCES = {
  palette: "palette",
  trigger: "trigger",
} as const;

type SettingsSource = (typeof SETTINGS_SOURCES)[keyof typeof SETTINGS_SOURCES];

interface SettingsPopoverState {
  isOpen: boolean;
  source: SettingsSource;
}

export interface SettingsCloseDetails {
  reason: string;
}

export function useSettingsPopover() {
  const [state, setState] = useState<SettingsPopoverState>({
    isOpen: false,
    source: SETTINGS_SOURCES.trigger,
  });

  useEffect(
    () =>
      subscribe(SETTINGS_COMMANDS.open, (source) =>
        setState({
          isOpen: true,
          source:
            source === SETTINGS_SOURCES.palette
              ? SETTINGS_SOURCES.palette
              : SETTINGS_SOURCES.trigger,
        })
      ),
    []
  );

  function handleOpenChange(isOpen: boolean, details: SettingsCloseDetails) {
    if (isOpen) {
      setState({ isOpen: true, source: SETTINGS_SOURCES.trigger });
      return;
    }
    setState((current) => ({ ...current, isOpen: false }));
    if (state.source === SETTINGS_SOURCES.palette && details.reason === "escape-key") {
      dispatch(SETTINGS_COMMANDS.returnToPalette);
    }
  }

  return {
    isOpen: state.isOpen,
    isFromPalette: state.source === SETTINGS_SOURCES.palette,
    handleOpenChange,
  };
}
