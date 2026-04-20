"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/ui";
import type { QrCode } from "@/types/db";

type Mode = { kind: "create" } | { kind: "edit"; qr: QrCode };

export function QrForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const initial = mode.kind === "edit" ? mode.qr : null;

  const [name, setName] = useState(initial?.name ?? "");
  const [destination, setDestination] = useState(initial?.destination_url ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [campaign, setCampaign] = useState(initial?.campaign ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const payload = {
      name,
      destination_url: destination,
      slug: slug || undefined,
      campaign: campaign || undefined,
      notes: notes || undefined,
      is_active: isActive,
    };

    const url = mode.kind === "create" ? "/api/qr" : `/api/qr/${mode.qr.id}`;
    const method = mode.kind === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setPending(false);
        return;
      }

      router.push(mode.kind === "create" ? `/qr/${data.qr.id}` : `/qr/${mode.qr.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the QR endpoint. Check your connection and try again.");
      setPending(false);
    }
  }

  async function onDelete() {
    if (mode.kind !== "edit") return;
    if (!confirm("Delete this QR code and all its scans?")) return;

    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/qr/${mode.qr.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Delete failed");
        setPending(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the QR endpoint. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Field label="Name" htmlFor="qr-name">
        <Input
          id="qr-name"
          required
          value={name}
          placeholder="Fall campaign poster"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Destination URL" htmlFor="qr-destination">
        <Input
          id="qr-destination"
          required
          inputMode="url"
          value={destination}
          placeholder="https://example.com/landing"
          onChange={(e) => setDestination(e.target.value)}
        />
      </Field>

      <Field
        label="Custom slug"
        htmlFor="qr-slug"
        hint="Leave blank to auto-generate. Lowercase letters, numbers, single dashes."
      >
        <Input
          id="qr-slug"
          value={slug}
          placeholder="fall-24"
          onChange={(e) => setSlug(e.target.value)}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Campaign / tag (optional)" htmlFor="qr-campaign">
          <Input
            id="qr-campaign"
            value={campaign ?? ""}
            onChange={(e) => setCampaign(e.target.value)}
          />
        </Field>
        <Field label="Active" htmlFor="qr-active">
          <label className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm">
            <input
              id="qr-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            Redirects enabled
          </label>
        </Field>
      </div>

      <Field label="Notes (optional)" htmlFor="qr-notes">
        <Textarea
          id="qr-notes"
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Printed on 200 posters, distributed at event."
        />
      </Field>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center justify-between gap-4">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Saving..."
            : mode.kind === "create"
              ? "Create QR code"
              : "Save changes"}
        </Button>
        {mode.kind === "edit" ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={onDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
