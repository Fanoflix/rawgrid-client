import type { TimerInput } from "@/tools/timer/lib/constants";

function getSafeNumber(value: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseDurationParts(value: TimerInput) {
  const hours = getSafeNumber(value.hours);
  const minutes = getSafeNumber(value.minutes);
  const seconds = getSafeNumber(value.seconds);
  return Math.max(0, hours * 3600 + minutes * 60 + seconds) * 1000;
}

export function formatDurationParts(ms: number): TimerInput {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
  };
}

export function parseLegacyDurationString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return null;
    const [minutes, seconds] = parts.length === 2 ? parts : [0, parts[0]];
    return Math.max(0, minutes * 60 + seconds) * 1000;
  }

  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds)) return null;
  return Math.max(0, seconds) * 1000;
}

export function playTimerSound() {
  try {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, context.currentTime);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  } catch {
    // ignore
  }
}

interface WindowWithWebkitAudioContext extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function getAudioContextConstructor() {
  const windowWithWebkit = window as WindowWithWebkitAudioContext;
  return windowWithWebkit.AudioContext || windowWithWebkit.webkitAudioContext;
}
