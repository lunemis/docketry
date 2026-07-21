import { NextResponse } from "next/server";
import { restoreRevision } from "../../../../../../../lib/store";

type Ctx = { params: Promise<{ id: string; revision: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { id, revision: rawRevision } = await ctx.params;
  const revision = Number(rawRevision);
  if (!Number.isInteger(revision) || revision < 1) {
    return NextResponse.json({ error: "invalid revision" }, { status: 400 });
  }
  const item = await restoreRevision(id, revision);
  if (!item) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ item, restored_from: revision });
}
