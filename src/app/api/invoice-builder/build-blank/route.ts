import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(request: NextRequest) {
  const { headers } = await request.json() as { headers: string[] };

  if (!Array.isArray(headers) || headers.length === 0) {
    return NextResponse.json({ error: "No headers provided" }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");

  const headerRow = sheet.getRow(1);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD4E4DA" },
    };
    sheet.getColumn(index + 1).width = Math.max(header.length + 4, 16);
  });
  headerRow.commit();

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template.xlsx"`,
    },
  });
}
