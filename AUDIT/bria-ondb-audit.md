# Audit Bria OnDB

Bria OnDB = le client connecte son propre backend. Seul Pro v2 le fait réellement.

## Pro v2 — projet Supabase du client

Écran : `pages/Parametres.tsx`.

| Champ | Usage réel | Secret ? |
| --- | --- | --- |
| URL du projet | Base du client `createClient` et appels Edge Functions | Non |
| Clé publique anon | En-tête `apikey` et client Supabase | Non. Publique par conception. Ne pas la traiter comme une service-role |
| Code licence `MB-…` | Pont vers `verifier_licence`. Ce n’est pas OnDB | Élevé. Appartient à la licence, pas au backend métier |
| Clé JSearch | POST Edge Function `source-keys`, action `save` | Oui |
| Clé Africawork | Idem | Oui |

Stockage navigateur : `mbeukCV_supabaseUrl` et `mbeukCV_supabaseAnonKey` en clair dans localStorage. Pas de validation d’URL au-delà de « non vide ». Pas de test de format JWT anon.

La page explique que la clé anon n’est pas secrète et que les offres ne partent pas vers le Hub. C’est exact par rapport au code.

Les clés JSearch / Africawork ne sont pas relues par la page. L’Edge Function `source-keys` écrit `cles_collecte.secret` en texte brut. RLS est activé sans policy : le navigateur ne peut pas les lire. Le secret reste en clair au repos dans Postgres. Toute personne avec la service-role ou un dump SQL le voit.

Aucune service-role, aucun mot de passe base, aucun token privé Hub n’est demandé au navigateur Pro. À conserver.

Transmission : la clé de collecte voyage dans le corps JSON vers l’Edge Function, sous le jeton de session anonyme. Elle n’est pas mise dans les logs de la fonction (erreur générique).

Persistance : URL, anon et licence survivent à la fermeture, disparaissent au reset du site. Aucune restauration.

## SaaS — OnDB non branché

`supabase/schema.sql` déclare sur `user_profiles` :

- `supabase_url`
- `supabase_anon_key`
- `supabase_service_role_key`
- `rapidapi_key`
- `claude_api_key`

Le commentaire du schéma dit que les clés service_role utilisateur ne sont pas en clair. Le code `src/` n’écrit et ne lit aucune de ces colonnes. La clé Claude réelle est dans `app_metadata`, chiffrée. Les GRANT client excluent ces colonnes. Elles restent un risque de schéma : un futur écran qui les remplirait en clair, ou un dump, exposerait une service-role si quelqu’un les renseigne à la main.

Le SaaS utilise une base centrale (`NEXT_PUBLIC_SUPABASE_URL` + anon publique + `SUPABASE_SERVICE_ROLE_KEY` serveur uniquement). Ce n’est pas Bria OnDB.

## Recovery OnDB

À inclure plus tard, chiffré :

- URL (peut rester en clair dans le fichier : ce n’est pas un secret)
- clé anon (publique, mais la lier au fichier chiffré évite de faciliter la reconnexion automatique d’un tiers qui trouve le fichier)
- secrets de collecte : payload chiffré seulement
- jamais la service-role
- jamais `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `MBEUK_HUB_API_KEY`, `CRON_SECRET`
