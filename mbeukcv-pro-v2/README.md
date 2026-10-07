# MbeukCV Pro

Générateur de CV et de lettres, avec un mode classique sans IA et un mode IA (Claude). Deux façons de l'utiliser, choisies dans Paramètres.

Le poste local est le mode par défaut. Il ne requiert pas de serveur. Le hub Supabase est optionnel : il ajoute les crédits partagés, l'e-mail avec pièces jointes, le matching d'offres et l'historique lié à une licence.

## Démarrage

```bash
npm install
npm run dev
```

L'application est servie sur `http://localhost:5173`. La navigation utilise le hash (`#/ia`, `#/classique`, …) pour que le fichier autonome s'ouvre aussi en `file://`.

```bash
npm run build:standalone
```

Le résultat est `dist-standalone/index.html`. Aucune clé n'est injectée au build.

## Poste local

Sans URL Supabase dans Paramètres :

| Écran | Comportement |
|---|---|
| Classique | CV à champs, trois modèles, export PDF. Aucune clé. |
| IA | Génération avec la clé Claude de l'appareil, appel direct à `api.anthropic.com`. Historique dans IndexedDB. |
| ATS | Analyse avec la même clé, sur l'appareil. Le hub n'a pas cette fonction. |
| Recherche | Aucune offre n'est interrogée ni inventée. État vide. Le matching demande la base métier. |
| Candidature | Téléchargement des PDF, puis `mailto:`. Le protocole ne joint pas les fichiers. |

Le modèle demandé est `claude-sonnet-5` (`contracts/claudeModel.ts`). Les prompts et les schémas Zod sont dans `contracts/`. L'interface appelle des ports (`src/usecases/ports.ts`) : l'adaptateur local ou hub est choisi selon Paramètres, et selon le bouton de mode sur l'écran IA.

## Hub

Quand Paramètres contient l'URL du projet et la clé publique `anon`, et qu'une licence est saisie :

- **IA, mode crédits** : `generate-docs` réserve un crédit, appelle la clé maître, le restitue si Claude ou la validation échoue. La clé personnelle n'est pas envoyée.
- **Candidature** : `send-application` envoie les PDF via Brevo, dans la limite de 20 e-mails par licence et par jour UTC.
- **Recherche** : `collect-offers` interroge JSearch (une requête, vos mots-clés) et Africawork seulement si `AFRICAWORK_API_URL` est posé. Les offres vont dans `offres_globales` de cette base, sans crédit IA. Ensuite le profil est écrit et `refresh-matches` calcule les scores. Un crédit n'est pris que si Claude est appelé. Le score minimum est inclusif.
- **Historique IA en mode crédits** : même formulaire, table `historique_cv`.

Le navigateur n'exécute pas les fonctions de crédit ni de quota. Détail de déploiement : `supabase/README.md`.

`scrape-offers` n'est pas appelé par l'interface. Seul le cron l'appelle, avec l'en-tête `x-cron-secret`. Il collecte MinaJobs et les pages publiques listées dans `contracts/jobSources.ts`. Il n'appelle pas JSearch.

## Écrans

| Route | Rôle |
|---|---|
| `#/` | Accueil |
| `#/classique` | CV structuré |
| `#/ia` | Génération et historique |
| `#/ats` | Analyse ATS |
| `#/recherche` | Critères et matching hub |
| `#/parametres` | Clé Claude, base métier, licence, clés JSearch et Africawork |

## Stockage sur l'appareil

Les CV, les modèles classiques et les critères de veille sont dans IndexedDB (`mbeukcv_pro_db`).

`localStorage` ne garde que de petites valeurs de cet appareil :

| Clé | Contenu |
|---|---|
| `mbeukCV_customClaudeKey` | Clé Anthropic personnelle |
| `mbeukCV_supabaseUrl` | URL de la base métier de ce projet |
| `mbeukCV_supabaseAnonKey` | Clé publique anon, pas la clé service |
| `mbeukCV_hubLicenceCode` | Code de licence saisi |
| `mbeukCV_rapidApiKey` | Ancienne clé locale, plus utilisée. Les clés JSearch et Africawork sont dans `cles_collecte`, illisibles par le navigateur. |

Ce n'est pas un coffre-fort. Une extension malveillante peut le lire. En revanche, le HTML d'un CV est nettoyé avant l'aperçu et avant l'export PDF : un document généré ne peut pas y lire ces clés. L'aperçu est dans un iframe sans droit de script. La clé Claude ne sort du navigateur que vers `api.anthropic.com`.

## Tests

```bash
npm test
```

Le script vérifie, sans base et sans appel réseau :

- le nettoyage HTML (script, `onerror`, `javascript:`, iframe retirés ; photo SVG refusée) ;
- la présence des certifications, langues, références et centres d'intérêt dans les trois modèles classiques, et l'échappement du nom ;
- le refus d'un dossier Claude incomplet par le schéma Zod ;
- la présence, dans `supabase/schema.sql`, des `REVOKE` qui retirent l'exécution des fonctions admin à `PUBLIC`, `anon` et `authenticated`.

Ce dernier contrôle lit le fichier. Il n'interroge pas une base. Pour le faire sur un projet où le schéma est déjà appliqué et où les rôles Supabase existent :

```bash
psql "$MBEUK_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/check-revokes.sql
```

Si `MBEUK_TEST_DATABASE_URL` est défini, `npm test` lance aussi cette commande. Sans cette variable, il s'arrête après les contrôles locaux et l'indique.

Il n'y a pas de pipeline d'intégration continue dans ce dépôt.
