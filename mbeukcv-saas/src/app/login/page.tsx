import { LoginForm } from '@/components/LoginForm';
import { InstallAppPanel } from '@/components/InstallAppPanel';
import { LoginShowcase } from '@/components/login/LoginShowcase';

export default function LoginPage({ searchParams }: { searchParams: { erreur?: string } }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <div className="order-2 lg:order-1">
          <LoginShowcase />
        </div>
        <div className="order-1 lg:order-2">
          <div className="sheet mx-auto max-w-md p-6 shadow-lg md:p-8">
            <h1 className="font-serif text-3xl text-ink">Compte</h1>
            <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">
              CV, offres d’emploi et candidatures dans un espace personnel sécurisé. Vos données ne sont pas partagées entre comptes.
            </p>
            {searchParams.erreur === 'lien' && (
              <p className="mb-4 text-sm text-[#8d3d24]">Ce lien n’est plus valable. Demandez-en un nouveau.</p>
            )}
            <LoginForm configured={configured} />
          </div>
          <div className="mx-auto mt-4 max-w-md">
            <InstallAppPanel compact />
          </div>
        </div>
      </div>
    </main>
  );
}
