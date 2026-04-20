import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { isValidSlug } from "@/lib/slug";
import { createServiceClient } from "@/lib/supabase/server";
import { parseUserAgent } from "@/lib/user-agent";
import { isRedirectLoopTarget, parseHttpUrl } from "@/lib/url";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function disabledHtml(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${message}</title>
     <meta name="viewport" content="width=device-width,initial-scale=1">
     <style>body{font-family:ui-sans-serif,system-ui,sans-serif;background:#fafafa;color:#171717;
     display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
     .c{max-width:420px;padding:24px;text-align:center}
     h1{font-size:18px;margin:0 0 6px}p{color:#737373;font-size:14px;margin:0}</style></head>
     <body><div class="c"><h1>${message}</h1><p>This link is not available.</p></div></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

function safeDecodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) return disabledHtml("Link not found", 404);

  const supabase = createServiceClient();

  const { data: qr, error } = await supabase
    .from("qr_codes")
    .select("id, destination_url, is_active")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !qr) return disabledHtml("Link not found", 404);
  if (!qr.is_active) return disabledHtml("Link disabled", 410);

  const destination = parseHttpUrl(qr.destination_url);
  if (!destination || isRedirectLoopTarget(destination.toString(), publicEnv.siteUrl)) {
    return disabledHtml("Destination unavailable", 502);
  }

  const ua = req.headers.get("user-agent");
  const parsed = parseUserAgent(ua);

  // Vercel adds geo headers on production deployments.
  const country = req.headers.get("x-vercel-ip-country") || null;
  const city = safeDecodeHeader(req.headers.get("x-vercel-ip-city"));

  await withTimeout(
    supabase
      .from("qr_scans")
      .insert({
        qr_code_id: qr.id,
        referrer: req.headers.get("referer") || null,
        user_agent: ua,
        ip: getClientIp(req),
        country,
        city,
        device: parsed.device,
        browser: parsed.browser,
        os: parsed.os,
      })
      .then(() => null, () => null),
    750,
  );

  return NextResponse.redirect(destination, { status: 302 });
}
