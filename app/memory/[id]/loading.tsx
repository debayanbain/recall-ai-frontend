import { AppShell } from "@/components/app-shell";
import { MemoryDetailSkeleton } from "@/components/detail-skeletons";

/**
 * Lets a click on a card navigate immediately.
 *
 * This route is dynamic, and without a loading boundary React holds the previous page on
 * screen until the server has answered and the page's code has downloaded. That is the
 * whole of the "clicked a card and nothing happened" wait: the URL does not even change.
 *
 * It renders its own `AppShell` because the shell lives in each page rather than in a
 * layout, so this file is what replaces the old page's sidebar and header too.
 */
export default function Loading() {
  return (
    <AppShell>
      <MemoryDetailSkeleton />
    </AppShell>
  );
}
