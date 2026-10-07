# Architecture actuelle — MbeukCV

Audit réalisé sur le dépôt tel qu’il est. Aucune reconstruction. Deux applications coexistent. Elles ne partagent pas le même stockage.

## Produits

| Application | Runtime | Rôle |
| --- | --- | --- |
| `mbeukcv-pro-v2` | Vite 5, React 18, TypeScript, PWA (`vite-plugin-pwa`) | Application locale, utilisable hors ligne, backend Supabase optionnel |
| `mbeukcv-saas` | Next.js 14, React 18, TypeScript, Vercel | Application Cloud. Les données métier vivent dans Supabase central |

Le Hub central (kit `mbeuk-gate`, SDK `mbeuk-hub-sdk`) sert à l’authentification, aux licences, aux paiements et aux entitlements. Il n’est pas le magasin des CV.

## Mode de persistance constaté

| Produit | Mode réel aujourd’hui |
| --- | --- |
| Pro v2 | OFFLINE + CLOUD optionnel. Pas de recovery indépendant du navigateur |
| SaaS | CLOUD. La continuité métier dépend de Supabase, pas d’un fichier local |

## Pro v2 — couches

```text
UI (routes React)
  Accueil, /ia, /classique, /ats, /automatisation, /parametres
        │
        ▼
usecases/ports.ts
  mode local  si aucune config Supabase
  mode hub    si URL + clé anon présentes
        │
        ├── IndexedDB Dexie  mbeukcv_pro_db
        │     iaCvHistory, classicCvs, automationSettings
        ├── localStorage (safeStorage)
        │     clé Claude, clé RapidAPI (code mort UI), URL/anon, code licence
        └── Supabase optionnel (projet du client)
              Auth anonyme + RPC verifier_licence
              historique_cv, profils, matchs, clés de collecte
```

Le service worker met en cache les assets (JS, CSS, HTML, images, polices). Il ne met pas en cache `api.anthropic.com`. Il ne sauvegarde pas les données métier.

## SaaS — couches

```text
Navigateur
  cookies de session Supabase (SSR)
  localStorage : mbeuk_hub_device_id (identifiant généré, pas matériel)
  sessionStorage : code promo, référence
        │
        ▼
Next.js (routes + API)
  /login, /accueil, /cv, /classique, /ia, /ats, /offres, /candidatures,
  /recherche, /parametres, /reinitialiser
        │
        ▼
Supabase central
  user_profiles.cv_data, applications, job_offers, credit_usage
  auth.users.app_metadata.mbeuk_claude  (clé Claude chiffrée AES-256-GCM)
Hub
  login, licence, checkout, entitlements
```

Aucun IndexedDB, Dexie, OPFS, SQLite WASM, ni File System Access API dans le SaaS.

## Ce qui fonctionne et doit être conservé

- Mode local Pro sans configuration.
- Dexie comme magasin principal des CV et de l’automatisation.
- Saisie et validation de la clé Claude (`sk-ant-…`) dans Pro et dans le SaaS.
- Masquage de la clé à l’affichage. Le SaaS ne réaffiche pas la clé après enregistrement.
- Chiffrement serveur de la clé Claude du SaaS (`src/lib/crypto.ts`, `src/lib/userClaude.ts`).
- Séparation URL / clé anon (publique) et absence de service-role dans le navigateur Pro.
- RLS deny-by-default sur `licences`, `offres_globales`, `cles_collecte` (Pro).
- Colonnes secrètes de `user_profiles` retirées des GRANT client (SaaS).
- Hub non utilisé comme base des CV.
