import Link from 'next/link';
import { SideNav } from '@/components/SideNav';
import { SignOutButton } from '@/components/SignOutButton';

export function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div id="mbeuk-app" className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside
        className="md:min-h-screen"
        style={{ backgroundColor: 'var(--color-sidebar)', color: 'var(--color-sidebar-text)' }}
      >
        <div className="flex items-end justify-between gap-4 px-4 py-4 md:block md:px-5 md:py-6">
          <div>
            <Link href="/accueil" className="font-serif text-xl leading-none" style={{ color: 'var(--color-sidebar-text)' }}>
              MbeukCV
            </Link>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-sidebar-muted)' }}>
              CV et offres
            </p>
          </div>
          <p className="max-w-[140px] truncate text-xs md:mt-8 md:max-w-none" style={{ color: 'var(--color-sidebar-muted)' }}>
            {email}
          </p>
          <div id="hub-user-status" className="mt-2 text-xs" style={{ color: 'var(--color-sidebar-text)' }} aria-live="polite" />
        </div>
        <SideNav />
        <div className="hidden px-5 py-6 md:block">
          <SignOutButton className="text-sm underline-offset-2 hover:underline [color:var(--color-sidebar-text)]" />
        </div>
      </aside>
      <div>
        <div className="flex justify-end px-4 pt-3 md:hidden">
          <SignOutButton className="text-sm text-ink underline-offset-2 hover:underline" />
        </div>
        <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
