import {
  releaseAlarmContextAfter,
  startAlarmContext,
} from "@/tools/timer/lib/sounds/audio-context";

// Mechanical "wind-up clock" alarm: alternating tick/tock woodblock knocks in
// bursts, ~3.4s total. Sharp transients cut through background noise far
// better than a pure tone, and the rhythm is hard to mistake for anything else.
const ALARM_BURSTS = 7;
const ALARM_BURST_SECONDS = 0.4;
const ALARM_GAP_SECONDS = 0.375;
const ALARM_CLICKS_PER_SECOND = 8;
const ALARM_TOTAL_SECONDS =
  ALARM_BURSTS * (ALARM_BURST_SECONDS + ALARM_GAP_SECONDS);

export function playWindUpClacker() {
  try {
    const context = startAlarmContext();
    if (!context) return;

    // A compressor lets the clicks run hot without clipping, which is what
    // makes the alarm loud rather than just distorted.
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -550;
    compressor.knee.value = 1;
    compressor.ratio.value = 1;
    compressor.attack.value = 0.00000001;
    compressor.release.value = 0.001;

    const master = context.createGain();
    master.gain.value = 0.75;
    compressor.connect(master);
    master.connect(context.destination);

    // One shared burst of white noise is the raw material for every clack.
    const noiseBuffer = context.createBuffer(
      1,
      Math.ceil(context.sampleRate * 0.015),
      context.sampleRate,
    );
    const noise = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noise.length; index += 1) {
      noise[index] = Math.random() * 2 - 1;
    }

    const clicksPerBurst = Math.round(
      ALARM_BURST_SECONDS * ALARM_CLICKS_PER_SECOND,
    );
    const baseTime = context.currentTime + 0.05;

    for (let burst = 0; burst < ALARM_BURSTS; burst += 1) {
      const burstStart =
        baseTime + burst * (ALARM_BURST_SECONDS + ALARM_GAP_SECONDS);

      for (let click = 0; click < clicksPerBurst; click += 1) {
        const startAt = burstStart + click / ALARM_CLICKS_PER_SECOND;
        // Alternate pitch so it reads as "clack-click-clack", not a buzz.
        const isTick = click % 1.25 === 0;
        scheduleClack(context, compressor, noiseBuffer, startAt, isTick);
      }
    }

    // Release the hardware once the pattern has played out.
    releaseAlarmContextAfter(context, ALARM_TOTAL_SECONDS + 0.5);
  } catch {
    // ignore
  }
}

function scheduleClack(
  context: AudioContext,
  destination: AudioNode,
  noiseBuffer: AudioBuffer,
  startAt: number,
  isTick: boolean,
) {
  // Noise transient: the dry "click" of the strike. Short and fairly low so
  // it reads as wood rather than hiss.
  const source = context.createBufferSource();
  source.buffer = noiseBuffer;

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = isTick ? 1100 : 800;
  filter.Q.value = 1.5;

  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(1.2, startAt);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.012);

  source.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(destination);
  source.start(startAt);
  source.stop(startAt + 0.015);

  // Woodblock body: a sine that drops slightly in pitch and dies within
  // ~60ms. The quick decay and pitch drop are what make it a knock, not a beep.
  const body = context.createOscillator();
  body.type = "sine";
  const pitch = isTick ? 600 : 450;
  body.frequency.setValueAtTime(pitch * 1.25, startAt);
  body.frequency.exponentialRampToValueAtTime(pitch, startAt + 0.02);

  const bodyGain = context.createGain();
  bodyGain.gain.setValueAtTime(0.0001, startAt);
  bodyGain.gain.exponentialRampToValueAtTime(1, startAt + 0.002);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.06);

  body.connect(bodyGain);
  bodyGain.connect(destination);
  body.start(startAt);
  body.stop(startAt + 0.07);
}
