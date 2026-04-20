import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buttonClassName, Stat } from "@/components/ui";
import { QrTable, type DashboardQr } from "@/components/qr-table";
import { ReportTriggers } from "@/components/report-triggers";
import { publicEnv } from "@/lib/env";
import type { QrCode, QrFolder, QrScan } from "@/types/db";

export const dynamic = "force-dynamic";

function startOfDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

type DashboardScanRow = Pick<QrScan, "qr_code_id" | "created_at">;

async function fetchDashboardScanRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<DashboardScanRow[]> {
  const pageSize = 1000;
  const rows: DashboardScanRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("qr_scans")
      .select("qr_code_id, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Could not load scan stats: ${error.message}`);

    const page = (data as DashboardScanRow[] | null) ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [codesRes, foldersRes, scans, totalScansRes, scans7Res, scans30Res] = await Promise.all([
    supabase
      .from("qr_codes")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("qr_folders")
      .select("*")
      .order("name", { ascending: true }),
    fetchDashboardScanRows(supabase),
    supabase.from("qr_scans").select("id", { count: "exact", head: true }),
    supabase
      .from("qr_scans")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDaysAgo(7)),
    supabase
      .from("qr_scans")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDaysAgo(30)),
  ]);

  if (codesRes.error) throw new Error(`Could not load QR codes: ${codesRes.error.message}`);
  if (foldersRes.error) throw new Error(`Could not load folders: ${foldersRes.error.message}`);

  const codes = (codesRes.data as QrCode[] | null) ?? [];
  const folders = (foldersRes.data as QrFolder[] | null) ?? [];
  const totalScans = totalScansRes.count ?? scans.length;
  const scans7 = scans7Res.count ?? 0;
  const scans30 = scans30Res.count ?? 0;

  const scanAgg = new Map<string, { count: number; last: string | null }>();
  for (const s of scans) {
    const cur = scanAgg.get(s.qr_code_id) ?? { count: 0, last: null };
    cur.count += 1;
    if (!cur.last || s.created_at > cur.last) cur.last = s.created_at;
    scanAgg.set(s.qr_code_id, cur);
  }

  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const dashboardCodes: DashboardQr[] = codes.map((code) => {
    const agg = scanAgg.get(code.id);
    return {
      id: code.id,
      name: code.name,
      slug: code.slug,
      destination_url: code.destination_url,
      campaign: code.campaign,
      is_active: code.is_active,
      folder_id: code.folder_id,
      folder_name: code.folder_id ? foldersById.get(code.folder_id)?.name ?? null : null,
      total_scans: agg?.count ?? 0,
      last_scan_at: agg?.last ?? null,
      redirect_url: `${publicEnv.siteUrl}/r/${code.slug}`,
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-500">
            {codes.length} QR code{codes.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/qr/new" className={buttonClassName()}>
          New QR code
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total QR codes" value={codes.length} />
        <Stat label="Total scans" value={totalScans} />
        <Stat label="Scans - 7d" value={scans7} />
        <Stat label="Scans - 30d" value={scans30} />
      </div>

      <ReportTriggers />

      <QrTable codes={dashboardCodes} folders={folders} />
    </div>
  );
}
