import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Button
            nativeButton={false}
            render={<Link href="/" />}
            className="h-11 rounded-xl gradient-primary px-4 text-sm font-medium tracking-normal text-white normal-case hover:bg-transparent"
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
