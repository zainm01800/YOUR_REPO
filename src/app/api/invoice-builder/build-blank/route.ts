import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

const MAX_HEADERS = 50;

export async function POST(request: NextRequest) {
  try {
    let body: { headers?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const { headers } = body;

    if (!Array.isArray(headers) || headers.length === 0) {
      return NextResponse.json({ error: "No headers provided." }, { status: 400 });
    }

    if (headers.length > MAX_HEADERS) {
      return NextResponse.json(
        { error: `Too many headers (max ${MAX_HEADERS}).` },
        { status: 400 },
      );
    }

    const safeHeaders = headers.map((h) =>
      typeof h === "string" ? h.slice(0, 100) : String(h).slice(0, 100),
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");

    const headerRow = sheet.getRow(1);
    safeHeaders.forEach((header, index) => {
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
  } catch (err) {
    console.error("[invoice-builder/build-blank] error:", err);
    return NextResponse.json({ error: "Failed to build template." }, { status: 500 });
  }
}
