import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ statementId: string }> },
) {
  const { statementId } = await params;
  const repository = await getRepository();
  const statement = await repository.getBankStatement(statementId);

  if (!statement) {
    return NextResponse.json({ error: "Bank statement not found." }, { status: 404 });
  }

  return NextResponse.json(statement);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ statementId: string }> },
) {
  const { statementId } = await params;
  const repository = await getRepository();
  try {
    await repository.deleteBankStatement(statementId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete bank statement." },
      { status: 500 },
    );
  }
}
