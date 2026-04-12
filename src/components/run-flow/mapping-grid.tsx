import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

const fields = [
  "date",
  "amount",
  "merchant",
  "description",
  "employee",
  "currency",
  "reference",
];

export function MappingGrid({
  headers,
  selected,
  onChange,
}: {
  headers: string[];
  selected?: Record<string, string>;
  onChange?: (field: string, value: string) => void;
}) {
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
          Column mapping
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
          Map the incoming file once, then save it as a reusable template for future runs.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field} className="space-y-2 text-sm">
            <span className="font-medium capitalize text-[var(--color-foreground)]">
              {field}
            </span>
            <Select
              value={selected?.[field] || ""}
              onChange={(event) => onChange?.(field, event.target.value)}
            >
              <option value="">Select a column</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>
    </Card>
  );
}
