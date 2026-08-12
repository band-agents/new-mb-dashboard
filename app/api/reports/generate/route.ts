import { NextResponse } from "next/server";
import { requireClientInScope } from "@/lib/data/scope";
import { getCampaignsTable } from "@/lib/data/campaigns.service";
import { isPlatformSelection } from "@/lib/platforms/config";

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, start, end, campaignIds, platform } = body as {
    clientId: string;
    start: string;
    end: string;
    campaignIds?: string[];
    platform?: string;
  };

  if (!clientId || !start || !end) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Scope check — throws/redirects are for pages, so re-implement the guard as a 403 here.
  try {
    await requireClientInScope(clientId);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Reports are single-platform only (never mix Meta and TikTok campaigns in one export) — see plan.
  const resolvedPlatform = isPlatformSelection(platform) && platform !== "ALL" ? platform : "META";

  const rows = await getCampaignsTable({ clientId, start: new Date(start), end: new Date(end), platform: resolvedPlatform });
  const filtered = campaignIds?.length ? rows.filter((r) => campaignIds.includes(r.id)) : rows;

  return NextResponse.json({ rows: filtered });
}
