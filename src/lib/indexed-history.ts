import { openDB, type IDBPDatabase } from "idb"

export interface ToolHistoryEntry {
  id?: number
  tool: string
  payload: string
  createdAt: number
}

const DB_NAME = "rawgrid-tools"
const STORE_NAME = "tool-history"
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (db.objectStoreNames.contains(STORE_NAME)) return
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        })
        store.createIndex("by-tool", "tool")
        store.createIndex("by-created", "createdAt")
      },
    })
  }

  return dbPromise
}

export async function addToolHistoryEntry(tool: string, payload: string) {
  const db = await getDb()
  const entry: ToolHistoryEntry = {
    tool,
    payload,
    createdAt: Date.now(),
  }
  await db.add(STORE_NAME, entry)
  return entry
}

export async function getLatestToolHistoryEntry(tool: string) {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, "readonly")
  const index = tx.store.index("by-tool")
  const entries = await index.getAll(IDBKeyRange.only(tool))
  await tx.done
  return entries.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
}

export async function getToolHistoryEntries(tool: string, limit = 20) {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, "readonly")
  const index = tx.store.index("by-tool")
  const entries = await index.getAll(IDBKeyRange.only(tool))
  await tx.done
  return entries.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
}
