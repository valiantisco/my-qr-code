import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { getCronSecret, getReportEnv } from "@/lib/env";
import { buildReport, renderReportHtml, type ReportPeriod } from "@/lib/report";
import { resend } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";

export async function sendReport(req: NextRequest, period: ReportPeriod) {
  try {
    if (!(await isAuthorizedReportRequest(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reportEnv = getReportEnv();
    const data = await buildReport(period);
    const html = renderReportHtml(data);
    const label = period === "weekly" ? "Weekly" : "Monthly";

    const result = await resend().emails.send({
      from: reportEnv.fromEmail,
      to: reportEnv.toEmail,
      subject: `${label} QR report - ${data.periodLabel}`,
      html,
    });

    if (result.error) {
      return NextResponse.json(
        { ok: false, error: result.error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, totalScans: data.totalScans });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to send report",
      },
      { status: 500 },
    );
  }
}

async function isAuthorizedReportRequest(req: NextRequest): Promise<boolean> {
  const cronSecret = getCronSecret();
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) {
    return true;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
