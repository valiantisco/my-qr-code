import Link from "next/link";
import { Card, CardBody } from "@/components/ui";
import { QrForm } from "@/components/qr-form";

export default function NewQrPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs text-neutral-500 hover:underline">
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">New QR code</h1>
      </div>
      <Card>
        <CardBody>
          <QrForm mode={{ kind: "create" }} />
        </CardBody>
      </Card>
    </div>
  );
}
