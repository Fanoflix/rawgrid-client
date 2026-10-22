import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";

export const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const SKIPPED_FOLDERS = new Set(["node_modules", "dist", "build", "coverage", "out", "target", "vendor"]);
const MAX_VISITED_ENTRIES = 200_000;
const MAX_CANDIDATES = 5;
const FIRST_LINE_BYTES = 4096;

export type ImageFailure = "image_not_found" | "not_an_image" | "outside_project" | "image_too_large";

export type ImageResult =
  | { ok: true; path: string; mime: string; size: number; data?: string }
  | { ok: false; reason: ImageFailure };

export interface LocateRequest {
  name: string;
  firstLine: string;
  hint?: string;
}

export interface LocateResult {
  path: string | null;
  candidates: string[];
}

async function realPathInside(root: string, target: string) {
  try {
    const realRoot = await realpath(root);
    const realTarget = await realpath(target);
    const fromRoot = relative(realRoot, realTarget);
    const isInside = fromRoot !== "" && !fromRoot.startsWith("..") && !isAbsolute(fromRoot);
    return isInside ? realTarget : null;
  } catch {
    return null;
  }
}

async function firstLineOf(path: string) {
  try {
    const text = await readFile(path, "utf8");
    const line = text.slice(0, FIRST_LINE_BYTES).split("\n").find((candidate) => candidate.trim());
    return line?.trim() ?? "";
  } catch {
    return null;
  }
}

async function filesNamed(root: string, name: string) {
  const found: string[] = [];
  const folders = [root];
  let visited = 0;
  while (folders.length && visited < MAX_VISITED_ENTRIES) {
    const folder = folders.shift()!;
    let entries;
    try {
      entries = await readdir(folder, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      visited += 1;
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !SKIPPED_FOLDERS.has(entry.name)) {
          folders.push(join(folder, entry.name));
        }
      } else if (entry.isFile() && entry.name === name) {
        found.push(join(folder, entry.name));
      }
    }
  }
  return found;
}

export async function locateDocument(cwd: string, request: LocateRequest): Promise<LocateResult> {
  if (request.hint) {
    const hinted = await realPathInside(cwd, resolve(cwd, request.hint));
    if (hinted && basename(hinted) === request.name) return { path: hinted, candidates: [hinted] };
  }
  const root = await realpath(cwd).catch(() => null);
  if (!root) return { path: null, candidates: [] };
  const named = await filesNamed(root, request.name);
  const firstLine = request.firstLine.trim();
  const lines = await Promise.all(named.map(firstLineOf));
  const matches = named.filter((_, index) => lines[index] === firstLine);
  return {
    path: matches.length === 1 ? matches[0] : null,
    candidates: matches.slice(0, MAX_CANDIDATES),
  };
}

export async function readImage(cwd: string, requested: string, includeData: boolean): Promise<ImageResult> {
  const target = resolve(cwd, requested);
  const mime = IMAGE_TYPES[extname(target).toLowerCase()];
  if (!mime) return { ok: false, reason: "not_an_image" };
  const info = await stat(target).catch(() => null);
  if (!info?.isFile()) return { ok: false, reason: "image_not_found" };
  const inside = await realPathInside(cwd, target);
  if (!inside) return { ok: false, reason: "outside_project" };
  if (info.size > MAX_IMAGE_BYTES) return { ok: false, reason: "image_too_large" };
  if (!includeData) return { ok: true, path: inside, mime, size: info.size };
  const data = (await readFile(inside)).toString("base64");
  return { ok: true, path: inside, mime, size: info.size, data };
}
