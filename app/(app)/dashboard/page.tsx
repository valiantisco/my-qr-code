import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, buttonClassName, Card, Stat } from "@/components/ui";
import { ReportTriggers } from "@/components/report-triggers";
import { formatRelative } from "@/lib/format";
import type { QrCode, QrScan } from "@/types/db";

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

  const [codesRes, scans, totalScansRes, scans7Res, scans30Res] = await Promise.all([
    supabase
      .from("qr_codes")
      .select("*")
      .order("created_at", { ascending: false }),
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

  const codes = (codesRes.data as QrCode[] | null) ?? [];
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

      <Card>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 className="text-sm font-semibold">All QR codes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Name</th>
                <th className="px-5 py-2.5 font-medium">Slug</th>
                <th className="px-5 py-2.5 font-medium">Destination</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
                <th className="px-5 py-2.5 font-medium text-right">Scans</th>
                <th className="px-5 py-2.5 font-medium text-right">Last scan</th>
              </tr>
            </thead>
            <tbody>
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-neutral-500">
                    No QR codes yet.{" "}
                    <Link href="/qr/new" className="underline">
                      Create one.
                    </Link>
                  </td>
                </tr>
              ) : (
                codes.map((code) => {
                  const agg = scanAgg.get(code.id);
                  return (
                    <tr
                      key={code.id}
                      className="border-t border-neutral-100 hover:bg-neutral-50"
                    >
                      <td className="px-5 py-3">
                        <Link href={`/qr/${code.id}`} className="font-medium hover:underline">
                          {code.name}
                        </Link>
                        {code.campaign ? (
                          <div className="text-xs text-neutral-500">{code.campaign}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-neutral-700">
                        {code.slug}
                      </td>
                      <td className="px-5 py-3">
                        <span className="block max-w-[280px] truncate text-neutral-700">
                          {code.destination_url}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {code.is_active ? (
                          <Badge tone="green">Active</Badge>
                        ) : (
                          <Badge tone="red">Disabled</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {agg?.count ?? 0}
                      </td>
                      <td className="px-5 py-3 text-right text-neutral-600">
                        {formatRelative(agg?.last ?? null)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
