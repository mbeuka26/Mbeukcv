export function unconfiguredScreen() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16">
      <h1 className="font-serif text-3xl">Base centrale non configurée</h1>
      <p className="mt-3 text-sm text-muted">
        Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY. Appliquez ensuite supabase/schema.sql sur ce projet.
      </p>
    </main>
  );
}
