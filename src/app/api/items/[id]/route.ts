import { NextRequest, NextResponse } from "next/server";
import { signRawUrl } from "../../../../lib/session";
import { readJsonObject } from "../../../../lib/request";
import { deleteItem, getItem, updateItem } from "../../../../lib/store";
import { ITEM_STATUSES, type ItemStatus } from "../../../../lib/types";

type Ctx = { params: Promise<{ id: string }> };

const RAW_URL_TTL_MS = 60 * 60 * 1000;
const MAX_PATCH_BYTES = 16 * 1024;
const PATCH_KEYS = new Set([
  "status",
  "pinned",
  "read",
  "keep",
  "ttl_minutes",
]);

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const item = await getItem(id);
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });

  // signed raw URL for the sandboxed viewer iframe (sends no cookies)
  let raw_url = `/api/items/${id}/raw`;
  const secret = process.env.DROPBOARD_SESSION_SECRET;
  if (secret) {
    const exp = Date.now() + RAW_URL_TTL_MS;
    raw_url += `?e=${exp}&st=${await signRawUrl(secret, id, exp)}`;
  }
  return NextResponse.json({ item, raw_url });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const parsedBody = await readJsonObject(req, MAX_PATCH_BYTES);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.error },
      { status: parsedBody.status },
    );
  }
  const body = parsedBody.value;

  const unknownKeys = Object.keys(body).filter((key) => !PATCH_KEYS.has(key));
  if (unknownKeys.length > 0) {
    return NextResponse.json(
      { error: `unknown patch field: ${unknownKeys[0]}` },
      { status: 400 },
    );
  }
  if (Object.keys(body).length === 0) {
    return NextResponse.json({ error: "empty patch" }, { status: 400 });
  }

  if (
    body.status !== undefined &&
    !ITEM_STATUSES.includes(body.status as ItemStatus)
  ) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  for (const field of ["pinned", "read", "keep"] as const) {
    if (body[field] !== undefined && typeof body[field] !== "boolean") {
      return NextResponse.json(
        { error: `${field} must be boolean` },
        { status: 400 },
      );
    }
  }
  const ttl = body.ttl_minutes;
  if (
    ttl !== undefined &&
    (typeof ttl !== "number" || !Number.isFinite(ttl) || ttl < 1 || ttl > 10080)
  ) {
    return NextResponse.json(
      { error: "ttl_minutes must be a number between 1 and 10080 (7 days)" },
      { status: 400 },
    );
  }
  if (body.keep === true && ttl !== undefined) {
    return NextResponse.json(
      { error: "keep and ttl_minutes cannot be combined" },
      { status: 400 },
    );
  }

  const item = await updateItem(id, {
    status: body.status as ItemStatus | undefined,
    pinned: typeof body.pinned === "boolean" ? body.pinned : undefined,
    read: typeof body.read === "boolean" ? body.read : undefined,
    keep: body.keep === true ? true : undefined,
    ttl_minutes: ttl as number | undefined,
  });
  if (!item) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await deleteItem(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
