# SECURITY-AUDIT — MbeukSaaS Integration Kit v1.8.0

Audit ciblé sur l'invariant central du kit :

> **NO CONFIRMED ENTITLEMENT = NO STANDARD ACCESS.**

Périmètre couvert : le chemin complet identité → paiement → entitlement → accès,
côté kit (Edge Functions `hub-*`, `_shared/*`, `universal-barrier/*`, migrations SQL).
Le webhook Chariow lui-même vit dans le Hub Central (application séparée, hors de ce
zip — voir `docs/architecture.md`) : il n'a donc pas pu être audité ici, seul son
**appelant côté SaaS** (`hub-checkout`, `hub-sync-license`, `hub-license-status`) l'a été.

---

## 1. [CRITIQUE — corrigé] Authentification non vérifiée dans `requireHubAuth`

**Fichier :** `templates/supabase/edge-functions/_shared/hub-session-auth.ts`

**Avant correction :** la fonction exigeait la simple *présence* de trois en-têtes
(`X-Hub-Session-Token`, `X-Hub-Refresh-Token`, `X-Hub-User-Id`), appelait
`auth.refreshSession({ refresh_token })` pour "valider" la session, mais **avalait
l'erreur en cas d'échec** :

```ts
try {
  await getHubClient().auth.refreshSession({ refresh_token: refreshToken });
} catch (e) {
  console.warn('[requireHubAuth] refreshSession non bloquant:', ...);
  // <-- continue quand même
}
```

Le `userId` métier utilisé pour toutes les décisions suivantes (`saasUserId(ctx)`)
provenait ensuite uniquement du `profiles` local recherché par le `X-Hub-User-Id`
**fourni par le client**, jamais vérifié.

**Impact :** un attaquant qui connaît (ou obtient) le `hub_user_id` d'un compte
tiers pouvait appeler `hub-me`, `hub-license-status`, `hub-sync-license`,
`hub-checkout` en fournissant des jetons de session/refresh **entièrement
inventés**, et obtenir :
- la fiche profil (nom, email, téléphone) du compte visé ;
- son statut d'entitlement (plan, expiration, appareils) ;
- la possibilité de déclencher un `checkout` (email de facturation Chariow au nom
  du compte visé) et une attribution d'affilié.

C'est une rupture de l'authentification (IDOR), plus grave que les scénarios de
paiement décrits dans le prompt maître : elle contourne l'identité elle-même, pas
seulement l'entitlement.

**Correctif appliqué (v1.8.0) :** un échec de `refreshSession` lève désormais une
`HubAuthError(401)` et bloque la requête (fail-closed). Test de non-régression :
`tests/security/hub-session-auth.contract.test.mjs`.

**Risque résiduel (non résolu par ce kit seul) :** le SDK `mbeuk-hub-sdk@2.0.0`
n'expose pas d'endpoint retournant l'identité (user_id/email) associée à un
`session_token`/`refresh_token` (`AuthRefreshResult` ne contient que
`session_token, refresh_token, expires_at`). Le correctif garantit donc qu'un
jeton **valide** a été présenté, mais ne peut pas encore vérifier côté SaaS que ce
jeton correspond bien au `hub_user_id` revendiqué dans l'en-tête. Recommandation
pour le Hub Central : exposer `auth.getUser(session_token) -> { user_id, email }`
(ou faire porter l'identité dans un JWT signé par le Hub, vérifiable localement
sans appel réseau), puis faire dériver `saasUserId` de cette réponse **au lieu du**
header client. Tant que cet endpoint n'existe pas côté Hub, ce point doit rester
sur la liste des risques connus de toute intégration utilisant ce kit.

---

## 2. [Corrigé] `trial_started_at` réinitialisé à chaque synchronisation

**Fichier :** `templates/supabase/edge-functions/_shared/subscription-sync.ts`

`mapHubToSubscription` fixait `trial_started_at = new Date().toISOString()` à
chaque appel (login, `hub-me`, poll post-paiement, etc.), alors que
`trial_ends_at` reste toujours calculé depuis la valeur **autoritaire** renvoyée
par le Hub. Pas de bypass d'accès possible (l'expiration réelle n'était jamais
affectée), mais l'UX ("jours d'essai restants") pouvait être incohérente d'un
rafraîchissement à l'autre. Corrigé : la valeur existante est relue avant upsert
et préservée.

