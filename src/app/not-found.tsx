import Link from "next/link";
import { ArrowLeft, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--color-panel)]">
        <FileSearch className="h-7 w-7 text-[var(--color-muted-foreground)]" />
      </div>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[var(--color-foreground)]">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm text-base text-[var(--color-muted-foreground)]">
        This page doesn&apos;t exist or may have been moved. Check the URL or head back to {appConfig.name}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Button>
        </Link>
        <Link href="/">
          <Button variant="secondary">Home page</Button>
        </Link>
      </div>
    </div>
  );
}
