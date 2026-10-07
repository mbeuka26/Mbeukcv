# Plan d’implémentation

La vague Pro est en place : recovery chiffré, dossier ou téléchargement, double copie, restauration qui refuse d’écraser une base locale plus récente.

Le SaaS et le Hub n’ont pas été modifiés. La clé Claude du SaaS était déjà chiffrée.

Les clés JSearch / Africawork ne sont chiffrées au repos que si `COLLECT_KEYS_KEY` (16 caractères minimum) est définie sur les Edge Functions. Sans cette variable, l’enregistrement reste celui d’avant.

## Architecture cible (incrémentale)

```text
PRO V2
  Dexie (métier) + localStorage (config)
        │
        ▼
  Web Crypto AES-GCM
  clé dérivée d’un mot de passe maître ou d’une recovery key
        │
        ├── IndexedDB inchangé pour l’usage quotidien
        └── fichier recovery (dossier si File System Access, sinon téléchargement)
              recovery.current / recovery.previous / recovery.tmp

SAAS
  Inchangé pour le métier Cloud
  Clé Claude déjà chiffrée serveur
  Pas de service-role dans un export
  Hub inchangé
```

Mode produit après livraison :

- Pro : OFFLINE + CLOUD optionnel + RECOVERY
- SaaS : CLOUD. La récupération métier reste le compte. Un export chiffré est optionnel et séparé.

## Fichiers à créer (seulement après « oui »)

Dans `mbeukcv-pro-v2`, pas un nouveau framework :

- `src/services/capabilities.ts` — IndexedDB, OPFS, persist, File System Access, Web Crypto, service worker, storage estimate
- `src/services/recoveryCrypto.ts` — AES-GCM, IV unique, version `v1`
- `src/services/recoveryFile.ts` — format versionné, current/previous/tmp, refus si intégrité ou version invalide, refus d’écraser une base locale plus récente
- Branchement UI dans `pages/Parametres.tsx` uniquement
- Tests dans `scripts/` ou le runner existant `scripts/test.mjs`

Pas de dossier `RECOVERY/` parallèle qui dupliquerait l’app. Le prompt demande ces services ; ils vivent dans `src/services` pour rester dans l’architecture actuelle.

## Fichiers à modifier (après validation)

| Fichier | Changement |
| --- | --- |
| `Parametres.tsx` | Dossier ou export, mot de passe maître, restauration, texte UX imposé |
| `byok.ts` | Écriture locale chiffrée, ou double écriture le temps de la migration, sans casser la lecture actuelle au premier lancement |
| `supabase.ts` | Inclus dans le snapshot recovery, pas de changement du client |
| `db.ts` | Hook dirty + debounce. Pas de changement de schéma Dexie v1 sans migration Dexie v2 |
| `source-keys/index.ts` + `schema.sql` | Chiffrement du secret au repos, migration additive |

## Fichiers à ne pas modifier

- Routes, générateurs, templates CV, ATS, automatisation, mail
- `mbeuk-gate`, SDK Hub, checkout, entitlements
- `userClaude.ts` / `crypto.ts` SaaS (déjà conformes), sauf correctif de sécurité validé à part
- `.env.local`

## Format recovery proposé

Extension `.mbeuk`, JSON versionné :

```json
{
  "application": "mbeukcv-pro",
  "schemaVersion": 1,
  "writtenAt": "ISO-8601",
  "integrity": "sha-256 du payload canonique",
  "business": {},
  "preferences": {},
  "briaOnKey": { "encrypted": true, "payload": "..." },
  "briaOnDb": { "encrypted": true, "payload": "..." }
}
```

Jamais de clé API en clair. Métadonnées d’application et de version en clair pour refuser un fichier d’un autre produit avant déchiffrement.

Écriture : `recovery.tmp` → contrôle d’intégrité → renommage en `recovery.current.mbeuk` → l’ancien current devient `recovery.previous.mbeuk`.

Déclenchement : debounce (plusieurs secondes après la dernière modification), pas à chaque frappe.

Restauration : format, application, version, intégrité, déchiffrement, cohérence, comparaison de dates. Si le local est plus récent, demander confirmation. Un fichier tronqué, un mauvais mot de passe ou un mauvais checksum ne touche pas Dexie.

## UX (texte à utiliser)

> Choisissez un dossier dans lequel l'application conservera une copie de récupération de vos données et de vos configurations protégées.

Expliquer aussi : CV et réglages inclus ; clés chiffrées ; emplacement choisi ; après reset il faut réautoriser le dossier ou réimporter le fichier et saisir le mot de passe maître ; iOS ne permet pas un dossier surveillé.

## SQL

Pas de fichier SQL dans cet audit. Si RC-05 est validé : `ALTER` additif d’une colonne `secret_chiffre`, recopie chiffrée, conservation de l’ancienne colonne jusqu’à vérification, aucun `DROP`/`TRUNCATE` dans le script initial.

## Tests prévus

- CRUD local, fermeture/réouverture (Dexie inchangé)
- Recovery current/previous, tmp incomplet
- Corruption : tronqué, checksum, version, application, mot de passe
- OnKey : ajout, modification, suppression, absent des logs, présent chiffré dans le fichier
- OnDB : URL + anon restaurés, service-role absente
- Régression : login SaaS, génération, classique, ATS, offline assets, PWA

## Rollback

Les nouveaux services sont additifs. Revenir en arrière = retirer le branchement Paramètres et laisser Dexie / localStorage tels quels. Aucune migration destructive des CV. La bascule « clé Claude chiffrée en local » ne s’active qu’après lecture réussie de l’ancienne clé en clair, pour ne pas verrouiller les installations existantes.

## Dry-run

1. Lire un profil Dexie de test (base vide ou fixture).
2. Produire un buffer `.mbeuk` en mémoire.
3. Vérifier l’absence de la chaîne `sk-ant-` dans le JSON.
4. Corrompre le buffer et constater le refus.
5. Ne pas écrire dans le dossier utilisateur pendant le dry-run automatique.

## Hors périmètre de la première vague

- Réécriture du pont Hub.
- Sync bidirectionnelle complète Cloud.
- Archivage historique.
- Wrapper Tauri/Capacitor.
- Activation des colonnes service-role du SaaS.
