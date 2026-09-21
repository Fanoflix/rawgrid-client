interface WindowWithWebkitAudioContext extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export function getAudioContextConstructor() {
  const windowWithWebkit = window as WindowWithWebkitAudioContext;
  return windowWithWebkit.AudioContext || windowWithWebkit.webkitAudioContext;
}
