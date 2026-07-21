import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  defaultCategorySettings,
  parseCategorySettings,
  type CategorySettings,
} from "./categories";

let settingsWrite = Promise.resolve();

function settingsDir(): string {
  const dataDir = process.env.DROPBOARD_DATA_DIR || "./data/items";
  return path.join(dataDir, "_settings");
}

function settingsPath(): string {
  return path.join(settingsDir(), "categories.json");
}

export async function readCategorySettings(): Promise<CategorySettings> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(settingsPath(), "utf8"));
    const result = parseCategorySettings(parsed);
    if (result.ok) return result.value;
    console.warn(`[dropboard] ignoring invalid category settings: ${result.error}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(
        "[dropboard] cannot read category settings:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  return defaultCategorySettings();
}

export async function writeCategorySettings(
  settings: CategorySettings,
): Promise<void> {
  const task = settingsWrite.then(async () => {
    const directory = settingsDir();
    await fs.mkdir(directory, { recursive: true });
    const destination = settingsPath();
    const temporary = path.join(directory, `.categories-${randomUUID()}.tmp`);
    try {
      await fs.writeFile(temporary, JSON.stringify(settings, null, 2) + "\n", {
        encoding: "utf8",
        flag: "wx",
      });
      await fs.rename(temporary, destination);
    } catch (error) {
      await fs.rm(temporary, { force: true });
      throw error;
    }
  });
  settingsWrite = task.catch(() => undefined);
  await task;
}
