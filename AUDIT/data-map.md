# Cartographie des données

## Matrice

| Catégorie | Exemples réels | Sensibilité | Local | Cloud | Recovery |
| --- | --- | --- | --- | --- | --- |
| Métier Pro | Historique CV IA, CV classique, réglages d’automatisation | élevée (données personnelles) | Dexie `mbeukcv_pro_db` | `historique_cv` seulement si OnDB configuré. Les CV classiques restent locaux | Absent |
| Métier SaaS | `user_profiles.cv_data`, candidatures, offres | élevée | Non (session navigateur seulement) | Supabase central | Le Cloud est la copie. Pas de fichier `.mbeuk` |
| Préférences | Fréquence, score minimum, mots-clés (Pro) | faible | Dexie `automationSettings` | Non | Absent |
| Configuration Pro | URL projet, clé anon, code licence | moyenne (anon = publique par conception ; licence = élevée) | localStorage en clair | Non | Absent |
| Bria OnKey Pro | `mbeukCV_customClaudeKey` | critique | localStorage en clair | Non envoyée au serveur en mode local | Absent |
| Bria OnKey SaaS | `auth.users.app_metadata.mbeuk_claude` | critique | Non | Chiffré AES-256-GCM avec `ENCRYPTION_KEY` | Survit au reset navigateur tant que le compte et `ENCRYPTION_KEY` existent. Pas de recovery fichier |
| Clés de collecte Pro | JSearch, Africawork | critique | Saisies puis envoyées à l’Edge Function. Non stockées dans le navigateur après envoi | Table `cles_collecte.secret` en clair, RLS sans policy client | Absent |
| Clé RapidAPI Pro | `mbeukCV_rapidApiKey` | critique si utilisée | localStorage en clair. L’UI ne la demande plus | Non | Absent |
| Bria OnDB Pro | URL + clé anon | URL et anon : publiques. Pas de service-role côté client | localStorage en clair | Le projet Supabase du client | Absent |
| Bria OnDB SaaS | Colonnes `supabase_url`, `supabase_anon_key`, `supabase_service_role_key`, `rapidapi_key`, `claude_api_key` | critique si remplies | Non lues par le code applicatif | Présentes dans le schéma, non écrites par `src/` | Non utilisé |
| Licence / entitlement | Code `MB-…` (Pro), cache Hub (SaaS) | élevée | localStorage Pro ; device id SaaS | Hub + RPC / tables entitlement | Resynchronisable. Ne pas en faire un backup métier |
| Session | JWT anonyme Pro, cookies SaaS, tokens Hub | critique | Selon le client Supabase / cookies | Hub / Auth | Ne jamais mettre dans un fichier de recovery |

## Clés localStorage Pro (constatées)

| Clé | Contenu | Chiffrement |
| --- | --- | --- |
| `mbeukCV_customClaudeKey` | Clé Anthropic | Non |
| `mbeukCV_rapidApiKey` | Clé RapidAPI héritée | Non |
| `mbeukCV_supabaseUrl` | URL projet | Non requis (non secret) |
| `mbeukCV_supabaseAnonKey` | Clé anon / publique | Non requis |
| `mbeukCV_hubLicenceCode` | Code licence | Non |

## IndexedDB Pro

Base `mbeukcv_pro_db`, version 1.

| Table | Contenu |
| --- | --- |
| `iaCvHistory` | `id`, texte CV, langue, style, dates |
| `classicCvs` | CV mode classique complet |
| `automationSettings` | singleton `id = settings` |

Migration unique : `mbeukCV_historiqueCv` (ancien localStorage) vers `iaCvHistory`, puis suppression de l’ancienne clé.

## Ce qui n’existe pas

- Dossier utilisateur `Documents/Mbeuk/…`
- Fichiers `recovery.current` / `recovery.previous` / `recovery.tmp`
- Export / import de données ou de configuration
- `navigator.storage.persist()`
- File System Access API
- OPFS, SQLite WASM
- File d’attente de synchronisation (dirty, retry, conflits)
- Chiffrement Web Crypto des secrets locaux
