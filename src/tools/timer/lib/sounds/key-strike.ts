import { getAudioContextConstructor } from "@/tools/timer/lib/sounds/audio-context";

// Building block for the keyboard-style alarms. A keypress is up to three
// layers, all very short so nothing rings long enough to read as a beep:
// - click: band-passed noise, the plastic-on-plastic contact.
// - thud: low-passed noise, the keycap bottoming out on the plate.
// - body: a short low sine, the hollow "thock" of the case.

interface NoiseLayer {
  frequency: number;
  q: number;
  decay: number;
  gain: number;
}

interface BodyLayer {
  frequency: number;
  decay: number;
  gain: number;
}

export interface KeyStrike {
  click?: NoiseLayer;
  thud?: NoiseLayer;
  body?: BodyLayer;
}

export interface ScheduledStrike {
  /** Seconds from the start of the sound. */
  at: number;
  strike: KeyStrike;
}

const NOISE_SECONDS = 0.2;

export function playStrikes(strikes: ScheduledStrike[]) {
  try {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const output = context.createGain();
    output.gain.value = 0.8;
    output.connect(context.destination);

    const noiseBuffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * NOISE_SECONDS),
      context.sampleRate,
    );
    const noise = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noise.length; index += 1) {
      noise[index] = Math.random() * 2 - 1;
    }

    const baseTime = context.currentTime + 0.05;
    let lastAt = 0;
    for (const { at, strike } of strikes) {
      scheduleStrike(context, output, noiseBuffer, baseTime + at, strike);
      lastAt = Math.max(lastAt, at);
    }

    // Release the hardware once the pattern has played out.
    window.setTimeout(() => void context.close(), (lastAt + 0.5) * 1000);
  } catch {
    // ignore
  }
}

/** Repeats a short group of strikes every `interval` seconds. */
export function repeatGroup(
  group: ScheduledStrike[],
  repeats: number,
  interval: number,
): ScheduledStrike[] {
  return Array.from({ length: repeats }, (_, index) =>
    group.map(({ at, strike }) => ({ at: at + index * interval, strike })),
  ).flat();
}

function scheduleStrike(
  context: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
  startAt: number,
  strike: KeyStrike,
) {
  if (strike.click) {
    scheduleNoise(context, destination, noiseBuffer, startAt, "bandpass", strike.click);
  }
  if (strike.thud) {
    scheduleNoise(context, destination, noiseBuffer, startAt, "lowpass", strike.thud);
  }
  if (strike.body) {
    const { frequency, decay, gain } = strike.body;
    const body = context.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(frequency * 1.2, startAt);
    body.frequency.exponentialRampToValueAtTime(frequency, startAt + 0.015);

    const bodyGain = context.createGain();
    bodyGain.gain.setValueAtTime(0.0001, startAt);
    bodyGain.gain.exponentialRampToValueAtTime(gain, startAt + 0.002);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, startAt + decay);

    body.connect(bodyGain);
    bodyGain.connect(destination);
    body.start(startAt);
    body.stop(startAt + decay + 0.01);
  }
}

function scheduleNoise(
  context: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
  startAt: number,
  type: BiquadFilterType,
  layer: NoiseLayer,
) {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = layer.frequency;
  filter.Q.value = layer.q;

  const gain = context.createGain();
  gain.gain.setValueAtTime(layer.gain, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + layer.decay);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  // Random offset into the noise so repeated presses aren't identical.
  source.start(startAt, Math.random() * (NOISE_SECONDS - layer.decay - 0.01));
  source.stop(startAt + layer.decay + 0.005);
}
