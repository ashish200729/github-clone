"use client";

import { Check, ChevronDown, Copy, Download, ExternalLink, Pencil } from "lucide-react";
import { useMemo, useState } from "react";

interface BlobFileViewerProps {
  path: string;
  content: string;
  sizeBytes: number;
  canWrite: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
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

export function BlobFileViewer({ path, content, sizeBytes, canWrite }: BlobFileViewerProps) {
  const [copied, setCopied] = useState(false);
  const fileName = path.split("/").filter(Boolean).at(-1) ?? "file.txt";
  const lines = useMemo(() => {
    const split = content.split("\n");
    return split.length === 0 ? [""] : split;
  }, [content]);
  const nonEmptyLoc = useMemo(() => lines.filter((line) => line.trim().length > 0).length, [lines]);

  async function handleCopy() {
    const didCopy = await copyText(content);

    if (!didCopy) {
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function withTextBlob(handler: (blobUrl: string) => void) {
    const textBlob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(textBlob);
    handler(blobUrl);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  }

  function handleDownload() {
    withTextBlob((blobUrl) => {
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      anchor.rel = "noopener noreferrer";
      anchor.click();
    });
  }

  function handleOpenRaw() {
    withTextBlob((blobUrl) => {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <article className="overflow-hidden rounded-md border border-[#30363d] bg-[#0d1117] shadow-[0_24px_60px_rgba(1,4,9,0.35)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#30363d] bg-[#161b22] px-3 py-2">
        <div className="inline-flex items-center rounded-md border border-[#30363d] bg-[#21262d] p-0.5">
          <button
            type="button"
            className="rounded-[5px] border border-[#30363d] bg-[#010409] px-4 py-1.5 text-sm font-semibold text-[#e6edf3]"
            aria-current="page"
          >
            Code
          </button>
          <button
            type="button"
            disabled
            className="rounded-[5px] px-4 py-1.5 text-sm font-medium text-[#8b949e] disabled:cursor-not-allowed"
            title="Blame view coming soon"
          >
            Blame
          </button>
        </div>

        <p className="ml-1 text-sm text-[#8b949e]">
          {lines.length} lines ({nonEmptyLoc} loc) <span className="mx-1">·</span> {formatFileSize(sizeBytes)}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenRaw}
            className="inline-flex items-center gap-1 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-sm font-medium text-[#c9d1d9] transition hover:bg-[#30363d]"
          >
            Raw
            <ExternalLink size={14} />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#30363d] bg-[#21262d] text-[#c9d1d9] transition hover:bg-[#30363d]"
            title="Copy file contents"
          >
            {copied ? <Check size={15} className="text-[#3fb950]" /> : <Copy size={15} />}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#30363d] bg-[#21262d] text-[#c9d1d9] transition hover:bg-[#30363d]"
            title="Download file"
          >
            <Download size={15} />
          </button>
          <button
            type="button"
            disabled={!canWrite}
            className="inline-flex items-center gap-1 rounded-md border border-[#30363d] bg-[#21262d] px-3 py-1.5 text-sm font-medium text-[#c9d1d9] transition hover:bg-[#30363d] disabled:cursor-not-allowed disabled:opacity-60"
            title={canWrite ? "Edit support coming soon" : "You need write access to edit"}
          >
            <Pencil size={14} />
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-[#0b1220]">
        <table className="w-full border-collapse font-mono text-[15px] leading-8 text-[#d2d8df]">
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${index}-${line}`}>
                <td className="w-16 min-w-16 select-none border-r border-[#30363d] bg-[#0d1626] pr-4 pl-3 text-right text-[#8b949e]">
                  {index + 1}
                </td>
                <td className="px-4 whitespace-pre">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
