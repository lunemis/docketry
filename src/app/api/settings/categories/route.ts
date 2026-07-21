import { NextResponse } from "next/server";
import { parseCategorySettings } from "../../../../lib/categories";
import {
  readCategorySettings,
  writeCategorySettings,
} from "../../../../lib/category-store";
import { readJsonObject } from "../../../../lib/request";

const MAX_SETTINGS_BYTES = 16 * 1024;

export async function GET() {
  return NextResponse.json(await readCategorySettings());
}

export async function PUT(request: Request) {
  const body = await readJsonObject(request, MAX_SETTINGS_BYTES);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }
  const settings = parseCategorySettings(body.value);
  if (!settings.ok) {
    return NextResponse.json({ error: settings.error }, { status: 400 });
  }
  await writeCategorySettings(settings.value);
  return NextResponse.json(settings.value);
}
