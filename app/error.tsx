"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn&rsquo;t load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={reset}
            className="h-11 rounded-xl gradient-primary px-4 text-sm font-medium tracking-normal text-white normal-case hover:bg-transparent"
          >
            Try again
          </Button>
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href="/" />}
            className="h-11 rounded-xl border-border bg-card px-4 text-sm font-medium tracking-normal text-foreground normal-case hover:bg-secondary"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
