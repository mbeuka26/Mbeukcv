# Hub Supabase — MbeukCV Pro

Backend optionnel. Sans lui, l'application reste utilisable en local : voir le README à la racine.

Quand Paramètres contient l'URL du projet, la clé publique `anon` et un code de licence, l'interface utilise déjà ce backend :

- génération au quota (`generate-docs`) ;
- e-mail avec pièces jointes (`send-application`) ;
- profil candidat, puis matching (`profils_candidats`, `refresh-matches`) ;
- historique de CV de la licence (`historique_cv`).

Le navigateur n'appelle pas les fonctions de débit de crédits ni le quota d'e-mail. Ces fonctions sont réservées à `service_role`, utilisé seulement par les Edge Functions.

## 1. Créer le projet

Sur [supabase.com](https://supabase.com), créez un projet. Notez l'URL et la clé `anon` (Project Settings → API). Ne placez pas la clé `service_role` dans l'application.

## 2. Activer l'authentification anonyme

Authentication → Providers → Anonymous Sign-ins → Activer.

La session anonyme fournit `auth.uid()`. C'est cet identifiant qui occupe un des deux emplacements d'appareil de la licence, pas une valeur choisie par le navigateur.

## 3. Appliquer le schéma

Collez `supabase/schema.sql` dans l'éditeur SQL du projet (SQL Editor → New query → Run).

Le fichier retire l'ancienne fonction `verifier_licence(text, text)`. Il révoque l'exécution de `consommer_credit_ia`, `restituer_credit_ia`, `reserver_envoi_email` et `liberer_envoi_email` pour `PUBLIC`, `anon` et `authenticated`. Seul `service_role` les exécute. `authenticated` peut exécuter `verifier_licence(text)`.

## 4. Créer une licence

```sql
insert into public.licences (code, acheteur, actif, expire, credits_ia)
values ('MB-2026-TEST01', 'Test', true, now() + interval '1 year', 50);
```

Saisissez ce code dans Paramètres, avec l'URL et la clé anon. Le premier appel enregistre l'identifiant anonyme de ce navigateur. Un troisième identifiant est refusé.

## 5. Déployer les fonctions

```bash
supabase functions deploy generate-docs
supabase functions deploy send-application
supabase functions deploy scrape-offers --no-verify-jwt
supabase functions deploy collect-offers
supabase functions deploy source-keys
supabase functions deploy refresh-matches
```

`--no-verify-jwt` retire seulement le contrôle JWT de la passerelle, parce que pg_cron n'a pas de session utilisateur. `scrape-offers` refuse tout appel dont l'en-tête `x-cron-secret` ne correspond pas à `SCRAPE_CRON_SECRET`. Si le secret n'est pas défini, la réponse est 401. Cette fonction n'envoie pas d'en-têtes CORS.

## 6. Secrets

```bash
supabase secrets set MASTER_CLAUDE_KEY=sk-ant-...
supabase secrets set BREVO_API_KEY=xkeysib-...
supabase secrets set BREVO_FROM_EMAIL=no-reply@votredomaine.com
supabase secrets set BREVO_FROM_NAME="MbeukCV Pro"
supabase secrets set SCRAPE_CRON_SECRET=une-valeur-longue-et-aleatoire
supabase secrets set JSEARCH_API_KEY=votre-cle-rapidapi
supabase secrets set AFRICAWORK_API_KEY=votre-cle
supabase secrets set AFRICAWORK_API_URL=https://url-fournie-par-africawork
```

`BREVO_FROM_EMAIL` doit être une adresse vérifiée dans Brevo. `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis par la plateforme. `AFRICAWORK_API_URL` ne doit être posée que si Africawork vous a donné une URL réelle : sans elle, l'API n'est pas appelée. Les pages publiques Africawork passent par le cron.

## 7. Cron quotidien

Activez `pg_cron` et `pg_net`, puis :

```sql
select cron.schedule(
  'scrape-offers-quotidien',
  '0 2 * * *',
  $$
  select net.http_post(
    url := 'https://<votre-project-ref>.supabase.co/functions/v1/scrape-offers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<la valeur de SCRAPE_CRON_SECRET>'
    )
  );
  $$
);
```

## 8. Contrat

| Fonction | Qui l'appelle | Effet |
|---|---|---|
| `generate-docs` | Navigateur, session anonyme + licence | Sans clé personnelle dans le corps : réserve un crédit, appelle Claude, restitue le crédit si l'appel ou le schéma échoue. Avec une clé dans le corps : aucun crédit. L'écran IA en mode hub n'envoie pas la clé. |
| `send-application` | Navigateur, même session | Réserve un envoi (20 par jour UTC) avant Brevo, libère la place si Brevo échoue. |
| `refresh-matches` | Navigateur, après écriture RLS du profil | Corps : `scoreMinimum` de 0 à 100, défaut 75, seuil inclusif. Crédit seulement si Claude est appelé. Pas de crédit sur un cache de 6 h, un profil vide ou une liste d'offres vide. |
| `collect-offers` | Navigateur, avant le matching | Une requête JSearch avec les mots-clés. Africawork seulement si `AFRICAWORK_API_URL` et une clé existent. Écrit `offres_globales`. Aucun crédit IA. |
| `source-keys` | Navigateur | Enregistre ou retire la clé JSearch ou Africawork de la licence dans `cles_collecte`. La réponse ne contient que des booléens. |
| `scrape-offers` | Cron, en-tête `x-cron-secret` | MinaJobs et les pages publiques de `contracts/jobSources.ts`. Pas d'appel JSearch. Pas d'appel depuis l'interface. |

Les lectures de `user_matchs` et de `historique_cv`, et l'écriture de `profils_candidats`, passent par le client avec la session anonyme et les politiques RLS. Elles ne passent pas par une fonction de crédit.

## 9. Contrôle des privilèges

`npm test`, à la racine, vérifie que `schema.sql` contient les `REVOKE` attendus. Ce n'est pas une interrogation de votre base.

Sur le projet, une fois le schéma appliqué :

```bash
psql "$MBEUK_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/check-revokes.sql
```

Le script échoue si `anon` ou `authenticated` peut encore exécuter une fonction admin, si l'ancienne signature `verifier_licence(text, text)` existe, ou si `PUBLIC` a encore `EXECUTE`. Il exige que `authenticated` puisse exécuter `verifier_licence(text)`.

Ce dépôt n'a pas été redéployé sur un projet Supabase dans le cadre de cette documentation. Les secrets, le cron et la licence de test restent à appliquer sur le vôtre.
