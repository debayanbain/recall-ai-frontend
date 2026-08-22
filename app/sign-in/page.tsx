import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { OAuthButtons } from "@/components/oauth-buttons";
import { oauthErrorMessage } from "@/lib/oauth-errors";

export const metadata: Metadata = {
  title: "Sign in — RecallAI",
  description: "Sign in to your RecallAI second brain.",
};

/** Only relative same-origin paths survive; the backend re-validates this too. */
function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/vault";
  return next;
}

function firstParam(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export default async function SignInPage(props: PageProps<"/sign-in">) {
  const params = await props.searchParams;
  const error = oauthErrorMessage(firstParam(params.error));

  return (
    <AuthShell>
      <div className="w-full max-w-sm">
        <h1 className="font-display text-[30px] leading-tight tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
          Sign in to pick up where your memory left off.
        </p>

        {error ? (
          // role="alert" so a screen reader announces the failure on arrival, and it
          // sits directly above the controls that recover from it.
          <p
            role="alert"
            className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-[13px] leading-relaxed text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6">
          <OAuthButtons next={safeNext(params.next)} />
        </div>

        <p className="mt-6 text-[12.5px] leading-relaxed text-muted-foreground">
          New here? Picking a provider above creates your account automatically — there
          is nothing else to fill in.{" "}
          <Link
            href="/sign-up"
            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            More about signing up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
