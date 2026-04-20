import Link from "next/link";
import { Button } from "@/components/ui";

export function TopNav({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            QR Tracker
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/dashboard" className="hover:text-neutral-900">
              Dashboard
            </Link>
            <Link href="/qr/new" className="hover:text-neutral-900">
              New QR
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {email ? (
            <span className="hidden max-w-[220px] truncate text-xs text-neutral-500 sm:block">
              {email}
            </span>
          ) : null}
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
