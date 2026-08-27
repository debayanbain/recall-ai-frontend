import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { AlreadySignedIn } from "@/components/already-signed-in";
import { OAuthButtons } from "@/components/oauth-buttons";

export const metadata: Metadata = {
  title: "Create your account — RecallAI",
  description: "Start your RecallAI second brain with Google, Facebook or X.",
};

export default function SignUpPage() {
  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <h1 className="font-display text-[30px] leading-tight tracking-tight">
          Create your second brain
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
          No password to invent. Pick a provider and you&rsquo;re in.
        </p>

        <div className="mt-6">
          <AlreadySignedIn next="/vault">
            <OAuthButtons next="/vault" />
          </AlreadySignedIn>
        </div>

        <p className="mt-6 text-[12.5px] leading-relaxed text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
