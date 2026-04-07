import { NextResponse } from "next/server";
import { createSessionCookie, getDemoCredentials } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const demo = getDemoCredentials();

  if (email !== demo.email || password !== demo.password) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const repository = getRepository();
  const user = await repository.getCurrentUser();

  await createSessionCookie({
    sub: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}

