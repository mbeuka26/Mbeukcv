# Audit sécurité — stockage, secrets, recovery

Scan du code source (`src`, `supabase`, `.env.example`). Les fichiers `.env.local` existent côté SaaS et sont gitignorés. Leur contenu n’a pas été lu et ne doit pas entrer dans un recovery.

## Secrets et où ils vivent

| Secret | Où | En clair ? | Dans Git ? |
| --- | --- | --- | --- |
| Clé Claude Pro | localStorage | Oui | Non |
| Clé RapidAPI Pro (legacy) | localStorage | Oui | Non |
| Clé anon Pro | localStorage | Oui, et ce n’est pas un secret privilégié | Non |
| Code licence Pro | localStorage | Oui | Non |
| JSearch / Africawork | `cles_collecte.secret` | Oui au repos. Illisible par le client RLS | Non |
| Clé Claude SaaS | `app_metadata` | Non (AES-GCM) | Non |
| `ANTHROPIC_API_KEY`, `RAPIDAPI_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `BREVO_API_KEY`, `MBEUK_HUB_API_KEY`, `CRON_SECRET`, `CREDIT_GRANT_SECRET` | Variables d’environnement serveur | Hors du navigateur si le déploiement est correct | `.env.example` sans valeurs. `.gitignore` couvre `.env*` |
| Colonnes `user_profiles` service-role / claude / rapidapi | Schéma seulement | Non écrites par l’app | Schéma versionné, pas de valeurs |

Aucun `sk-ant-` réel, aucun JWT service-role, aucun mot de passe base n’a été trouvé en dur dans `src`. Les occurrences `sk-ant-` sont des règles de format et des placeholders.

## Logs

- Pro : `console.info` de migration CV (nombre d’entrées, pas le contenu clé). `console.warn` safeStorage sans valeur de clé.
- `source-keys` : `console.error('source-keys: erreur interne')` sans le secret.
- SaaS settings : message d’erreur renvoyé au client, pas la clé.

Le repli `claudeKeyForUser` qui renvoie `ANTHROPIC_API_KEY` serveur si le déchiffrement échoue peut faire consommer la clé plateforme à la place de la clé client, sans l’afficher. À traiter comme risque de facturation, pas comme fuite navigateur.

## Device ID

`mbeuk-gate/device-fingerprint.js` :

- `mbeuk_hub_device_id` : UUID aléatoire dans localStorage. Perdu au reset. Pas un identifiant matériel.
- Empreinte SHA-256 de signaux navigateur (user agent, langue, écran, fuseau). Instable (mise à jour navigateur, dock, zoom). Dupliquable. Ne pas s’en servir comme ancre de déchiffrement.

## Recovery et exports

Il n’y a pas de fichier de recovery, donc pas de secret dedans aujourd’hui. Il n’y a pas non plus d’export JSON des CV. Le risque actuel est la perte, pas la fuite par export.

Risque actuel réel : toute extension ou script sur l’origine Pro peut lire `mbeukCV_customClaudeKey`. Le code le documente déjà dans `byok.ts`.

## Hub

Ne pas mettre dans un futur recovery : clés privées Hub, `MBEUK_AUTH_BRIDGE_SECRET`, service-role, secrets Edge, secret de grant crédit. La licence Pro peut être resaisie. L’entitlement SaaS se resynchronise au login.

## Priorités

1. Ne plus laisser la clé Claude Pro uniquement en clair, sans copie chiffrée hors navigateur.
2. Chiffrer `cles_collecte.secret` au repos avant d’élargir OnDB.
3. Ne jamais ajouter la service-role au frontend, y compris dans les colonnes déjà prévues du SaaS.
4. Un recovery ne contient pas les secrets serveur.
