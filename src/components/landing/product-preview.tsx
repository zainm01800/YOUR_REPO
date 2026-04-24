export function ProductPreview() {
  const rows = [
    { supplier: "Stripe Inc.", date: "03 Apr", gross: "£1,200.00", net: "£1,000.00", vat: "£200.00", vatPct: "20%", vatCode: "T1", glCode: "6100", status: "matched", approved: true },
    { supplier: "AWS Europe", date: "04 Apr", gross: "£480.00", net: "£400.00", vat: "£80.00", vatPct: "20%", vatCode: "T1", glCode: "6200", status: "matched", approved: true },
    { supplier: "Uber Eats", date: "05 Apr", gross: "£54.00", net: "£45.00", vat: "£9.00", vatPct: "20%", vatCode: "", glCode: "", status: "probable", approved: false },
    { supplier: "Unknown Vendor", date: "06 Apr", gross: "£320.00", net: "£320.00", vat: "£0.00", vatPct: "0%", vatCode: "T0", glCode: "", status: "unmatched", approved: false },
    { supplier: "Microsoft 365", date: "07 Apr", gross: "£216.00", net: "£180.00", vat: "£36.00", vatPct: "20%", vatCode: "T1", glCode: "6200", status: "matched", approved: true },
  ];

  const statusStyles: Record<string, string> = {
    matched: "bg-[rgba(58,85,153,0.10)] text-[#3a5599]",
    probable: "bg-[rgba(217,119,6,0.1)] text-[#b45309]",
    unmatched: "bg-[rgba(159,42,59,0.1)] text-[#9f2a3b]",
  };

  const statusLabels: Record<string, string> = {
    matched: "Matched",
    probable: "Probable",
    unmatched: "Unmatched",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-white shadow-[0_30px_120px_rgba(15,23,31,0.10)]">
      {/* Fake window chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-3">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-4 h-5 w-56 rounded-md bg-[var(--color-border)]" />
      </div>

      {/* Fake app shell */}
      <div className="flex min-h-[420px]">
        {/* Sidebar */}
        <div className="hidden w-52 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-sidebar)] p-4 md:block">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-3">
            <div className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">ClearMatch</div>
            <div className="mt-1 text-sm font-semibold text-[var(--color-foreground)]">Northstar Finance</div>
          </div>
          <div className="mt-4 space-y-1">
            {["Dashboard", "New run", "All runs", "Templates"].map((item, i) => (
              <div
                key={item}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${
                  i === 0
                    ? "bg-white text-[var(--color-foreground)] shadow-sm"
                    : "text-[var(--color-muted-foreground)]"
                }`}
              >
                <div className={`h-3 w-3 rounded-sm ${i === 0 ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`} />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-x-auto p-5">
          {/* Stats row */}
          <div className="mb-4 grid grid-cols-4 gap-3">
            {[
              { label: "Matched", value: "3" },
              { label: "Needs review", value: "2" },
              { label: "Duplicates", value: "0" },
              { label: "Unmatched", value: "1" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-sm"
              >
                <div className="text-[10px] text-[var(--color-muted-foreground)]">{stat.label}</div>
                <div className="mt-1 text-xl font-semibold text-[var(--color-foreground)]">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between text-[10px] text-[var(--color-muted-foreground)]">
              <span>Approval progress</span>
              <span className="font-semibold text-[var(--color-accent)]">3 / 5 approved</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
              <div className="h-full w-[60%] rounded-full bg-[var(--color-accent)]" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-panel)]">
                  {["Supplier", "Date", "Gross", "Net", "VAT", "VAT%", "VAT Code", "GL Code", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {rows.map((row) => (
                  <tr
                    key={row.supplier}
                    className={row.approved ? "" : "bg-[rgba(58,85,153,0.02)]"}
                  >
                    <td className="px-3 py-2.5 font-medium text-[var(--color-foreground)]">{row.supplier}</td>
                    <td className="px-3 py-2.5 text-[var(--color-muted-foreground)]">{row.date}</td>
                    <td className="px-3 py-2.5 font-mono text-[var(--color-foreground)]">{row.gross}</td>
                    <td className="px-3 py-2.5 font-mono text-[var(--color-foreground)]">{row.net}</td>
                    <td className="px-3 py-2.5 font-mono text-[var(--color-foreground)]">{row.vat}</td>
                    <td className="px-3 py-2.5 font-mono text-[var(--color-muted-foreground)]">{row.vatPct}</td>
                    <td className="px-3 py-2.5">
                      {row.vatCode ? (
                        <span className="rounded-lg bg-[var(--color-panel)] px-2 py-0.5 font-mono font-semibold text-[var(--color-foreground)]">{row.vatCode}</span>
                      ) : (
                        <span className="text-[var(--color-danger)]">Missing</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.glCode ? (
                        <span className="rounded-lg bg-[var(--color-panel)] px-2 py-0.5 font-mono font-semibold text-[var(--color-foreground)]">{row.glCode}</span>
                      ) : (
                        <span className="text-[var(--color-danger)]">Missing</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${statusStyles[row.status]}`}>
                        {statusLabels[row.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.approved && (
                        <span className="text-[var(--color-accent)]">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
