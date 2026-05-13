import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/clerk-react'
import { useTheme } from 'next-themes'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/logo-icon.svg"
            alt=""
            className="size-9 shrink-0 rounded-[10px] dark:[filter:invert(1)_hue-rotate(180deg)]"
          />
          <span className="font-manrope font-extrabold text-[24px] leading-none tracking-tight text-foreground">
            RevisionXYZ
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Sign in to access all IB resources
        </p>
      </div>

      <SignIn
        routing="virtual"
        fallbackRedirectUrl="/"
        appearance={{
          variables: {
            colorPrimary: isDark ? '#fafafa' : '#171717',
            colorBackground: isDark ? '#0d0d0d' : '#ffffff',
            colorInputBackground: isDark ? '#1a1a1a' : '#f5f5f5',
            colorText: isDark ? '#fafafa' : '#0a0a0a',
            colorTextSecondary: isDark ? '#a3a3a3' : '#737373',
            colorNeutral: isDark ? '#fafafa' : '#0a0a0a',
            colorShimmer: isDark ? '#262626' : '#e5e5e5',
            borderRadius: '0.75rem',
            fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
          },
          elements: {
            card: {
              boxShadow: 'none',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e5e5',
              borderRadius: '1rem',
            },
            formButtonPrimary: { borderRadius: '0.75rem' },
            formFieldInput: {
              borderRadius: '0.75rem',
              borderColor: isDark ? '#262626' : '#e5e5e5',
            },
            footerActionLink: {
              color: isDark ? '#fafafa' : '#171717',
              fontWeight: '600',
            },
          },
        }}
      />
    </div>
  )
}
