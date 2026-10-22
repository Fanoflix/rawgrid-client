import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { locateDocument, MAX_IMAGE_BYTES, readImage } from "./files.js";

let project: string;
let outside: string;

beforeEach(async () => {
  project = await realpath(await mkdtemp(join(tmpdir(), "rawgrid-project-")));
  outside = await realpath(await mkdtemp(join(tmpdir(), "rawgrid-outside-")));
  await mkdir(join(project, "docs", "images"), { recursive: true });
  await mkdir(join(project, "notes"), { recursive: true });
  await mkdir(join(project, "node_modules", "pkg"), { recursive: true });
  await writeFile(join(project, "docs", "plan.md"), "\n# Data room plan\n\nbody\n");
  await writeFile(join(project, "notes", "plan.md"), "# Something else\n");
  await writeFile(join(project, "node_modules", "pkg", "plan.md"), "# Data room plan\n");
  await writeFile(join(project, "docs", "images", "meme.png"), Buffer.from([137, 80, 78, 71]));
  await writeFile(join(project, "docs", "notes.txt"), "text");
  await writeFile(join(outside, "secret.png"), Buffer.from([1, 2, 3]));
});

afterEach(async () => {
  await rm(project, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

describe("locateDocument", () => {
  it("finds the one file with that name and first line, skipping node_modules", async () => {
    expect(await locateDocument(project, { name: "plan.md", firstLine: "# Data room plan" })).toEqual({
      path: join(project, "docs", "plan.md"),
      candidates: [join(project, "docs", "plan.md")],
    });
  });

  it("returns no path when nothing matches, and every match when several files do", async () => {
    expect(await locateDocument(project, { name: "plan.md", firstLine: "# Missing" })).toEqual({ path: null, candidates: [] });
    await writeFile(join(project, "notes", "plan.md"), "# Data room plan\n");
    const located = await locateDocument(project, { name: "plan.md", firstLine: "# Data room plan" });
    expect(located.path).toBeNull();
    expect([...located.candidates].sort()).toEqual([join(project, "docs", "plan.md"), join(project, "notes", "plan.md")]);
  });

  it("trusts a hint inside the project that has the same name", async () => {
    await writeFile(join(project, "notes", "plan.md"), "# Data room plan\n");
    const located = await locateDocument(project, { name: "plan.md", firstLine: "# Data room plan", hint: "notes/plan.md" });
    expect(located.path).toBe(join(project, "notes", "plan.md"));
  });
});

describe("readImage", () => {
  it("reads an image inside the project as base64", async () => {
    const image = await readImage(project, "docs/images/meme.png", true);
    expect(image).toEqual({
      ok: true,
      path: join(project, "docs", "images", "meme.png"),
      mime: "image/png",
      size: 4,
      data: Buffer.from([137, 80, 78, 71]).toString("base64"),
    });
    expect(await readImage(project, join(project, "docs/images/meme.png"), false)).not.toHaveProperty("data");
  });

  it("refuses other file types, missing files, files outside the project and links out of it", async () => {
    expect(await readImage(project, "docs/notes.txt", true)).toEqual({ ok: false, reason: "not_an_image" });
    expect(await readImage(project, "docs/missing.png", true)).toEqual({ ok: false, reason: "image_not_found" });
    expect(await readImage(project, join(outside, "secret.png"), true)).toEqual({ ok: false, reason: "outside_project" });
    expect(await readImage(project, "../" + outside.split("/").pop() + "/secret.png", true)).toEqual({
      ok: false,
      reason: "outside_project",
    });
    await symlink(join(outside, "secret.png"), join(project, "docs", "linked.png"));
    expect(await readImage(project, "docs/linked.png", true)).toEqual({ ok: false, reason: "outside_project" });
  });

  it("refuses images over the size limit", async () => {
    await writeFile(join(project, "docs", "huge.png"), Buffer.alloc(MAX_IMAGE_BYTES + 1));
    expect(await readImage(project, "docs/huge.png", false)).toEqual({ ok: false, reason: "image_too_large" });
  });
});
