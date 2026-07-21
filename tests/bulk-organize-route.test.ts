import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";

let dataDir: string;
let PATCH: typeof import("../src/app/api/items/bulk-organize/route").PATCH;
let store: typeof import("../src/lib/store");

before(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "dropboard-bulk-organize-"));
  process.env.DROPBOARD_DATA_DIR = dataDir;
  store = await import("../src/lib/store");
  ({ PATCH } = await import("../src/app/api/items/bulk-organize/route"));
});

after(async () => {
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/items/bulk-organize", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function archivedItem(title: string) {
  const item = await store.createItem({
    title,
    type: "info",
    content: title,
  });
  return (await store.updateItem(item.id, { status: "archived" }))!;
}

test("organizes archived items together while preserving tags", async () => {
  const first = await archivedItem("First");
  const second = await archivedItem("Second");
  await store.updateItem(first.id, { tags: ["keep-me"] });

  const response = await PATCH(
    request({
      item_ids: [second.id, first.id, first.id],
      project: " Dropboard ",
      folder: " Research / Agents ",
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.items.length, 2);
  assert.deepEqual(
    body.items.map((item: { id: string }) => item.id),
    [first.id, second.id].sort(),
  );

  const updatedFirst = await store.getItem(first.id);
  const updatedSecond = await store.getItem(second.id);
  assert.equal(updatedFirst?.project, "Dropboard");
  assert.equal(updatedFirst?.folder, "Research/Agents");
  assert.deepEqual(updatedFirst?.tags, ["keep-me"]);
  assert.equal(updatedSecond?.project, "Dropboard");
});

test("validates every target before changing any item", async () => {
  const archived = await archivedItem("Stay put");
  const inbox = await store.createItem({
    title: "Inbox",
    type: "info",
    content: "Inbox",
  });

  const response = await PATCH(
    request({
      item_ids: [archived.id, inbox.id],
      project: "Must not apply",
      folder: "",
    }),
  );
  assert.equal(response.status, 409);
  assert.deepEqual((await response.json()).item_ids, [inbox.id]);
  assert.equal((await store.getItem(archived.id))?.project, null);
});

test("rejects missing targets and invalid organization fields", async () => {
  const archived = await archivedItem("Validation");
  const missingId = "20260721-120000-none";
  const missing = await PATCH(
    request({
      item_ids: [archived.id, missingId],
      project: "Must not apply",
      folder: "",
    }),
  );
  assert.equal(missing.status, 404);
  assert.equal((await store.getItem(archived.id))?.project, null);

  assert.equal(
    (
      await PATCH(
        request({
          item_ids: [archived.id],
          project: "Dropboard",
          folder: "Research/../Secret",
        }),
      )
    ).status,
    400,
  );
  assert.equal(
    (await PATCH(request({ item_ids: [], project: "Dropboard", folder: "" })))
      .status,
    400,
  );
});
