"use client";

import { Check, ChevronDown, Code, Copy, Download } from "lucide-react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface RepositoryCodeMenuProps {
  cloneUrl: string;
  archiveUrl: string;
  archiveLabel: string;
  isPrivate: boolean;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "true");
      input.style.position = "absolute";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(input);
      return copied;
    } catch {
      return false;
    }
  }
}

export function RepositoryCodeMenu({ cloneUrl, archiveUrl, archiveLabel, isPrivate }: RepositoryCodeMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<"url" | "command" | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const cloneCommand = `git clone ${cloneUrl}`;

  const closeMenu = useEffectEvent(() => {
    setIsOpen(false);
  });

  const handlePointerDown = useEffectEvent((event: PointerEvent) => {
    const target = event.target as Node | null;

    if (!target || rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
      return;
    }

    closeMenu();
  });

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeMenu();
      buttonRef.current?.focus();
    }
  });

  const handleViewportChange = useEffectEvent(() => {
    closeMenu();
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [handleKeyDown, handlePointerDown, handleViewportChange, isOpen]);

  useEffect(() => {
    if (!copiedKey) {
      return;
    }

    if (resetTimeoutRef.current) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setCopiedKey(null);
      resetTimeoutRef.current = null;
    }, 1600);

    return () => {
      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };
  }, [copiedKey]);

  async function handleCopy(value: string, key: "url" | "command") {
    if (await copyText(value)) {
      setCopiedKey(key);
    }
  }

  function openMenu() {
    const button = buttonRef.current;

    if (!button) {
      setIsOpen(true);
      return;
    }

    const rect = button.getBoundingClientRect();
    const width = Math.min(304, Math.max(220, window.innerWidth - 16));
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));

    setMenuPosition({
      top: rect.bottom + 8,
      left,
      width,
    });
    setIsOpen(true);
  }

  const menu =
    isOpen && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            id={menuId}
            aria-label="Repository code options"
            className="z-[60] overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117] shadow-[0_24px_60px_rgba(1,4,9,0.65)]"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <div className="border-b border-[#30363d] px-4 py-3">
              <p className="text-sm font-semibold text-[#e6edf3]">Clone or download</p>
              <p className="mt-1 text-xs leading-5 text-[#8b949e]">
                {isPrivate ? "HTTPS cloning requires a valid Git token for this private repository." : "Use HTTPS or download a ZIP archive."}
              </p>
            </div>

            <div className="p-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleCopy(cloneUrl, "url")}
                className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[#161b22]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#e6edf3]">Copy HTTPS URL</p>
                  <p className="mt-1 truncate text-xs text-[#8b949e]">{cloneUrl}</p>
                </div>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#30363d] bg-[#0d1117] text-[#c9d1d9]">
                  {copiedKey === "url" ? <Check size={15} className="text-[#3fb950]" /> : <Copy size={15} />}
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => void handleCopy(cloneCommand, "command")}
                className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[#161b22]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#e6edf3]">Copy clone command</p>
                  <p className="mt-1 truncate text-xs text-[#8b949e]">{cloneCommand}</p>
                </div>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#30363d] bg-[#0d1117] text-[#c9d1d9]">
                  {copiedKey === "command" ? <Check size={15} className="text-[#3fb950]" /> : <Copy size={15} />}
                </span>
              </button>

              <a
                href={archiveUrl}
                download={archiveLabel}
                role="menuitem"
                onClick={() => closeMenu()}
                className="flex items-start justify-between gap-3 rounded-lg px-3 py-3 transition hover:bg-[#161b22]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#e6edf3]">Download ZIP</p>
                  <p className="mt-1 truncate text-xs text-[#8b949e]">{archiveLabel}</p>
                </div>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#30363d] bg-[#0d1117] text-[#c9d1d9]">
                  <Download size={15} />
                </span>
              </a>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => {
          if (isOpen) {
            closeMenu();
            return;
          }

          openMenu();
        }}
        className="inline-flex items-center gap-2 rounded-md border border-[#2ea043] bg-[#238636] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2ea043] focus:outline-none focus:ring-2 focus:ring-[#2ea043] focus:ring-offset-2 focus:ring-offset-[#0d1117]"
      >
        <Code size={13} />
        Code
        <ChevronDown size={13} className={isOpen ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {menu}
    </div>
  );
}
