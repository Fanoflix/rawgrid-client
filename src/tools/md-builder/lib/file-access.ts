import { deleteDB, openDB } from "idb";

import { readAppState, writeAppState } from "@/lib/storage";

import {
  MARKDOWN_PICKER_TYPES,
  REVIEWED_SUFFIX,
} from "@/tools/md-builder/lib/constants";

interface PickerOptions {
  types: typeof MARKDOWN_PICKER_TYPES;
  suggestedName?: string;
}

interface PermissionHandle {
  requestPermission?: (descriptor: {
    mode: "read" | "readwrite";
  }) => Promise<"granted" | "denied" | "prompt">;
}

interface FilePickerWindow {
  showOpenFilePicker?: (
    options: PickerOptions
  ) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (
    options: PickerOptions
  ) => Promise<FileSystemFileHandle>;
}

interface HandleDataTransferItem {
  getAsFileSystemHandle?: () => Promise<FileSystemHandle | null>;
}

export interface LoadedFile {
  text: string;
  name: string;
  handle: FileSystemFileHandle | null;
  lastModified: number;
}

function getPickerWindow(): FilePickerWindow {
  return typeof window === "undefined"
    ? {}
    : (window as unknown as FilePickerWindow);
}

export const hasFileSystemAccess =
  typeof getPickerWindow().showOpenFilePicker === "function";

export async function pickMarkdownFile(): Promise<FileSystemFileHandle | null> {
  const pickerWindow = getPickerWindow();
  if (!pickerWindow.showOpenFilePicker) return null;
  try {
    const [handle] = await pickerWindow.showOpenFilePicker({
      types: MARKDOWN_PICKER_TYPES,
    });
    return handle ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
}

export async function pickSaveLocation(
  suggestedName: string
): Promise<FileSystemFileHandle | null> {
  const pickerWindow = getPickerWindow();
  if (!pickerWindow.showSaveFilePicker) return null;
  try {
    return await pickerWindow.showSaveFilePicker({
      types: MARKDOWN_PICKER_TYPES,
      suggestedName,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    throw error;
  }
}

export async function readHandle(
  handle: FileSystemFileHandle
): Promise<LoadedFile> {
  const file = await handle.getFile();
  return {
    text: await file.text(),
    name: handle.name,
    handle,
    lastModified: file.lastModified,
  };
}

export function readFile(file: File): Promise<LoadedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        text: String(reader.result),
        name: file.name,
        handle: null,
        lastModified: 0,
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function writeHandle(
  handle: FileSystemFileHandle,
  text: string
): Promise<number> {
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
  return (await handle.getFile()).lastModified;
}

export async function lastModifiedOf(
  handle: FileSystemFileHandle
): Promise<number | null> {
  try {
    return (await handle.getFile()).lastModified;
  } catch {
    return null;
  }
}

export async function requestHandlePermission(
  handle: FileSystemFileHandle
): Promise<boolean> {
  const permissionHandle = handle as unknown as PermissionHandle;
  if (!permissionHandle.requestPermission) return true;
  return (
    (await permissionHandle.requestPermission({ mode: "readwrite" })) ===
    "granted"
  );
}

export function droppedFileHandle(
  dataTransfer: DataTransfer | null
): Promise<FileSystemHandle | null> | null {
  const item = dataTransfer?.items?.[0] as
    | (DataTransferItem & HandleDataTransferItem)
    | undefined;
  return item?.getAsFileSystemHandle?.() ?? null;
}

export function reviewedFileName(name: string) {
  const base = name.replace(/\.(md|markdown|txt)$/i, "");
  return `${base.endsWith(REVIEWED_SUFFIX) ? base : base + REVIEWED_SUFFIX}.md`;
}

export function downloadMarkdown(text: string, name: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = reviewedFileName(name);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const LAST_HANDLE_KEY = "md-builder:last-handle";
const LEGACY_DB_NAME = "rawgrid-md-builder";
const LEGACY_STORE_NAME = "handles";
const LEGACY_HANDLE_KEY = "last";

export async function rememberHandle(handle: FileSystemFileHandle) {
  try {
    await writeAppState(LAST_HANDLE_KEY, handle);
  } catch {
    return;
  }
}

async function recallLegacyHandle(): Promise<FileSystemFileHandle | null> {
  if (!indexedDB.databases) return null;
  const databases = await indexedDB.databases();
  if (!databases.some((database) => database.name === LEGACY_DB_NAME)) {
    return null;
  }
  const db = await openDB(LEGACY_DB_NAME, 1);
  const handle = db.objectStoreNames.contains(LEGACY_STORE_NAME)
    ? ((await db.get(LEGACY_STORE_NAME, LEGACY_HANDLE_KEY)) as
        | FileSystemFileHandle
        | undefined)
    : undefined;
  db.close();
  await deleteDB(LEGACY_DB_NAME);
  return handle?.kind === "file" ? handle : null;
}

export async function recallHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const stored = await readAppState<FileSystemFileHandle>(LAST_HANDLE_KEY);
    if (stored?.kind === "file") return stored;
    const legacy = await recallLegacyHandle();
    if (legacy) await writeAppState(LAST_HANDLE_KEY, legacy);
    return legacy;
  } catch {
    return null;
  }
}
