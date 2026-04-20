"use client";

import { useState } from "react";
import { Button, Card, CardBody } from "@/components/ui";

export function ReportTriggers() {
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<"weekly" | "monthly" | null>(null);

  async function send(period: "weekly" | "monthly") {
    setBusy(period);
    setMsg(null);
    try {
      const res = await fetch(`/api/reports/${period}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setMsg({ tone: "err", text: data.error ?? "Failed to send report" });
      } else {
        setMsg({ tone: "ok", text: `Sent ${period} report (${data.totalScans} scans)` });
      }
    } catch {
      setMsg({ tone: "err", text: "Could not reach the report endpoint" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">Send report now</div>
          <div className="text-xs text-neutral-500">
            Reports are also sent automatically via Vercel Cron.
          </div>
          {msg ? (
            <div
              className={
                "mt-2 text-xs " +
                (msg.tone === "ok" ? "text-emerald-600" : "text-red-600")
              }
            >
              {msg.text}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => send("weekly")}
          >
            {busy === "weekly" ? "Sending..." : "Send weekly"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy !== null}
            onClick={() => send("monthly")}
          >
            {busy === "monthly" ? "Sending..." : "Send monthly"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
