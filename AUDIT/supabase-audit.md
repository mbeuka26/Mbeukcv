# Audit Supabase

Deux schémas. Ne pas les fusionner. Ne pas recréer les bases.

## Pro v2 — `mbeukcv-pro-v2/supabase/schema.sql`

Backend optionnel. Auth anonyme. L’identité métier est le code licence, pas un compte e-mail.

| Table | Rôle | RLS |
| --- | --- | --- |
| `licences` | Codes, crédits, appareils, uids | Activé, aucune policy. Accès via RPC `SECURITY DEFINER` |
| `profils_candidats` | Mots-clés et texte CV pour le matching | SELECT/INSERT/UPDATE si `est_proprietaire_licence` |
| `historique_cv` | Sync optionnelle de l’historique IA | ALL si propriétaire |
| `offres_globales` | Catalogue scrapé | Activé, aucune policy client |
| `cles_collecte` | Secrets JSearch / Africawork | Activé, aucune policy client. Secret en clair |
| `user_matchs` | Résultats de matching | SELECT propriétaire. Écriture service_role |
| `envois_journaliers` | Quota e-mail | Écriture service_role |

Edge Functions présentes : `collect-offers`, `generate-docs`, `refresh-matches`, `scrape-offers`, `send-application`, `source-keys`.

Sync actuelle de l’historique IA en mode hub : lecture/écriture directe de `historique_cv`. Pas de file, pas de version, pas de dirty flag, pas de fusion avec Dexie. Le mode est exclusif : hub **ou** local (`modeFromSettings`). Les CV classiques ne sont pas synchronisés.

Ce schéma n’est pas le Hub. Le code de `hubIdentity.ts` le dit : pont temporaire (session anonyme + `verifier_licence`), en attente du vrai contrat Hub.

## SaaS — `mbeukcv-saas/supabase/schema.sql`

Base centrale. Auth utilisateur réelle (cookies SSR).

| Table | Rôle | RLS |
| --- | --- | --- |
| `job_offers` | Catalogue | SELECT authenticated si offre active et non expirée |
| `user_profiles` | Fiche + `cv_data` | Ligne = `auth.uid()`. Colonnes secrètes hors GRANT |
| `applications` | Candidatures | ALL sur ses lignes |
| `credit_usage` | Compteurs | Révoqué pour anon/authenticated. RPC |

Trigger `on_auth_user_created` insère le profil. Fonctions `consume_credit` / `refund_credit`.

Migrations Hub dans `supabase/migrations/` : cache entitlement, clarification d’identité, compatibilité `access_type`, verrouillage RLS (`004_lockdown_entitlement_rls.sql`) sur `subscriptions`, `licenses`, `license_history` et colonnes `hub_*` de `profiles`. Écriture entitlement réservée à service_role.

Edge Functions Hub : login, logout, refresh, register, forgot-password, checkout, me, license-status, sync-license, validate-promo, validate-trial, diagnostics.

## Distinctions

```text
Supabase Auth SaaS     = session du compte
Supabase Database SaaS = CV, candidatures, offres, crédits
Supabase Pro (OnDB)    = projet optionnel du client Pro
Hub                    = identité, licence, paiement
Bria OnKey SaaS        = app_metadata chiffré, pas une table métier
```

L’existence de Supabase ne signifie pas que le mode local Pro est sauvegardé dans le Cloud. Sans URL dans Paramètres, tout reste dans le navigateur.

## Cloud métier manquant

Le Cloud métier SaaS existe. Le Cloud métier Pro existe comme option, incomplet (pas de sync des CV classiques, pas de file de conflits, secrets de collecte en clair).

Aucun `READY_TO_RUN_SUPABASE_MIGRATION.sql` n’est produit dans cet audit. Une migration future, si validée, devra chiffrer `cles_collecte.secret` sans DROP ni TRUNCATE, et ne devra pas activer l’écriture client des colonnes service-role du SaaS.
