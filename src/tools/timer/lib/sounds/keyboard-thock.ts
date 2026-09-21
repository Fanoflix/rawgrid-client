import {
  type KeyStrike,
  playStrikes,
  repeatGroup,
} from "@/tools/timer/lib/sounds/key-strike";

// Deep, lubed linear switch bottoming out: mostly thock, barely any click.
// Pattern is a quick double tap, repeated 6 times, ~3.6s.
const THOCK: KeyStrike = {
  click: { frequency: 1500, q: 1, decay: 0.006, gain: 0.6 },
  thud: { frequency: 450, q: 0.7, decay: 0.03, gain: 1.6 },
  body: { frequency: 170, decay: 0.045, gain: 0.9 },
};

export function playKeyboardThock() {
  playStrikes(
    repeatGroup(
      [
        { at: 0, strike: THOCK },
        { at: 0.12, strike: THOCK },
      ],
      6,
      0.6,
    ),
  );
}
