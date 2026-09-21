interface WindowWithWebkitAudioContext extends Window {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

function getAudioContextConstructor() {
  const windowWithWebkit = window as WindowWithWebkitAudioContext;
  return windowWithWebkit.AudioContext || windowWithWebkit.webkitAudioContext;
}

// Only one alarm plays at a time: starting a sound closes whatever context the
// previous one was still scheduling into, which silences it immediately.
let activeContext: AudioContext | null = null;

export function startAlarmContext() {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) return null;

  closeActiveAlarmContext();
  activeContext = new AudioContextConstructor();
  return activeContext;
}

/** Closes `context` after `seconds`, unless a newer sound already replaced it. */
export function releaseAlarmContextAfter(context: AudioContext, seconds: number) {
  window.setTimeout(() => {
    if (activeContext !== context) return;
    activeContext = null;
    void context.close().catch(() => {});
  }, seconds * 1000);
}

function closeActiveAlarmContext() {
  if (!activeContext) return;
  void activeContext.close().catch(() => {});
  activeContext = null;
}
