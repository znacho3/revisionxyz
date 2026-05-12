import { Link, useParams } from "@tanstack/react-router";
import { HiOutlineViewGrid, HiOutlineVideoCamera, HiOutlineDatabase, HiOutlineBookOpen } from "react-icons/hi";
import { CentralIcon } from "@central-icons-react/all";
import { cn } from "@/lib/utils";
import { centralIconPropsOutlined24 } from "@/lib/icon-props";

const iconClass = "size-6 shrink-0";

type Tab = { id: string; label: string; href: string; iconRender: (className: string) => React.ReactNode };

export default function TopicModeTabs({ activeId = "notes" }: { activeId?: string }) {
  const { subject: subjectSlug, noteslug, topicslug } = useParams({ strict: false });
  if (!subjectSlug) return null;

  const subjectBase = `/ib/${subjectSlug}`;
  const topicSlug = noteslug ?? topicslug;
  const isSubjectLevel = !topicSlug;
  const base = isSubjectLevel ? subjectBase : `${subjectBase}/${topicSlug}`;

  const tabs: Tab[] = isSubjectLevel
    ? [
        { id: "all", label: "All", href: subjectBase, iconRender: (cls) => <HiOutlineViewGrid className={cls} aria-hidden /> },
        // { id: "videos", label: "Videos", href: "#", iconRender: (cls) => <HiOutlineVideoCamera className={cls} aria-hidden /> },
        { id: "questionbank", label: "Questionbank", href: `${subjectBase}/questionbank`, iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconCircleQuestionmark" className={cls} /> },
        { id: "notes", label: "Notes", href: `${subjectBase}/notes`, iconRender: (cls) => <HiOutlineBookOpen className={cls} aria-hidden /> },
        // { id: "lessons", label: "Lessons", href: "#", iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconSquareCursor" className={cls} /> },
        { id: "flashcards", label: "Flashcards", href: `${subjectBase}/flashcards`, iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconFlashcards" className={cls} /> },
        { id: "cheatsheets", label: "Cheatsheets", href: `${subjectBase}/cheatsheets`, iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconSearchlinesSparkle" className={cls} /> },
        { id: "predicted-papers", label: "Papers", href: `${subjectBase}/predicted-papers`, iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconFileEdit" className={cls} /> },
      ]
    : [
        { id: "all", label: "All", href: subjectBase, iconRender: (cls) => <HiOutlineViewGrid className={cls} aria-hidden /> },
        // { id: "videos", label: "Videos", href: "#", iconRender: (cls) => <HiOutlineVideoCamera className={cls} aria-hidden /> },
        { id: "questionbank", label: "Questionbank", href: `${base}/questionbank`, iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconCircleQuestionmark" className={cls} /> },
        { id: "notes", label: "Notes", href: `${base}/notes`, iconRender: (cls) => <HiOutlineBookOpen className={cls} aria-hidden /> },
        // { id: "lessons", label: "Lessons", href: "#", iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconSquareCursor" className={cls} /> },
        { id: "flashcards", label: "Flashcards", href: `${base}/flashcards`, iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconFlashcards" className={cls} /> },
        { id: "cheatsheets", label: "Cheatsheets", href: `${subjectBase}/cheatsheets`, iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconSearchlinesSparkle" className={cls} /> },
        { id: "predicted-papers", label: "Papers", href: `${subjectBase}/predicted-papers`, iconRender: (cls) => <CentralIcon {...centralIconPropsOutlined24} name="IconFileEdit" className={cls} /> },
      ];

  return (
    <div className="hidden sm:block">
      <div className="scrollbar-none overflow-x-auto border-border border-b-2">
        <nav className="flex select-none">
          {tabs.map(({ id, label, href, iconRender }) => {
            const isActive = activeId === id;
            const content = (
              <>
                <span className={cn("text-2xl", isActive ? "text-accent-primary-foreground" : "opacity-60")}>{iconRender(iconClass)}</span>
                <span>{label}</span>
              </>
            );
            const linkClass = cn(
              "group -mb-[2px] flex items-center gap-2 whitespace-nowrap border-b-2 px-0.5 pt-2 pb-1 font-medium transition-all",
              isActive ? "border-accent-primary-foreground text-accent-primary-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            );
            const innerClass = "flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors group-hover:bg-background/30";
            if (href === "#") {
              return (
                <span key={id} className={linkClass} aria-current={isActive ? "page" : undefined}>
                  <span className={innerClass}>{content}</span>
                </span>
              );
            }
            return (
              <Link key={id} to={href as '/'} className={linkClass} aria-current={isActive ? "page" : undefined}>
                <span className={innerClass}>{content}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
