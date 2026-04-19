import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignUpExperience } from "@/components/auth/sign-up-experience";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/account-type");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10 sm:px-6">
      <SignUpExperience />
    </main>
  );
}
