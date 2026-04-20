import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import type { QrCode, QrScan } from "@/types/db";

export type ReportPeriod = "weekly" | "monthly";

export type TopQr = {
  id: string;
  name: string;
  slug: string;
  scans: number;
};

export type RecentScan = {
  when: string;
  qr_name: string;
  device: string | null;
  country: string | null;
};

export type ReportData = {
  period: ReportPeriod;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  totalScans: number;
  previousPeriodScans: number;
  topQrs: TopQr[];
  recentScans: RecentScan[];
  totalQrCodes: number;
};

type ReportScanRow = Pick<
  QrScan,
  "id" | "qr_code_id" | "created_at" | "device" | "country"
>;

function formatRange(start: Date, exclusiveEnd: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} - ${fmt(new Date(exclusiveEnd.getTime() - 1))}`;
}

function getReportWindow(period: ReportPeriod, now = new Date()) {
  if (period === "monthly") {
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1));
    const prevStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
    return { start, end, prevStart };
  }

  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);
  return { start, end, prevStart };
}

async function fetchPeriodScans(
  supabase: ReturnType<typeof createServiceClient>,
  start: Date,
  end: Date,
): Promise<ReportScanRow[]> {
  const pageSize = 1000;
  const scans: ReportScanRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("qr_scans")
      .select("id, qr_code_id, created_at, device, country")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`Could not load report scans: ${error.message}`);

    const page = (data as ReportScanRow[] | null) ?? [];
    scans.push(...page);
    if (page.length < pageSize) return scans;
  }
}

export async function buildReport(period: ReportPeriod): Promise<ReportData> {
  const supabase = createServiceClient();
  const { start, end, prevStart } = getReportWindow(period);

  const [codesRes, scans, prevScansRes] = await Promise.all([
    supabase.from("qr_codes").select("id, name, slug"),
    fetchPeriodScans(supabase, start, end),
    supabase
      .from("qr_scans")
      .select("id", { count: "exact", head: true })
      .gte("created_at", prevStart.toISOString())
      .lt("created_at", start.toISOString()),
  ]);

  if (codesRes.error) throw new Error(`Could not load QR codes: ${codesRes.error.message}`);
  if (prevScansRes.error) {
    throw new Error(`Could not load previous report scans: ${prevScansRes.error.message}`);
  }

  const codes = (codesRes.data as Pick<QrCode, "id" | "name" | "slug">[] | null) ?? [];
  const codesById = new Map(codes.map((c) => [c.id, c]));

  const scanCounts = new Map<string, number>();
  for (const s of scans) scanCounts.set(s.qr_code_id, (scanCounts.get(s.qr_code_id) ?? 0) + 1);

  const topQrs: TopQr[] = [...scanCounts.entries()]
    .map(([id, scanCount]) => {
      const code = codesById.get(id);
      return { id, name: code?.name ?? "(deleted)", slug: code?.slug ?? "", scans: scanCount };
    })
    .sort((a, b) => b.scans - a.scans)
    .slice(0, 10);

  const recentScans: RecentScan[] = scans.slice(0, 10).map((s) => ({
    when: s.created_at,
    qr_name: codesById.get(s.qr_code_id)?.name ?? "(deleted)",
    device: s.device,
    country: s.country,
  }));

  return {
    period,
    periodLabel: formatRange(start, end),
    periodStart: start,
    periodEnd: end,
    totalScans: scans.length,
    previousPeriodScans: prevScansRes.count ?? 0,
    topQrs,
    recentScans,
    totalQrCodes: codes.length,
  };
}

export function renderReportHtml(r: ReportData): string {
  const delta = r.totalScans - r.previousPeriodScans;
  const deltaPct =
    r.previousPeriodScans === 0
      ? r.totalScans === 0
        ? "0%"
        : "+inf"
      : `${delta >= 0 ? "+" : ""}${Math.round((delta / r.previousPeriodScans) * 100)}%`;
  const deltaColor = delta >= 0 ? "#059669" : "#dc2626";

  const title = r.period === "weekly" ? "Weekly QR report" : "Monthly QR report";

  const topRows = r.topQrs.length
    ? r.topQrs
        .map(
          (q) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(q.name)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(q.slug)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-variant-numeric:tabular-nums;">${q.scans}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#888;">No scans in this period.</td></tr>`;

  const recentRows = r.recentScans.length
    ? r.recentScans
        .map(
          (s) => `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f1f1;color:#444;font-size:12px;">${new Date(s.when).toLocaleString()}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f1f1;">${escapeHtml(s.qr_name)}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f1f1;color:#666;font-size:12px;">${escapeHtml(s.device ?? "-")}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f1f1;color:#666;font-size:12px;">${escapeHtml(s.country ?? "-")}</td>
          </tr>`,
        )
        .join("")
    : "";

  return `<!doctype html><html><body style="margin:0;padding:0;background:#fafafa;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#171717;">
  <div style="max-width:640px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-size:20px;margin:0 0 4px;">${title}</h1>
    <p style="margin:0 0 24px;color:#737373;font-size:14px;">${r.periodLabel}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;border:1px solid #e5e5e5;border-radius:8px;background:#fff;width:50%;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#737373;">Total scans</div>
          <div style="font-size:24px;font-weight:600;margin-top:4px;">${r.totalScans}</div>
          <div style="font-size:12px;color:${deltaColor};margin-top:2px;">${deltaPct} vs previous ${r.period === "weekly" ? "week" : "month"}</div>
        </td>
        <td style="width:12px;"></td>
        <td style="padding:16px;border:1px solid #e5e5e5;border-radius:8px;background:#fff;width:50%;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#737373;">QR codes</div>
          <div style="font-size:24px;font-weight:600;margin-top:4px;">${r.totalQrCodes}</div>
        </td>
      </tr>
    </table>

    <h2 style="font-size:14px;margin:0 0 8px;">Top QR codes</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;background:#fff;margin-bottom:24px;">
      <thead><tr style="background:#fafafa;">
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#737373;">Name</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#737373;">Slug</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#737373;">Scans</th>
      </tr></thead>
      <tbody>${topRows}</tbody>
    </table>

    ${
      recentRows
        ? `<h2 style="font-size:14px;margin:0 0 8px;">Recent scans</h2>
           <table style="width:100%;border-collapse:collapse;border:1px solid #e5e5e5;border-radius:8px;overflow:hidden;background:#fff;">
             <tbody>${recentRows}</tbody>
           </table>`
        : ""
    }

    <p style="margin-top:24px;font-size:12px;color:#a3a3a3;">Sent automatically by QR Tracker.</p>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
