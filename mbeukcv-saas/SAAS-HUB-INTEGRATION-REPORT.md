# Rapport d’intégration SaaS → Hub Central

**SaaS :** MbeukCV (`mbeukcv-saas`)  
**Kit :** MbeukSaaS-Integration-Kit 1.8.0 (les scripts du kit s’annoncent encore 1.7.0)  
**SDK :** `mbeuk-hub-sdk@2.0.0` (`file:vendor/mbeuk-hub-sdk-2.0.0.tgz`)  
**Date :** 28 septembre 2026

Le métier (CV, offres, candidatures, crédits Claude, collecte) est conservé. Le kit est branché comme barrière externe.

## 1. Fichiers ajoutés ou branchés

- `src/mbeuk-gate/` — barrière universelle, inchangée sauf usage depuis Next
- `src/components/HubGateBoot.tsx` — appelle `bootMbeukHubGate` au montage client
- `src/app/layout.tsx` — manifeste PWA, icône Apple, montage du boot
- `src/components/Shell.tsx` — racine protégée `#mbeuk-app`, emplacement `#hub-user-status`
- `src/components/LoginForm.tsx` — le formulaire existant appelle `hub-auth-login`, `hub-auth-register` et `hub-auth-forgot-password` ; si la fonction Edge répond 404, l’ancien Supabase Auth reprend
- `src/components/SignOutButton.tsx` — attribut `data-mbeuk-logout` en plus de la déconnexion Supabase déjà en place
- `hub.integration.json` — MbeukCV, `ownerType` platform, autorité `mbeuk_hub`, aucun identifiant réel
- `supabase/edge-functions/` — fonctions `hub-*` et `validate-trial` copiées
- `supabase/edge-functions/_shared/saas-profile.ts` — un e-mail déjà inscrit reçoit le mot de passe de pont pour ouvrir la session métier
- `supabase/migrations/000_mbeukcv_hub_cache.sql` — tables cache `profiles`, `subscriptions`, `license_history`, `licenses` avant les migrations 001 à 004 du kit
- `supabase/migrations/001` à `004` — copiées, non exécutées
- `public/manifest.webmanifest`, `public/mbeuk-sw.js`, icônes 192 / 512 et `apple-touch-icon.png` — palette déjà en place (`#f3eee6`, `#26211d`)
- `vendor/mbeuk-hub-sdk-2.0.0.tgz`
- `tsconfig.json` — `supabase` exclu du contrôle de types Next, car les fonctions Edge sont en Deno

## 2. Code métier d’origine

- Intact pour les pages métier (accueil, CV, offres, ATS, recherche, candidatures, paramètres, crédits Claude)
- Formulaire de connexion, d’inscription et de mot de passe oublié conservé
- Schéma métier (`user_profiles`, `job_offers`, `applications`) non fusionné avec le Hub
- Le cache Hub est un jeu de tables séparé, à créer seulement après revue SQL

## 3. Barrière Hub

- `bootMbeukHubGate()` au chargement, `authMode: existing`, secteur `generic`
- Racine protégée : `#mbeuk-app` (le shell). `/login` reste visible
- En-tête : `#hub-user-status` sous la ligne de compte existante
- Sans session Hub (`anonymous` ou `error`), `#mbeuk-app` est réaffichée pour ne pas masquer une session Supabase déjà ouverte
- Statut `blocked` (session Hub sans licence) : l’overlay du kit reste (acheter / essai)
- La redirection de paiement n’est pas une preuve ; le gate interroge la licence
- Mot de passe oublié : même bouton, appel `hub-auth-forgot-password`, repli Supabase si 404
- Le formulaire React n’a pas les id `#login-form` / `data-mbeuk-login`, pour éviter un double envoi avec `bindExistingAuth`

## 4. Secrets / Portal — à faire à la main

Aucun identifiant produit ni secret n’est écrit dans le dépôt.

Variables Edge / serveur, noms seulement :

- `MBEUK_HUB_URL` = `https://mbeukhub.vercel.app`
- `MBEUK_HUB_API_KEY` (clé `mbs_…`, serveur uniquement, jamais `NEXT_PUBLIC_` ni `VITE_`)
- `MBEUK_PRODUCT_ID`
- `MBEUK_APPLICATION_ID`
- `MBEUK_AUTH_BRIDGE_SECRET` (32 caractères aléatoires ou plus)
- Rôle service : secret injecté `SUPABASE_SERVICE_ROLE_KEY`, ou `MBEUK_SERVICE_ROLE_KEY`. Ne pas créer de secret `SUPABASE_*` dans le tableau Supabase (préfixe interdit)

Actions manuelles, non faites ici :

1. Créer l’application SaaS et le produit dans le portail développeur, puis coller les UUID dans les secrets Edge
2. Déployer les fonctions `hub-*`, y compris `hub-validate-promo` et `validate-trial`
3. Exécuter dans l’éditeur SQL, dans l’ordre : `000_mbeukcv_hub_cache.sql`, puis `001` à `004`
4. Pulse Chariow reste `https://mbeukhub.vercel.app/api/webhooks/chariow` — jamais dans ce SaaS
5. Secret `whsec_` uniquement sur Portal /payments ou sur le projet Vercel du Hub
6. Les forfaits Claude (crédits) restent un flux distinct de la licence Hub

## 5. Tests

| Scénario | Résultat |
|---|---|
| Health-check kit | OK — `OK - Le kit et la PWA installable ont été bien connectés et vérifiés sans faille` |
| Diagnose | 9 PASS, 0 WARN, 0 FAIL |
| `npm test` (`scripts/check-offers.ts`) | OK — règles d’offres |
| `npx next build` | OK, code de sortie 0 |
| Accueil déjà connecté | Tableau de bord visible, `#mbeuk-app` non masqué, `#hub-user-status` présent et vide (pas de session Hub), service worker `/mbeuk-sw.js` enregistré |
| Page `/login` sans cookie | HTTP 200, formulaire « Ouvrir une session » / « Créer un compte » toujours là |
| `--live` du health-check | NOT EXECUTED |
| Register / login Hub | NOT EXECUTED — fonctions Edge non déployées |
| Login sans licence, essai, promo, checkout, webhook | NOT EXECUTED |
| Migrations SQL sur le projet distant | NOT EXECUTED |
| `node scripts/validate/validate.mjs` | 13 contrôles OK, 0 échec (`npm test` et `npm run build` inclus) |

## 6. Limitations

- Tant que les fonctions Edge ne sont pas déployées, la connexion retombe sur Supabase Auth (réponse 404). La licence PRO n’est pas exigée dans ce repli
- Une session Supabase existante sans session Hub voit l’application. Ce n’est pas une licence
- Les tables cache Hub n’existent pas encore dans la base métier
- Le badge Essai / Standard n’apparaît qu’après une session Hub et un entitlement
- La collecte d’offres, les crédits Claude et Brevo ne font pas partie de ce branchement
