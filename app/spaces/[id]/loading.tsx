import { AppShell } from "@/components/app-shell";
import { SpaceDetailSkeleton } from "@/components/detail-skeletons";

/** The same boundary, for the same reason, as `app/memory/[id]/loading.tsx`. */
export default function Loading() {
  return (
    <AppShell>
      <SpaceDetailSkeleton />
    </AppShell>
  );
}
