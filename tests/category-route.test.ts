import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

let dataDir: string;
let GET: typeof import("../src/app/api/settings/categories/route").GET;
let PUT: typeof import("../src/app/api/settings/categories/route").PUT;

before(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "dropboard-category-route-"));
  process.env.DROPBOARD_DATA_DIR = dataDir;
  ({ GET, PUT } = await import("../src/app/api/settings/categories/route"));
});

after(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

test("category API returns defaults and persists display changes", async () => {
  const initial = await GET();
  assert.equal(initial.status, 200);
  const settings = await initial.json();
  settings.categories[0].label = "Check";
  settings.categories[0].color = "#123456";

  const saved = await PUT(
    new Request("http://localhost/api/settings/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
  );
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).categories[0].label, "Check");
  assert.equal((await GET().then((response) => response.json())).categories[0].color, "#123456");
});

test("category API rejects changes to the fixed ID contract", async () => {
  const settings = await GET().then((response) => response.json());
  settings.categories[0].id = "custom";
  const response = await PUT(
    new Request("http://localhost/api/settings/categories", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  );
  assert.equal(response.status, 400);
});
