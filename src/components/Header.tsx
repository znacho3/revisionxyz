import { UserButton } from '@clerk/clerk-react'
import { cn } from "@/lib/utils"

export function Header({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      className={cn("flex h-14 shrink-0 items-center justify-end gap-4 bg-background px-4", className)}
      {...props}
    >
      <UserButton afterSignOutUrl="/login" />
    </header>
  )
}
