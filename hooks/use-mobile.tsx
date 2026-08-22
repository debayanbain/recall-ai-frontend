"use client";

import * as React from "react";

const MOBILE_BREAKPOINT = 768;
/** The app shell swaps the sidebar rail for the drawer + bottom nav at `lg`. */
const COMPACT_NAV_BREAKPOINT = 1024;

function useMaxWidth(breakpoint: number) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [breakpoint],
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.innerWidth < breakpoint,
    // Server snapshot: assume desktop until the client hydrates.
    () => false,
  );
}

/** Phone-sized viewport — sheets, single-column layouts. */
export function useIsMobile() {
  return useMaxWidth(MOBILE_BREAKPOINT);
}

/** Below `lg`: the sidebar becomes a drawer and the bottom nav takes over. */
export function useIsCompactNav() {
  return useMaxWidth(COMPACT_NAV_BREAKPOINT);
}
