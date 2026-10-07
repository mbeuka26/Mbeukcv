import { LoginForm } from '@/components/LoginForm';

export default function LoginPage({ searchParams }: { searchParams: { erreur?: string } }) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <h1 className="font-serif text-4xl">Compte</h1>
      <p className="mb-6 mt-2 text-sm text-muted">Chaque client a son compte et son espace. Le CV, les clés et les candidatures ne sont pas partagés avec les autres comptes.</p>
      {searchParams.erreur === 'lien' && <p className="mb-4 text-sm text-[#8d3d24]">Ce lien n’est plus valable. Demandez-en un nouveau.</p>}
      <LoginForm configured={configured} />
    </main>
  );
}
