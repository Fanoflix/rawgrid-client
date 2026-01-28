export function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map((part) => Number(part));
    if (parts.some((part) => Number.isNaN(part))) return 0;
    const [minutes, seconds] = parts.length === 2 ? parts : [0, parts[0]];
    return Math.max(0, minutes * 60 + seconds) * 1000;
  }

  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, seconds) * 1000;
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
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
  webkitAudioContext?: typeof AudioContext;
}

function getAudioContextConstructor() {
  const windowWithWebkit = window as WindowWithWebkitAudioContext;
  return windowWithWebkit.AudioContext || windowWithWebkit.webkitAudioContext;
}
