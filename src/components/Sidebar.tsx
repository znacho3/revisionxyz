import { useState, useEffect, type ComponentProps } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { HiX, HiChevronDown } from "react-icons/hi";
import { CentralIcon } from "@central-icons-react/all";
import { cn } from "@/lib/utils";
import { centralIconPropsFilled20, centralIconPropsOutlined20 } from "@/lib/icon-props";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type IconName = ComponentProps<typeof CentralIcon>["name"];

const filledIcon = (name: IconName) => (cls: string) => <CentralIcon {...centralIconPropsFilled20} name={name} className={cls} />;

function NavItem({
  collapsed, isTextVisible, active = false, rowClassName, iconClassName, icon, label, to, onClick, trailing, className, as: Component = to ? Link : "button", ...props
}: {
  collapsed: boolean; isTextVisible: boolean; active?: boolean; rowClassName: string; iconClassName: string; icon: (cls: string) => React.ReactNode; label: React.ReactNode; to?: string; onClick?: () => void; trailing?: React.ReactNode; as?: React.ElementType; className?: string;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className">) {
  return (
    <Component to={to} onClick={onClick} type={!to ? "button" : undefined} aria-current={active && to ? "page" : undefined} className={cn("group/navitem relative flex flex-none cursor-pointer items-center rounded-xl transition-[padding,background-color,color] duration-300 ease-in-out w-full p-2 py-1.5 pl-2", collapsed ? "pl-3" : "pl-2", rowClassName, className)} {...props}>
      {icon(cn("size-5 shrink-0 text-[20px] transition-[margin] duration-300 ease-in-out", collapsed ? "mr-0" : "mr-2.5", iconClassName))}
      <span className={cn("flex min-w-0 flex-1 items-center overflow-hidden transition-opacity duration-300 ease-in-out", collapsed ? "opacity-0" : "opacity-100")}>
        {isTextVisible && (<><span className="truncate font-semibold text-sm capitalize">{label}</span>{trailing}</>)}
      </span>
    </Component>
  );
}

const THEME_ORDER = ["dark", "light", "system"] as const;
type ThemeValue = (typeof THEME_ORDER)[number];
const THEME_ICONS: Record<ThemeValue, IconName> = { dark: "IconMoon", light: "IconSun", system: "IconStudioDisplay" };

type SidebarProps = { collapsed?: boolean; onToggleCollapse?: () => void };
export type SidebarContentProps = {
  collapsed?: boolean; isTextVisible?: boolean; onToggleCollapse?: () => void;
  hideCollapseButton?: boolean; onClose?: () => void; className?: string;
};

export function SidebarContent({
  collapsed = false, isTextVisible: isTextVisibleProp, onToggleCollapse, hideCollapseButton = false, onClose, className,
}: SidebarContentProps) {
  const pathname = useRouterState().location.pathname;
  const { theme, setTheme } = useTheme();

  const currentTheme: ThemeValue = theme === "dark" || theme === "light" || theme === "system" ? theme : "system";
  const cycleTheme = () => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(currentTheme) + 1) % THEME_ORDER.length];
    setTheme(next);
    toast(`Theme set to ${next.charAt(0).toUpperCase() + next.slice(1)}`);
  };

  const isActive = (href: string) => pathname === href;
  const isPrefix = (p: string) => pathname.startsWith(p);
  const isNotes = pathname === "/ib/notes" || (pathname.startsWith("/ib/") && pathname.includes("/notes"));
  const isFlashcards = pathname === "/ib/flashcards" || (pathname.startsWith("/ib/") && pathname.includes("/flashcards"));
  const isQuestionbank = pathname === "/ib/questions" || (pathname.startsWith("/ib/") && pathname.includes("/questionbank"));
  const isCheatsheets = isPrefix("/ib/cheatsheets");
  const botsActive = isActive("/bots") || isPrefix("/bots");

  const [intVis, setIntVis] = useState(!collapsed);
  const isTextVisible = isTextVisibleProp ?? intVis;
  useEffect(() => {
    if (isTextVisibleProp !== undefined) return;
    if (collapsed) { const t = setTimeout(() => setIntVis(false), 300); return () => clearTimeout(t); }
    setIntVis(true);
  }, [collapsed, isTextVisibleProp]);

  const shared = { collapsed, isTextVisible };

  const navInactive = "text-muted-foreground [@media(hover:hover)]:hover:bg-muted [@media(hover:hover)]:hover:text-foreground";
  const iconInactive = "text-muted-foreground opacity-60 [@media(hover:hover)]:group-hover/navitem:opacity-100";

  const divider = (title: string) => (
    <div className={cn("mt-3 mb-2 flex h-3 items-center transition-[padding,gap] duration-300 ease-in-out", collapsed ? "justify-center px-2 gap-0" : "gap-2 pl-2 pr-0")}>
      <span className={cn("truncate font-semibold text-[12px] uppercase tracking-wide text-muted-foreground transition-opacity duration-300 ease-in-out overflow-hidden", collapsed ? "opacity-0 w-0" : "opacity-100")}>
        {isTextVisible && title}
      </span>
      <span className={cn("transition-all duration-300 ease-in-out", collapsed ? "w-6 h-0.5 rounded-full bg-muted-foreground/20" : "flex-auto h-px bg-muted")} />
    </div>
  );

  return (
    <div className={cn("flex h-full w-full flex-col bg-background px-2.5 pt-2.5 pb-0", className)}>
      <div className="relative -mt-2.5 flex h-14 flex-none items-center px-0.5">
        <Link to="/" className={cn("flex min-w-0 gap-2.5 pl-1.5 transition-[width,opacity] duration-300 ease-in-out", collapsed ? "pointer-events-none w-0 opacity-0" : "w-auto opacity-100")} aria-label="Home" tabIndex={collapsed ? -1 : 0}>
          <img src="/assets/logo-icon.svg" alt="" className="size-7 shrink-0 rounded-[10px] dark:[filter:invert(1)_hue-rotate(180deg)]" />
          <img src="/assets/logo-text-only.svg" alt="Logo" className="mt-1 max-w-[7.5rem] shrink-0 object-contain object-left dark:[filter:invert(1)_hue-rotate(180deg)]" />
        </Link>
        {!hideCollapseButton && onToggleCollapse && (
          <button type="button" onClick={onToggleCollapse} className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-2xl text-2xl text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <CentralIcon {...centralIconPropsOutlined20} name="IconSidebarSimpleLeftWide" />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 flex-none items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50" aria-label="Close menu">
            <HiX className="size-5" aria-hidden />
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto scrollbar-none">
        <nav className="flex flex-col space-y-0.5 pb-2">
          <div className="pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  data-sidebar-item="exam-board-selector"
                  aria-label="Exam programme"
                  title="Exam programme"
                  className={cn("group flex w-full cursor-pointer items-center rounded-2xl bg-muted p-2 pl-2.5 transition-all hover:bg-muted/80", collapsed ? "justify-center px-2 pl-2" : "justify-between")}
                >
                  {collapsed ? (
                    <CentralIcon {...centralIconPropsFilled20} name="IconImagine" className="size-5 shrink-0 text-foreground" aria-hidden />
                  ) : (
                    <>
                      <span className="flex min-w-0 items-center gap-2 truncate font-semibold text-sm text-foreground">
                        <CentralIcon {...centralIconPropsFilled20} name="IconImagine" className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                        <span>RevisionXYZ</span>
                      </span>
                      <HiChevronDown className="size-5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100" aria-hidden />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={8} className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] p-1">
                <DropdownMenuItem className="cursor-default rounded-xl bg-accent font-semibold text-sm text-accent-foreground focus:bg-accent" aria-current="true">
                  RevisionXYZ
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl font-semibold text-sm" onSelect={() => window.location.assign("https://revisionvillage-archive.pages.dev")}>
                  RevisionVillage
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <NavItem {...shared} to="/" active={isActive("/")} rowClassName={isActive("/") ? "bg-muted text-foreground" : navInactive} iconClassName={isActive("/") ? "text-foreground" : iconInactive} icon={filledIcon("IconHomeOpen")} label="Home" title="Home" />
          <NavItem {...shared} to="/ib" active={isActive("/ib")} rowClassName={isActive("/ib") ? "bg-muted text-foreground" : navInactive} iconClassName={isActive("/ib") ? "text-foreground" : iconInactive} icon={filledIcon("IconNewspaper2")} label="All Subjects" title="All Subjects" />
          {/* <NavItem {...shared} to="/bots" active={botsActive} rowClassName={botsActive ? "bg-muted text-foreground" : navInactive} iconClassName={botsActive ? "text-foreground" : iconInactive} icon={filledIcon("IconBubbleWideAnnotation")} label="Jojo AI Tutor" title="Jojo AI Tutor" /> */}

          {divider("Study")}

          <NavItem {...shared} to="/ib/notes" active={isNotes} rowClassName={isNotes ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-400/25 dark:text-yellow-400" : navInactive} iconClassName={isNotes ? "text-yellow-700 dark:text-yellow-400" : iconInactive} icon={filledIcon("IconSketchbook")} label="Notes" title="Notes" />
          <NavItem {...shared} to="/ib/questions" active={isQuestionbank} rowClassName={isQuestionbank ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-400/25 dark:text-indigo-300" : navInactive} iconClassName={isQuestionbank ? "text-indigo-700 dark:text-indigo-300" : iconInactive} icon={filledIcon("IconCircleQuestionmark")} label="Questionbank" title="Questionbank" />
          <NavItem {...shared} to="/ib/flashcards" active={isFlashcards} rowClassName={isFlashcards ? "bg-sky-100 text-sky-700 dark:bg-sky-400/25 dark:text-sky-300" : navInactive} iconClassName={isFlashcards ? "text-sky-700 dark:text-sky-300" : iconInactive} icon={filledIcon("IconFlashcards")} label="Flashcards" title="Flashcards" />
          <NavItem {...shared} to="/ib/cheatsheets" active={isCheatsheets} rowClassName={isCheatsheets ? "bg-lime-100 text-lime-700 dark:bg-lime-400/25 dark:text-lime-300" : navInactive} iconClassName={isCheatsheets ? "text-lime-700 dark:text-lime-300" : iconInactive} icon={filledIcon("IconSearchlinesSparkle")} label="Cheatsheets" title="Cheatsheets" />

          <NavItem {...shared} to="/predicted-papers" active={isPrefix("/predicted-papers")} rowClassName={isPrefix("/predicted-papers") ? "bg-red-100 text-red-700 dark:bg-red-400/25 dark:text-red-300" : navInactive} iconClassName={isPrefix("/predicted-papers") ? "text-red-700 dark:text-red-300" : iconInactive} icon={filledIcon("IconFileEdit")} label="Predicted Papers" title="Predicted Papers" />

        </nav>
      </div>

      <div className="mt-auto flex flex-col space-y-0.5 pb-2.5">
        <NavItem {...shared} onClick={cycleTheme} aria-label={`Theme: ${currentTheme}`} title="Theme" rowClassName={navInactive} iconClassName={iconInactive} icon={(cls) => <CentralIcon {...centralIconPropsOutlined20} name={THEME_ICONS[currentTheme]} className={cls} />} label="Theme" />
      </div>
    </div>
  );
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const [hiddenText, setHiddenText] = useState(false);
  useEffect(() => {
    if (collapsed) { const t = setTimeout(() => setHiddenText(true), 300); return () => clearTimeout(t); }
    setHiddenText(false);
  }, [collapsed]);

  return (
    <aside className={cn("relative hidden h-full flex-none print:hidden transition-[width] duration-300 ease-in-out md:block", collapsed ? "w-16" : "w-60")}>
      <div className="scrollbar-none absolute top-0 left-0 z-50 flex h-full w-full flex-col overflow-y-auto rounded-r-2xl bg-background pb-0 transition-[width,padding] duration-300 ease-in-out print:hidden">
        <SidebarContent collapsed={collapsed} isTextVisible={collapsed ? !hiddenText : true} onToggleCollapse={onToggleCollapse} />
      </div>
    </aside>
  );
}
