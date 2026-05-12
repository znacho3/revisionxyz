import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 267' fill='%23e5e5e5'%3E%3Crect width='200' height='267'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23737373' font-size='14'%3EPDF%3C/text%3E%3C/svg%3E";

export type PdfPreviewProps =
  | {
      to: "/ib/cheatsheets/$id";
      params: { id: string };
      title: string;
      thumbnailSrc: string;
      isPremium: boolean;
      className?: string;
    }
  | {
      to: "/predicted-papers/$subjectSlug/$paperSlug";
      params: { subjectSlug: string; paperSlug: string };
      title: string;
      thumbnailSrc: string;
      isPremium: boolean;
      className?: string;
    };

function imageAltForRoute(to: PdfPreviewProps["to"], title: string): string {
  const t = title.trim();
  if (to === "/ib/cheatsheets/$id") return `${t} - PDF cheatsheet preview`;
  return `${t} - predicted paper preview`;
}

export function PdfPreview(props: PdfPreviewProps) {
  const { to, params, title, thumbnailSrc, isPremium, className } = props;

  return (
    <div className={cn("w-[120px] md:w-[200px] shrink-0", className)}>
      <div className="group space-y-4">
        <div className="relative space-y-6">
          <Link to={to} params={params}>
            <div className="relative isolate block w-full cursor-pointer overflow-hidden rounded-2xl border-2 border-border bg-muted p-2 md:p-3 md:p-6 transition-colors hover:border-foreground/20 hover:bg-muted/80">
              {!isPremium ? (
                <div className="absolute top-2 right-2 z-10 inline-flex rounded-lg md:rounded-xl bg-accent-primary-foreground px-2 py-1 md:px-2.5 md:py-1.5 font-semibold text-accent-primary text-xs md:text-sm leading-4 tracking-wide backdrop-blur">
                  FREE
                </div>
              ) : (
                <div className="absolute top-2 right-2 z-10 inline-flex rounded-lg md:rounded-xl bg-accent-purple-foreground px-2 py-1 md:px-2.5 md:py-1.5 font-semibold text-accent-purple text-xs md:text-sm leading-4 tracking-wide backdrop-blur">
                  CRACKED
                </div>
              )}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-background shadow-xl ring-2 ring-border transition-transform group-hover:scale-[1.02]">
                <img
                  alt={imageAltForRoute(to, title)}
                  loading="lazy"
                  decoding="async"
                  className="object-cover w-full h-full"
                  src={thumbnailSrc}
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_IMG;
                  }}
                />
              </div>
            </div>
          </Link>
          <div className="mt-4 space-y-4 px-2">
            <Link to={to} params={params} className="block">
              <h4 className="line-clamp-3 font-medium text-sm md:text-lg leading-tight text-foreground">
                {title.trim()}
              </h4>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
