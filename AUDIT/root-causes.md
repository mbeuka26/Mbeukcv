# Causes racines

| ID | Problème | Cause racine | Fichiers | Impact | Priorité | Solution proposée (après validation) |
| --- | --- | --- | --- | --- | --- | --- |
| RC-01 | Reset navigateur efface CV, clés et config Pro | Stockage uniquement navigateur, pas de recovery | `db.ts`, `safeStorage.ts`, `byok.ts`, `supabase.ts` | Perte métier et OnKey | P0 | Recovery chiffré hors navigateur + export |
| RC-02 | Clé Claude Pro en clair | BYOK assumé dans localStorage | `byok.ts` | Lecture par script d’origine | P0 | Web Crypto AES-GCM. Recovery sans clair |
| RC-03 | Clé RapidAPI legacy en clair | Module conservé, UI retirée | `rapidApiKey.ts` | Secret dormant | P1 | Ne plus lire/écrire, ou chiffrer avec OnKey |
| RC-04 | OnDB perdu au reset | URL et anon seulement dans localStorage | `supabase.ts`, `Parametres.tsx` | Reconfiguration manuelle | P1 | Inclure dans le recovery (anon non privilégiée) |
| RC-05 | Secrets de collecte en clair en base | Upsert texte brut | `source-keys/index.ts`, `schema.sql` `cles_collecte` | Dump ou service-role = secret | P0 | Chiffrer au repos. Migration non destructive |
| RC-06 | Pas de current/previous | Aucun moteur de recovery | — | Écriture interrompue pourrait tout perdre le jour où on ajoute un fichier unique | P0 | TMP → validation → current, ancien current → previous |
| RC-07 | Pas de détection de capacités | Jamais implémenté | — | Pas de repli dossier / export | P1 | Capability detector |
| RC-08 | Persist Storage non demandé | Jamais appelé | `vite.config.ts` | Éviction possible sous pression disque | P2 | `navigator.storage.persist()` sans en faire une garantie |
| RC-09 | Sync hub/local exclusive | `modeFromSettings` choisit un seul store | `usecases/ports.ts`, `hub/cvHistoryStore.ts` | CV classiques jamais cloud. Pas de file ni de conflit | P1 | Ne pas réécrire la sync dans cette première vague sans validation. Recovery local d’abord |
| RC-10 | Schéma SaaS prévoit une service-role utilisateur | Colonnes présentes, code ne les utilise pas | `mbeukcv-saas/supabase/schema.sql` | Futur écran pourrait exposer une clé privilégiée | P1 | Ne pas les brancher au frontend. Ne pas les mettre dans un recovery |
| RC-11 | Device id non durable | UUID localStorage + empreinte instable | `device-fingerprint.js` | Reset = nouvel appareil pour la licence | P2 | Documenter. Ne pas lier le déchiffrement à ce id |
| RC-12 | Perte de `ENCRYPTION_KEY` SaaS | Sel et clé uniquement serveur | `crypto.ts` | Clés Claude clients indéchiffrables | P1 | Procédure de sauvegarde de la clé d’environnement hors Git. Pas dans le recovery client |
| RC-13 | Pas d’export / import | Fonctions absentes | — | Pas de plan B iOS | P0 | Export / import versionné, secrets chiffrés |
| RC-14 | Standalone `file://` | localStorage souvent mort | `safeStorage.ts`, `vite.config.standalone.ts` | Session non persistante | P2 | Documenter. Recovery dossier indisponible dans ce mode |

## Matrice de préservation (aucune modification faite)

| Élément | Emplacement | Fonctionnement actuel | Action prévue | Risque si on touche trop tôt |
| --- | --- | --- | --- | --- |
| UI et routes Pro | `App.tsx` | Six écrans | Préserver. Ajouter plus tard une section recovery dans Paramètres | Régression navigation |
| UI SaaS | `src/app/*` | Cloud + Hub | Préserver | Auth cassée |
| CV locaux | Dexie | CRUD historique et classique | Préserver le schéma v1. Recovery en lecture seule d’abord | Perte CV |
| Auth SaaS | cookies + middleware | Session Supabase | Ne pas modifier | Déconnexion |
| Auth Pro | anonyme + licence | Pont temporaire | Ne pas remplacer le Hub dans cette mission | Licence cassée |
| PWA | Workbox / `pwa.js` | Cache assets | Préserver | Hors-ligne cassé |
| OnKey SaaS | `userClaude.ts` | Déjà chiffré | Préserver | Clés illisibles |
| OnDB Pro | Paramètres | URL + anon | Préserver la saisie | Perte de connexion |
| Hub | `mbeuk-gate` | Licence, paiement | Ne pas modifier | Entitlements |
