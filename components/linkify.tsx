"use client";

import type { ReactNode } from "react";

/**
 * The one anchor style for a link found in body text.
 *
 * Underlined rather than coloured alone: the paragraph around it is deliberately dimmed,
 * and colour on its own is not an affordance someone who cannot see it can use.
 * `break-all` because an address has no spaces to wrap at and a long one would otherwise
 * push the whole column sideways on a phone.
 */
export function BodyLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="font-medium break-all text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
    >
      {children}
    </a>
  );
}