---

## 3. [Renforcé] RLS des tables d'entitlement

Les migrations 001–003 ajoutent des colonnes de cache Hub sur `profiles` /
`subscriptions` / `licenses` / `license_history`, mais n'activaient RLS que sur
la nouvelle table `hub_affiliate_sessions`. Le kit s'installant sur un SaaS
existant, ces tables ont probablement déjà des policies définies par le SaaS
hôte — mais ce n'est pas garanti, et rien dans le kit ne l'imposait explicitement.

**Ajouté (migration `004_lockdown_entitlement_rls.sql`) :** RLS activé sur
`subscriptions`, `licenses`, `license_history`, `profiles` si ces tables existent,
avec :
- lecture limitée aux lignes du propriétaire (`auth.uid() = user_id` / `= id`) ;
- **aucune** policy INSERT/UPDATE/DELETE pour `authenticated`/`anon` (Postgres
  refuse par défaut sans policy — fail-closed) ;
- révocation explicite des GRANT d'écriture hérités sur ces tables/rôles ;
- révocation ciblée de `UPDATE` sur les colonnes `hub_user_id`/`hub_email`/
  `hub_product_id` de `profiles` (anti-usurpation de rattachement Hub).

Cette migration est idempotente et défensive : si le SaaS hôte a déjà des
policies plus permissives pour des besoins métier légitimes, il faut les
revalider après application (voir `MIGRATION-v1.7-to-v1.8.md`).

---

## 4. Points vérifiés et jugés conformes à l'invariant

- **`hub-license-status`, `hub-sync-license`, `hub-me`** : le statut `valid`
  provient toujours d'un appel serveur-à-serveur vers le Hub
  (`validateLicenseForUser` / `resolveHubLicenseForUser`), jamais d'une valeur
  fournie par le frontend. Le cache local `subscriptions` n'est qu'une
  **conséquence** de cet appel, jamais sa source.
- **Frontend (`mbeuk-hub-gate.js`)** : un retour `?payment=success` ne fait
  jamais qu'un poll serveur (`pollPayment` → `syncLicense` → Hub) ; il ne
  positionne jamais l'état `STANDARD` directement. `normalizeEntitlement`
  exige `payload.valid === true` en plus du statut, et bloque explicitement les
  statuts `unpaid|none|pending|cancel|fail|abandon|expired|blocked`.
  `applyProtection()` masque et rend `inert` la racine métier tant que le
  statut n'est pas `TRIAL`/`STANDARD`.
- **Secrets** : `MBEUK_HUB_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, secrets Brevo
  ne sont lus que côté Edge Functions (`Deno.env.get`), jamais dans
  `universal-barrier/*` (code frontend). `hub-service.ts` porte l'avertissement
  explicite "jamais côté frontend".
- **Idempotence de session** : le webhook de paiement lui-même appartient au
  Hub Central (hors de ce zip) ; côté SaaS, `hub-sync-license`/`hub-license-status`
  se contentent de relire l'état Hub — une relecture répétée ne peut pas
  dupliquer une licence côté SaaS car ces fonctions font un `upsert` sur une
  seule ligne par `user_id`.

---

## 5. Hors périmètre vérifié dans cette passe

Le prompt maître liste 40 sections couvrant l'ensemble de l'écosystème
(webhook Chariow, génération de licences, appareils, affiliation, PWA,
CI/CD, SDK interne). Cette passe d'audit s'est concentrée sur le chemin
identité → paiement → entitlement, le plus critique au regard de l'invariant
central. N'ont **pas** été ré-audités ligne par ligne dans cette itération :
- le webhook Chariow lui-même (vit dans le Hub Central, hors de ce zip) ;
- le contenu interne du SDK compilé (`sdk/official/dist/*.js`, boîte noire) ;
- les scripts d'installation (`scripts/install/*.mjs`) et la CI GitHub ;
- le détail du Service Worker PWA (`mbeuk-sw.js`) et son cache offline ;
- la logique de reconnaissance d'appareil par empreinte
  (`device-fingerprint.js`) au-delà de sa lecture superficielle.

Ces zones n'ont montré aucun signal d'alarme lors de la lecture faite, mais
n'ont pas reçu le même niveau de vérification que les points 1 à 4 ci-dessus et
devraient être revues avant un audit de sécurité externe formel.
