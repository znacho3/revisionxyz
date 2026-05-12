import { HiBadgeCheck, HiDocumentText, HiBeaker } from "react-icons/hi";
import { BiSolidBrain } from "react-icons/bi";
import { cn } from "@/lib/utils";

interface ExemplarCardProps {
  id: string;
  slug: string;
  title: string;
  subject: string;
  type: string;
  score: string;
  image: string;
  isPro: boolean;
}

export function ExemplarCard({ id, slug, title, subject, type, score, image, isPro }: ExemplarCardProps) {
  const linkId = slug || id;

  return (
    <a href={`/coursework-exemplars/file/${linkId}`} className="block">
      <div className="group space-y-4">
        <div className="relative space-y-3">
          <div className="relative isolate block max-h-[200px] w-full overflow-hidden rounded-2xl border-2 border-foreground/5 bg-muted p-9">            
            <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-2 ring-foreground/5 transition-all group-hover:scale-105">
              <img
                alt={title}
                loading="lazy"
                className="object-cover h-full w-full"
                src={image}
                onError={(e) => {
                  // Fallback for missing images
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.style.backgroundColor = '#f4f4f5';
                  e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-muted-foreground text-xs p-2 text-center">No preview</span>';
                }}
              />
            </div>

            {isPro && (
              <div className="absolute bottom-2 right-2 z-10">
                <div className="inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0.5 text-xs font-semibold shadow-xl backdrop-blur-md">
                  <HiBadgeCheck className="mr-1 size-3" /> Pro
                </div>
              </div>
            )}
          </div>
          
          <div className="py-2">
            <h3 className="break-words font-medium text-lg leading-tight line-clamp-4">{title}</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-muted text-muted-foreground px-2.5 py-0.5 text-sm truncate-1 w-fit!">{subject}</div>
            <div className="inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-muted text-muted-foreground px-2.5 py-0.5 text-sm gap-1.5" title={type}>
              {type === "IA" && <HiBeaker className="size-4" aria-hidden="true" />}
              {type === "EE" && <HiDocumentText className="size-4" aria-hidden="true" />}
              {type === "TOK" && <BiSolidBrain className="size-4" aria-hidden="true" />}
              {type}
            </div>
            <div className="rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-muted text-muted-foreground px-2.5 py-0.5 text-sm flex items-center gap-1">
              <div
                className={cn(
                  "-ml-1 size-3 shrink-0 rounded-full",
                  ({
                    A: "bg-green-500",
                    B: "bg-yellow-500",
                    C: "bg-orange-500",
                    D: "bg-red-500",
                    E: "bg-red-500",
                    7: "bg-emerald-500",
                    6: "bg-lime-500",
                    5: "bg-yellow-500",
                    4: "bg-amber-500",
                    3: "bg-orange-500",
                    2: "bg-red-500",
                    1: "bg-red-500",
                  } as Record<string, string>)[score] ?? "bg-muted",
                )}
                title={score}
              />
              {score}
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
