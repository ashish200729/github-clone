"use client";

import { ChevronDown, FilePlus2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buildRepoNewFilePath, buildRepoUploadPath } from "@/lib/repos/routes";

interface RepositoryAddFileMenuProps {
  owner: string;
  repo: string;
  branch: string;
}

export function RepositoryAddFileMenu({ owner, repo, branch }: RepositoryAddFileMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const createHref = buildRepoNewFilePath(owner, repo, branch);
  const uploadHref = buildRepoUploadPath(owner, repo, branch);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeMenu = () => setIsOpen(false);

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (!target || rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      closeMenu();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      closeMenu();
      buttonRef.current?.focus();
    };

    const onViewportChange = () => closeMenu();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isOpen]);

  function closeMenu() {
    setIsOpen(false);
  }

  function openMenu() {
    const button = buttonRef.current;

    if (!button) {
      setIsOpen(true);
      return;
    }

    const rect = button.getBoundingClientRect();
    const width = 160;
    const left = rect.right - width;

    setMenuPosition({
      top: rect.bottom + 4,
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
            aria-label="Add file options"
            className="z-[60] overflow-hidden rounded-md border border-[#30363d] bg-[#161b22] py-2 shadow-xl"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
          >
            <div className="flex flex-col">
              <Link
                href={createHref}
                role="menuitem"
                onClick={() => closeMenu()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#e6edf3] hover:bg-[#1f6feb] transition-colors hover:text-white"
              >
                <FilePlus2 size={14} className="text-[#8b949e] group-hover:text-white" />
                <span>Create new file</span>
              </Link>

              <div className="mx-3 my-1 border-t border-[#30363d]"></div>

              <Link
                href={uploadHref}
                role="menuitem"
                onClick={() => closeMenu()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-[#e6edf3] hover:bg-[#1f6feb] transition-colors hover:text-white group"
              >
                <Upload size={14} className="text-[#8b949e] group-hover:text-white" />
                <span>Upload files</span>
              </Link>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef}>
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
        className="inline-flex items-center gap-1 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-xs font-medium text-[#c9d1d9] transition hover:bg-[#30363d] focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:ring-offset-2 focus:ring-offset-[#0d1117]"
      >
        Add file
        <ChevronDown size={13} className={isOpen ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>
      {menu}
    </div>
  );
}
