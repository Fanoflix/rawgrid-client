import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "rawgrid-tools";
const DB_VERSION = 2;
const TOOL_STORE = "tool-state";
const APP_STORE = "app-state";
const LEGACY_HISTORY_STORE = "tool-history";
const CHANGE_CHANNEL = "rawgrid-app-state";

interface ToolStateRow {
  tool: string;
  payload: string;
  updatedAt: number;
}

interface LegacyHistoryRow {
  tool: string;
  payload: string;
  createdAt: number;
}

interface AppStateChange {
  key: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;
let channel: BroadcastChannel | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, _oldVersion, _newVersion, transaction) {
        if (!db.objectStoreNames.contains(TOOL_STORE)) {
          db.createObjectStore(TOOL_STORE, { keyPath: "tool" });
        }
        if (!db.objectStoreNames.contains(APP_STORE)) {
          db.createObjectStore(APP_STORE);
        }
        if (db.objectStoreNames.contains(LEGACY_HISTORY_STORE)) {
          const rows = (await transaction
            .objectStore(LEGACY_HISTORY_STORE)
            .getAll()) as LegacyHistoryRow[];
          const latestByTool = new Map<string, LegacyHistoryRow>();
          for (const row of rows) {
            const current = latestByTool.get(row.tool);
            if (!current || row.createdAt > current.createdAt) {
              latestByTool.set(row.tool, row);
            }
          }
          const toolStore = transaction.objectStore(TOOL_STORE);
          for (const row of latestByTool.values()) {
            await toolStore.put({
              tool: row.tool,
              payload: row.payload,
              updatedAt: row.createdAt,
            } satisfies ToolStateRow);
          }
          db.deleteObjectStore(LEGACY_HISTORY_STORE);
        }
      },
    });
  }
  return dbPromise;
}

function getChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANGE_CHANNEL);
  return channel;
}

export async function readToolState(tool: string): Promise<string | null> {
  const db = await getDb();
  const row = (await db.get(TOOL_STORE, tool)) as ToolStateRow | undefined;
  return row?.payload ?? null;
}

export async function writeToolState(tool: string, payload: string) {
  const db = await getDb();
  await db.put(TOOL_STORE, {
    tool,
    payload,
    updatedAt: Date.now(),
  } satisfies ToolStateRow);
}

export async function readAppState<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return (await db.get(APP_STORE, key)) as T | undefined;
}

export async function writeAppState<T>(key: string, value: T) {
  const db = await getDb();
  await db.put(APP_STORE, value, key);
  getChannel()?.postMessage({ key } satisfies AppStateChange);
}

export async function deleteAppState(key: string) {
  const db = await getDb();
  await db.delete(APP_STORE, key);
  getChannel()?.postMessage({ key } satisfies AppStateChange);
}

export function subscribeAppState(key: string, listener: () => void) {
  const activeChannel = getChannel();
  if (!activeChannel) return () => undefined;
  function handleMessage(event: MessageEvent<AppStateChange>) {
    if (event.data?.key === key) listener();
  }
  activeChannel.addEventListener("message", handleMessage);
  return () => activeChannel.removeEventListener("message", handleMessage);
}

export async function readAppStateWithLocalStorageFallback<T>(
  key: string,
  localStorageKey: string,
  parse: (raw: string) => T | undefined
): Promise<T | undefined> {
  const stored = await readAppState<T>(key);
  if (stored !== undefined) return stored;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(localStorageKey);
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  const migrated = parse(raw);
  try {
    window.localStorage.removeItem(localStorageKey);
  } catch {
    return migrated;
  }
  if (migrated !== undefined) await writeAppState(key, migrated);
  return migrated;
}
