import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { createCsvExport } from "@/lib/export/csv";
import { createExcelExport } from "@/lib/export/excel";

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const { runId } = await context.params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "csv";
  const repository = getRepository();
  const rows = await repository.getRunRows(runId);

  if (format === "xlsx") {
    const buffer = await createExcelExport(rows);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${runId}.xlsx"`,
      },
    });
  }

  return new NextResponse(createCsvExport(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${runId}.csv"`,
    },
  });
}
