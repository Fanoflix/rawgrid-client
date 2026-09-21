import { playButtonPress } from "@/tools/timer/lib/sounds/button-press";
import { playClickySwitch } from "@/tools/timer/lib/sounds/clicky-switch";
import { playKeyboardThock } from "@/tools/timer/lib/sounds/keyboard-thock";
import { playWindUpClacker } from "@/tools/timer/lib/sounds/wind-up-clacker";

// Every alarm the timer can pick from. Add a file in ./sounds and list it here.
export const TIMER_SOUNDS = [
  { id: "wind-up-clacker", label: "clacker", play: playWindUpClacker },
  { id: "keyboard-thock", label: "thock", play: playKeyboardThock },
  { id: "clicky-switch", label: "clicky", play: playClickySwitch },
  { id: "button-press", label: "button", play: playButtonPress },
] as const;

export type TimerSoundId = (typeof TIMER_SOUNDS)[number]["id"];

export const DEFAULT_TIMER_SOUND: TimerSoundId = "wind-up-clacker";

export function isTimerSoundId(value: unknown): value is TimerSoundId {
  return TIMER_SOUNDS.some((sound) => sound.id === value);
}
