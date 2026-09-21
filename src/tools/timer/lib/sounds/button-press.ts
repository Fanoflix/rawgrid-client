import {
  type KeyStrike,
  playStrikes,
  repeatGroup,
} from "@/tools/timer/lib/sounds/key-strike";

// A single chunky push button: a solid thock on the way down, and a lighter
// tick when it springs back up. One press every 0.5s, 7 times, ~3.5s.
const PRESS: KeyStrike = {
  click: { frequency: 1200, q: 1.2, decay: 0.008, gain: 0.8 },
  thud: { frequency: 350, q: 0.7, decay: 0.025, gain: 1.2 },
  body: { frequency: 230, decay: 0.035, gain: 0.8 },
};

const RELEASE: KeyStrike = {
  click: { frequency: 2200, q: 1.5, decay: 0.005, gain: 0.45 },
};

export function playButtonPress() {
  playStrikes(
    repeatGroup(
      [
        { at: 0, strike: PRESS },
        { at: 0.09, strike: RELEASE },
      ],
      7,
      0.5,
    ),
  );
}
