# Migration v1.7.0 → v1.8.0

Cette version est un correctif de sécurité + une correction de bug. Aucune
donnée utilisateur, licence, ou historique de paiement n'est supprimée ou
recréée. Aucun changement de contrat API pour le frontend qui consomme déjà
`MbeukHubGate`.

## 1. Redéployer les Edge Functions modifiées

Fichiers modifiés :
- `_shared/hub-session-auth.ts` (correctif P0)
- `_shared/subscription-sync.ts` (correctif trial_started_at)

Toutes les fonctions qui importent `requireHubAuth` en dépendent :
`hub-me`, `hub-license-status`, `hub-sync-license`, `hub-checkout`. Redéployez
ces quatre fonctions (et leurs dépendances partagées) ensemble :

```bash
supabase functions deploy hub-me
supabase functions deploy hub-license-status
supabase functions deploy hub-sync-license
supabase functions deploy hub-checkout
```

**Comportement observable après déploiement :** toute session dont le
`refresh_token` Hub est invalide/expiré recevra désormais une **401** au lieu
d'un accès silencieusement accordé. C'est le comportement recherché ; si des
utilisateurs légitimes se retrouvent déconnectés de façon inattendue après ce
déploiement, cela indique un problème préexistant de gestion de session côté
frontend (jetons non rafraîchis correctement) qu'il faut investiguer — **ne pas
revenir en arrière sur ce correctif**.

## 2. Appliquer la migration SQL 004

```bash
supabase migration up
# ou, selon votre pipeline :
psql "$DATABASE_URL" -f templates/supabase/migrations/004_lockdown_entitlement_rls.sql
```

La migration est **idempotente** (elle vérifie l'existence des tables/policies
avant de les créer) et **conditionnelle** (elle ne touche que les tables déjà
présentes sur votre base). Néanmoins :

- ⚠️ **Avant de l'appliquer en production**, vérifiez que votre application
  métier n'a pas de fonctionnalité front-end qui écrit directement (via le
  client Supabase anon/authenticated) dans `subscriptions`, `licenses`,
  `license_history`, ou dans les colonnes `hub_user_id`/`hub_email`/
  `hub_product_id` de `profiles`. Après cette migration, ces écritures
  échoueront (c'est l'objectif). Toute écriture légitime sur ces tables doit
  passer par une Edge Function utilisant `service_role`.
- Si votre schéma définit déjà des policies RLS plus permissives sur ces
  tables pour d'autres besoins métier, cette migration **ajoute** des
  révocations de GRANT (`revoke insert, update, delete ... from authenticated`)
  qui prennent le pas sur toute policy existante — relisez la section
  "Écriture" avant application si vous avez une logique métier inhabituelle.

## 3. Aucune action requise côté frontend

`MbeukHubGate`, `HubGateClient`, et le contrat JSON échangé n'ont pas changé de
forme. Le seul changement comportemental frontend est un nettoyage de code mort
dans `pollPayment()` (voir CHANGELOG) — sans impact fonctionnel.

## 4. Vérification post-migration

```bash
node --test tests/
```

Les 23 tests (contract + le nouveau test de sécurité) doivent passer. Testez
également manuellement, sur un environnement de staging :

1. Connexion normale → `hub-me` répond `200` avec le profil.
2. Rejouez une requête vers `hub-license-status` avec un `X-Hub-Refresh-Token`
   invalide (ex. `abc123`) → doit répondre **401**, plus jamais `200`.
3. Essai gratuit en cours → rafraîchir la page plusieurs fois → le nombre de
   jours restants affiché doit rester stable (ne doit plus repartir de 3/7/N
   jours à chaque rechargement).

## 5. Rollback

En cas de blocage inattendu de sessions légitimes après déploiement :
- Ne désactivez pas le correctif d'authentification (il corrige une faille
  active). Diagnostiquez plutôt pourquoi le frontend présente un
  `refresh_token` invalide (session expirée non gérée, cache obsolète,
  `logout()` incomplet).
- La migration 004 peut être annulée indépendamment si nécessaire (elle ne
  supprime aucune donnée, seulement des policies/grants) :

```sql
drop policy if exists subscriptions_select_own on public.subscriptions;
-- etc. par table, puis re-grant si votre schéma hôte le nécessite :
grant insert, update, delete on public.subscriptions to authenticated;
```

N'annulez la migration 004 que temporairement et documentez pourquoi — elle
comble une lacune de défense en profondeur explicitement demandée par
l'invariant de sécurité du kit.
