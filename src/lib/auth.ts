import { timingSafeEqual } from "node:crypto";

/** Write-API auth: Authorization: Bearer $DOCKET_TOKEN. */
export function isWriteAuthorized(req: Request): boolean {
  const token = process.env.DOCKET_TOKEN;
  if (!token) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${token}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
