import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import {
  defaultCategorySettings,
  parseCategorySettings,
} from "../src/lib/categories";
import {
  readCategorySettings,
  writeCategorySettings,
} from "../src/lib/category-store";

let dataDir: string;

before(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "dropboard-categories-"));
  process.env.DROPBOARD_DATA_DIR = dataDir;
});

after(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

test("category settings keep fixed IDs while allowing display preferences", () => {
  const settings = defaultCategorySettings();
  settings.categories.reverse();
  settings.categories[0] = {
    ...settings.categories[0],
    label: "Ideas",
    color: "#ABCDEF",
    hidden: true,
  };
  const result = parseCategorySettings(settings);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.categories[0].label, "Ideas");
  assert.equal(result.value.categories[0].color, "#abcdef");
  assert.equal(result.value.categories[0].hidden, true);
});

test("category settings reject missing or duplicate semantic IDs", () => {
  const settings = defaultCategorySettings();
  settings.categories[0].id = settings.categories[1].id;
  assert.equal(parseCategorySettings(settings).ok, false);
  assert.equal(
    parseCategorySettings({ categories: settings.categories.slice(1) }).ok,
    false,
  );
});

test("category settings persist in the data directory", async () => {
  const settings = defaultCategorySettings();
  settings.categories[0].label = "Needs review";
  await writeCategorySettings(settings);
  assert.deepEqual(await readCategorySettings(), settings);
  const stored = JSON.parse(
    await readFile(path.join(dataDir, "_settings", "categories.json"), "utf8"),
  );
  assert.equal(stored.categories[0].label, "Needs review");
});

test("invalid stored settings safely fall back to defaults", async () => {
  await mkdir(path.join(dataDir, "_settings"), { recursive: true });
  await writeFile(
    path.join(dataDir, "_settings", "categories.json"),
    JSON.stringify({ categories: [] }),
  );
  assert.deepEqual(await readCategorySettings(), defaultCategorySettings());
});
