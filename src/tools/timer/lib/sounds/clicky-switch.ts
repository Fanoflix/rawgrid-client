import {
  type KeyStrike,
  playStrikes,
  repeatGroup,
} from "@/tools/timer/lib/sounds/key-strike";

// Clicky (blue-style) switch: a crisp click jacket snap followed right after
// by a light bottom-out. Pattern is three quick presses, repeated 5 times,
// ~3.75s.
const SNAP: KeyStrike = {
  click: { frequency: 3000, q: 2, decay: 0.005, gain: 1.1 },
};

const BOTTOM_OUT: KeyStrike = {
  click: { frequency: 2000, q: 1.5, decay: 0.006, gain: 0.5 },
  body: { frequency: 300, decay: 0.025, gain: 0.45 },
};

function press(at: number) {
  return [
    { at, strike: SNAP },
    { at: at + 0.012, strike: BOTTOM_OUT },
  ];
}

export function playClickySwitch() {
  playStrikes(
    repeatGroup([...press(0), ...press(0.1), ...press(0.2)], 5, 0.75),
  );
}
