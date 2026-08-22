import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { InstagramConnection } from "@/components/instagram-connection";
import { instagramErrorMessage } from "@/lib/integration-errors";

export const metadata: Metadata = { title: "Settings · RecallAI" };

function firstParam(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

export default async function SettingsPage(props: PageProps<"/settings">) {
  const params = await props.searchParams;
  // Only surface copy for a failure; success needs no banner, the connected row shows it.
  const status =
    firstParam(params.instagram) === "error"
      ? instagramErrorMessage(firstParam(params.reason))
      : null;

  return (
    <AppShell title="Settings" subtitle="Connect the accounts RecallAI should pull from.">
      <div className="grid max-w-2xl gap-4 pb-10">
        <InstagramConnection statusMessage={status} />
      </div>
    </AppShell>
  );
}
