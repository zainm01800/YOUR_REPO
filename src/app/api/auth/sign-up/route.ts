import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function POST(request: Request) {
  const repository = getRepository();
  const user = await repository.getCurrentUser();

  await createSessionCookie({
    sub: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

