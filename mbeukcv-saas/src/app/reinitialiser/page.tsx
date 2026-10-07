import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export default function ResetPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
      <h1 className="font-serif text-4xl">Nouveau mot de passe</h1>
      <p className="mb-6 mt-2 text-sm text-muted">Choisissez un mot de passe pour ce compte. Il ne donne accès qu’à votre espace.</p>
      <ResetPasswordForm />
    </main>
  );
}
