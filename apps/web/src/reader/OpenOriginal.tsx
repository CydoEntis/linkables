import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { safeHref } from "../links/link-display";

type OpenOriginalProps = { url: string; variant: "default" | "ghost"; className: string; children: ReactNode };

export function OpenOriginal({ url, variant, className, children }: OpenOriginalProps) {
  const href = safeHref(url);
  if (href === undefined) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant, className })}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
