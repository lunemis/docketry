import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

let dataDir: string;
let itemId: string;
let GET: typeof import("../src/app/api/items/[id]/revisions/route").GET;
let POST: typeof import("../src/app/api/items/[id]/revisions/route").POST;
let RESTORE: typeof import("../src/app/api/items/[id]/revisions/[revision]/restore/route").POST;

before(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "dropboard-revision-route-"));
  process.env.DROPBOARD_DATA_DIR = dataDir;
  process.env.DROPBOARD_SESSION_SECRET = "revision-route-secret-long-enough";
  const store = await import("../src/lib/store");
  itemId = (
    await store.createItem({
      title: "Versioned API item",
      type: "review",
      content: "v1",
    })
  ).id;
  ({ GET, POST } = await import("../src/app/api/items/[id]/revisions/route"));
  ({ POST: RESTORE } = await import(
    "../src/app/api/items/[id]/revisions/[revision]/restore/route"
  ));
});

after(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

test("revision API appends and lists signed immutable versions", async () => {
  const ctx = { params: Promise.resolve({ id: itemId }) };
  const response = await POST(
    new Request(`http://localhost/api/items/${itemId}/revisions`, {
      method: "POST",
      body: JSON.stringify({
        content: "v2",
        content_type: "html",
        revision_note: "Updated copy",
        expected_revision: 1,
      }),
    }),
    ctx,
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).item.revision, 2);

  const listed = await GET(new Request("http://localhost"), ctx);
  const body = await listed.json();
  assert.deepEqual(
    body.revisions.map((revision: { revision: number }) => revision.revision),
    [2, 1],
  );
  assert.match(body.revisions[0].raw_url, /v=2.*st=/);
});

test("revision API returns a conflict for a stale expected version", async () => {
  const response = await POST(
    new Request(`http://localhost/api/items/${itemId}/revisions`, {
      method: "POST",
      body: JSON.stringify({
        content: "stale",
        content_type: "html",
        expected_revision: 1,
      }),
    }),
    { params: Promise.resolve({ id: itemId }) },
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).current_revision, 2);
});

test("restore API creates another revision", async () => {
  const response = await RESTORE(new Request("http://localhost", { method: "POST" }), {
    params: Promise.resolve({ id: itemId, revision: "1" }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.item.revision, 3);
  assert.equal(body.restored_from, 1);
});
