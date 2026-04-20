import { type NextRequest } from "next/server";
import { sendReport } from "@/lib/report-delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  return sendReport(req, "weekly");
}

export async function POST(req: NextRequest) {
  return sendReport(req, "weekly");
}
