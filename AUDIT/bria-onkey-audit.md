# Audit Bria OnKey

Bria OnKey = clés API fournies par le client. Deux implémentations distinctes.

## Pro v2 — clé Claude dans le navigateur

| Point | Constat |
| --- | --- |
| Écran | `modes/ia/IaGenerator.tsx` : champ mot de passe, lien console Anthropic, texte qui dit que la clé reste sur l’appareil |
| Validation | `sk-ant-` + au moins 20 caractères (`byok.ts`) |
| Stockage | `localStorage` via `safeStorage`, clé `mbeukCV_customClaudeKey` |
| Format | Texte brut |
| Chiffrement | Aucun |
| Utilisation | `adapters/local/documentGenerator.ts` et l’analyseur ATS local envoient la clé en HTTPS vers `api.anthropic.com` (`dangerouslyAllowBrowser: true`) |
| Logs | La clé n’est pas écrite dans `console.*`. Le masque `maskClaudeKey` existe |
| Export / import | Absent |
| Après fermeture | La clé reste tant que le navigateur conserve localStorage |
| Après reset navigateur | La clé disparaît. Aucun moyen de la restaurer |
| Mode hub | La clé locale n’est pas le chemin du quota serveur. Le mode bascule dès qu’une config Supabase existe |

`rapidApiKey.ts` est un second coffre local en clair. L’interface ne le demande plus. Le module reste chargeable et la clé, si elle a été écrite, survit en clair.

## SaaS — clé Claude sur le compte

| Point | Constat |
| --- | --- |
| Écran | `components/SettingsForm.tsx`, route `/parametres` |
| API | `POST /api/settings`. Un champ vide ne remplace pas une clé existante. Pas d’action « supprimer la clé » exposée |
| Validation | Préfixe `sk-ant-`, longueur 20–400, pas d’espace |
| Stockage | `auth.users.app_metadata.mbeuk_claude`, préfixe `v1:` |
| Chiffrement | AES-256-GCM, IV 12 octets, tag 16 octets. Clé dérivée par `scryptSync(ENCRYPTION_KEY, 'mbeukcv-saas', 32)` |
| Affichage | Statut booléen seulement. La clé n’est pas renvoyée au client |
| Utilisation | Déchiffrée côté serveur (`claudeKeyForUser`) pour les appels Anthropic. Repli sur `ANTHROPIC_API_KEY` serveur si le déchiffrement échoue |
| Logs | Le secret n’est pas journalisé |
| Reset navigateur | La clé reste sur le compte. L’utilisateur se reconnecte |
| Recovery fichier | Absent. La perte de `ENCRYPTION_KEY` rend le payload indéchiffrable |
| Sel scrypt | Fixe (`mbeukcv-saas`). Acceptable pour une clé d’environnement, pas une dérivation par utilisateur |

## Écart avec la cible du prompt

- Pro : conserver le BYOK navigateur, ajouter un recovery chiffré. Jamais la clé en clair dans le fichier.
- La clé de déchiffrement ne doit pas vivre seulement dans IndexedDB / localStorage, sinon le reset rend le recovery inutile. Stratégie proposée : mot de passe maître ou recovery key saisi par l’utilisateur, dérivation Web Crypto (PBKDF2 ou Argon2 si disponible via lib standard), AES-GCM, IV unique, version du format.
- SaaS : le chiffrement serveur existe déjà. Ne pas le dupliquer en clair dans un export. Un export de configuration ne contient que `encrypted: true` + payload, déverrouillé par un secret que le serveur ne met pas dans le fichier en clair.
- Ne pas logger la clé lors des diagnostics.

## Compromis à valider

| Option | Survit au reset navigateur | Contrainte |
| --- | --- | --- |
| Mot de passe maître | Oui, si le fichier recovery est hors du navigateur | L’utilisateur doit s’en souvenir |
| Recovery key affichée une fois | Oui | À conserver hors du navigateur |
| Les deux | Oui | Meilleure continuité, plus d’UX |
| Keystore natif (Tauri / Capacitor) | Oui sur desktop/mobile natif | Hors PWA pure. Non imposé |
