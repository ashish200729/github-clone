"use client";

import NextLink from "next/link";
import { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, FocusEvent, MouseEvent, TouchEvent } from "react";
import { useState } from "react";

type InstantLinkProps = ComponentProps<typeof NextLink> & {
  pendingHintClassName?: string;
  prefetchOnIntent?: boolean;
};

function PendingHint({ className }: { className?: string }) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-x-2 bottom-1 h-px rounded-full bg-[#58a6ff] opacity-0 transition-opacity delay-100 duration-150 ${
        pending ? "opacity-100" : ""
      } ${className ?? ""}`}
    />
  );
}

function shouldManuallyPrefetch(href: InstantLinkProps["href"]): href is string {
  return typeof href === "string" && href.length > 0 && !href.startsWith("#") && !href.startsWith("http");
}

export function InstantLink({
  href,
  className,
  children,
  onMouseEnter,
  onFocus,
  onTouchStart,
  pendingHintClassName,
  prefetchOnIntent = true,
  ...props
}: InstantLinkProps) {
  const router = useRouter();
  const [hasIntent, setHasIntent] = useState(false);

  function warmRoute() {
    if (!prefetchOnIntent || hasIntent || !shouldManuallyPrefetch(href)) {
      return;
    }

    setHasIntent(true);
    router.prefetch(href);
  }

  const combinedClassName = `relative ${className ?? ""}`.trim();

  return (
    <NextLink
      href={href}
      className={combinedClassName}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        warmRoute();
        onMouseEnter?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        warmRoute();
        onFocus?.(event);
      }}
      onTouchStart={(event: TouchEvent<HTMLAnchorElement>) => {
        warmRoute();
        onTouchStart?.(event);
      }}
      {...props}
    >
      {children}
      <PendingHint className={pendingHintClassName} />
    </NextLink>
  );
}
