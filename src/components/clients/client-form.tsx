"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Client } from "@/lib/domain/types";

interface ClientFormProps {
  client?: Client;
}

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      email: (fd.get("email") as string) || undefined,
      phone: (fd.get("phone") as string) || undefined,
      addressLine1: (fd.get("addressLine1") as string) || undefined,
      addressLine2: (fd.get("addressLine2") as string) || undefined,
      city: (fd.get("city") as string) || undefined,
      postcode: (fd.get("postcode") as string) || undefined,
      country: (fd.get("country") as string) || undefined,
      vatNumber: (fd.get("vatNumber") as string) || undefined,
      paymentTermsDays: parseInt(fd.get("paymentTermsDays") as string, 10) || 30,
      notes: (fd.get("notes") as string) || undefined,
    };

    try {
      const url = client ? `/api/clients/${client.id}` : "/api/clients";
      const method = client ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save client.");
        return;
      }
      router.push("/clients");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const field = (
    label: string,
    name: string,
    opts?: { type?: string; placeholder?: string; defaultValue?: string | number; required?: boolean }
  ) => (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--color-foreground)]">
        {label}
        {opts?.required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
      </label>
      <input
        name={name}
        type={opts?.type ?? "text"}
        placeholder={opts?.placeholder}
        defaultValue={opts?.defaultValue}
        required={opts?.required}
        className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 space-y-4">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Basic details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("Client name", "name", { required: true, placeholder: "Acme Ltd", defaultValue: client?.name })}
          {field("Email address", "email", { type: "email", placeholder: "billing@client.com", defaultValue: client?.email ?? "" })}
          {field("Phone", "phone", { placeholder: "+44 7700 900000", defaultValue: client?.phone ?? "" })}
          {field("VAT number", "vatNumber", { placeholder: "GB123456789", defaultValue: client?.vatNumber ?? "" })}
          {field("Payment terms (days)", "paymentTermsDays", {
            type: "number",
            placeholder: "30",
            defaultValue: client?.paymentTermsDays ?? 30,
          })}
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 space-y-4">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Address</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("Address line 1", "addressLine1", { placeholder: "123 High Street", defaultValue: client?.addressLine1 ?? "" })}
          {field("Address line 2", "addressLine2", { placeholder: "Suite 4", defaultValue: client?.addressLine2 ?? "" })}
          {field("City", "city", { placeholder: "London", defaultValue: client?.city ?? "" })}
          {field("Postcode", "postcode", { placeholder: "SW1A 1AA", defaultValue: client?.postcode ?? "" })}
          {field("Country", "country", { placeholder: "United Kingdom", defaultValue: client?.country ?? "United Kingdom" })}
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 space-y-4">
        <h2 className="text-base font-semibold text-[var(--color-foreground)]">Notes</h2>
        <textarea
          name="notes"
          rows={3}
          placeholder="Any notes about this client..."
          defaultValue={client?.notes ?? ""}
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : client ? "Save changes" : "Add client"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
