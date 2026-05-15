import { useState, useEffect } from 'react'
import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { isUserOnboarded } from '@/lib/profile'
import { OnboardingModal } from '@/components/OnboardingModal'
import { Toaster } from 'sonner'
import { ThemeProvider, useTheme } from 'next-themes'
import { Menu } from 'lucide-react'
import { Header } from '@/components/Header'
import { Sidebar, SidebarContent } from '@/components/Sidebar'
import { cn } from '@/lib/utils'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthGuard />
    </ThemeProvider>
  )
}

type ProfileState = 'checking' | 'onboarded' | 'needs-onboarding'

function AuthGuard() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState().location.pathname
  const [profileState, setProfileState] = useState<ProfileState>('checking')

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return
    setProfileState('checking')
    isUserOnboarded(userId).then(onboarded => {
      setProfileState(onboarded ? 'onboarded' : 'needs-onboarding')
    })
  }, [isLoaded, isSignedIn, userId])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      if (pathname !== '/login') navigate({ to: '/login', replace: true })
      return
    }
    if (pathname === '/login') navigate({ to: '/', replace: true })
  }, [isLoaded, isSignedIn, pathname, navigate])

  const loading = (
    <div className="flex h-dvh w-screen items-center justify-center bg-background">
      <img src="/assets/logo-icon.svg" alt="" className="size-8 animate-pulse rounded-[10px] dark:[filter:invert(1)_hue-rotate(180deg)]" />
    </div>
  )

  if (!isLoaded) return loading
  if (!isSignedIn) {
    if (pathname !== '/login') return null
    return <Outlet />
  }
  if (profileState === 'checking') return loading

  return (
    <>
      <AppLayout />
      {profileState === 'needs-onboarding' && (
        <OnboardingModal onComplete={() => setProfileState('onboarded')} />
      )}
    </>
  )
}

function AppLayout() {
  const { resolvedTheme } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = useRouterState().location.pathname

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <>
      <Toaster position="bottom-center" theme={(resolvedTheme as 'light' | 'dark') ?? 'light'} />
      <div className="flex h-dvh w-screen overflow-hidden antialiased">
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((c) => !c)} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <Header className="hidden md:flex" />
          <div className="relative flex min-h-0 min-w-0 flex-1 gap-0 p-0 sm:gap-2 sm:pr-2 sm:pb-2">
            <main className="flex min-h-0 flex-1 shrink flex-col overflow-hidden rounded-none border-0 bg-background sm:rounded-2xl sm:border-2 sm:border-border">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className={cn(
          'fixed bottom-6 left-1/2 z-40 -translate-x-1/2 md:hidden',
          'flex size-14 items-center justify-center rounded-2xl border-2 border-border bg-background shadow-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        aria-label="Open menu"
      >
        <Menu className="size-6 text-foreground" aria-hidden />
      </button>

      <div
        className={cn(
          'fixed inset-0 z-50 md:hidden',
          'transition-opacity duration-300',
          mobileMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        />
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-screen max-w-[480px] bg-background transition-[transform] duration-300 ease-out',
            'flex flex-col overflow-y-auto shadow-xl scrollbar-none',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <SidebarContent
            collapsed={false}
            isTextVisible={true}
            hideCollapseButton
            onClose={() => setMobileMenuOpen(false)}
            className="rounded-r-2xl flex-1 min-h-0"
          />
        </div>
      </div>
    </>
  )
}
