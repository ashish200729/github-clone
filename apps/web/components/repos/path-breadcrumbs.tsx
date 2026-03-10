import Link from "next/link";

interface PathBreadcrumbsProps {
  rootHref: string;
  path: string;
  buildHref: (path: string) => string;
}

export function PathBreadcrumbs({ rootHref, path, buildHref }: PathBreadcrumbsProps) {
  const segments = path.split("/").filter(Boolean);

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-[#8b949e]">
      <Link href={rootHref} className="font-medium text-[#58a6ff] hover:text-[#79c0ff]">
        root
      </Link>
      {segments.map((segment, index) => {
        const partialPath = segments.slice(0, index + 1).join("/");
        return (
          <span key={partialPath} className="flex items-center gap-2">
            <span>/</span>
            <Link href={buildHref(partialPath)} className="font-medium text-[#58a6ff] hover:text-[#79c0ff]">
              {segment}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
