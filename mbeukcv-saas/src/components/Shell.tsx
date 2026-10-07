import Link from 'next/link';
import { SideNav } from '@/components/SideNav';
import { SignOutButton } from '@/components/SignOutButton';

export function Shell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div id="mbeuk-app" className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="bg-sidebar text-[#f6f1ea] md:min-h-screen">
        <div className="flex items-end justify-between gap-4 px-4 py-4 md:block md:px-5 md:py-6">
          <div>
            <Link href="/accueil" className="font-serif text-xl leading-none text-[#f6f1ea]">MbeukCV</Link>
            <p className="mt-1 text-xs text-[#c8bfb4]">CV et offres</p>
          </div>
          <p className="max-w-[140px] truncate text-xs text-[#c8bfb4] md:mt-8 md:max-w-none">{email}</p>
          <div id="hub-user-status" className="mt-2 text-xs text-[#f6f1ea]" aria-live="polite" />
        </div>
        <SideNav />
        <div className="hidden px-5 py-6 md:block">
          <SignOutButton className="text-sm text-[#f6f1ea] underline-offset-2 hover:underline" />
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
