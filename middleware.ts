import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets and the public redirect endpoint.
    "/((?!_next/static|_next/image|favicon.ico|r/|api/reports|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
