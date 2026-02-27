type CommandHandler = (payload?: string) => void;

const listeners = new Map<string, Set<CommandHandler>>();

export function subscribe(command: string, handler: CommandHandler) {
  if (!listeners.has(command)) listeners.set(command, new Set());
  listeners.get(command)!.add(handler);
  return () => {
    listeners.get(command)?.delete(handler);
  };
}

export function dispatch(command: string, payload?: string) {
  listeners.get(command)?.forEach((handler) => handler(payload));
}
