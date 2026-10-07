# MASTER PROMPT ULTRA COMPLET

## Audit, protection, persistance et récupération des données locales + Cloud + Bria OnKey + Bria OnDB

Tu interviens sur une application SaaS/PWA existante. **FIX DON'T
REBUILD.** Comprends et audite l'existant avant toute modification.
Conserve toute fonctionnalité métier, toute UI, toute route, tout
stockage et toute intégration qui fonctionne.

## 1. OBJECTIF

Construire, après audit et validation humaine, une architecture robuste
permettant de supporter selon le produit :

-   OFFLINE ONLY : données métier locales, sans Cloud obligatoire ;
-   OFFLINE + RECOVERY : données locales + fichier/dossier de
    récupération ;
-   CLOUD : données métier Cloud ;
-   CLOUD + LOCAL : base locale + synchronisation Cloud ;
-   CLOUD + LOCAL + RECOVERY : local + Cloud + récupération
    indépendante.

Le Hub Central reste séparé des données métier. Il sert notamment à
l'authentification, aux licences, paiements et entitlements selon le
contrat existant. **Ne pas transformer le Hub en stockage métier.**

## 2. RÈGLE ABSOLUE

Ne reconstruis pas l'application.

Avant toute modification :

**AUDIT → CARTOGRAPHIE → ROOT CAUSE → PLAN → VALIDATION HUMAINE → STOP →
IMPLÉMENTATION → TESTS → VALIDATION FINALE.**

Le plan n'est pas une autorisation de modifier.

------------------------------------------------------------------------

# PHASE 1 --- AUDIT COMPLET

Inspecte réellement :

-   framework/runtime ;
-   routes/pages/composants ;
-   services/hooks/stores ;
-   business logic ;
-   auth ;
-   IndexedDB/Dexie ;
-   localStorage/sessionStorage ;
-   SQLite WASM ;
-   OPFS ;
-   Service Worker/cache PWA ;
-   Persistent Storage ;
-   File System Access API ;
-   export/import ;
-   sauvegardes ;
-   restauration ;
-   synchronisation ;
-   Supabase Auth ;
-   Supabase Database ;
-   Supabase Storage ;
-   migrations ;
-   RLS/policies ;
-   RPC/functions ;
-   variables d'environnement ;
-   APIs externes ;
-   Bria OnKey ;
-   Bria OnDB ;
-   tests ;
-   build/deployment.

Ne suppose rien. Documente ce qui existe réellement.

------------------------------------------------------------------------

# PHASE 2 --- CLASSIFICATION DES DONNÉES

Créer une matrice au minimum :

  -------------------------------------------------------------------------------------------------------------
  Catégorie             Exemples                    Sensibilité   Local       Cloud          Recovery
  --------------------- --------------------------- ------------- ----------- -------------- ------------------
  Métier                clients, stocks, projets    variable      Oui         optionnel      Oui

  Préférences           thème, paramètres           faible        Oui         optionnel      Oui

  Configuration         paramètres applicatifs      moyenne       Oui         optionnel      Oui

  Bria OnKey            clés Claude/OpenAI/Gemini   CRITIQUE      Oui         selon          Oui, chiffré
                                                                              architecture   

  Bria OnDB             configuration/credentials   CRITIQUE      Oui         selon          Oui, chiffré si
                        Supabase                    selon élément             architecture   secret

  Licence/entitlement   état d'accès                élevée        cache       Hub            resynchronisable

  Session Hub           tokens                      critique      selon       Hub            jamais comme
                                                                  contrat                    backup métier
  -------------------------------------------------------------------------------------------------------------

Ne jamais confondre Auth, Licence, Entitlement, données métier, Bria
OnKey, Bria OnDB et Recovery.

------------------------------------------------------------------------

# PHASE 3 --- BRIA ONKEY

## Objectif

Bria OnKey permet au client de renseigner ses propres clés API, par
exemple :

-   Claude/Anthropic ;
-   OpenAI ;
-   Gemini ;
-   autres fournisseurs IA ;
-   autres APIs propres à l'application.

Auditer exactement :

-   écran de saisie ;
-   validation ;
-   stockage actuel ;
-   format ;
-   chiffrement ;
-   utilisation ;
-   logs ;
-   export/import ;
-   persistance après fermeture ;
-   comportement après reset navigateur.

Si les clés sont uniquement dans le navigateur, conserver le
fonctionnement existant mais ajouter une persistance/recovery sécurisée.

## Recovery OnKey

Le recovery doit pouvoir contenir une représentation chiffrée de la
configuration OnKey.

**Jamais de clé API en clair dans un fichier de recovery.**

Exemple conceptuel :

``` json
{
  "briaOnKey": {
    "encrypted": true,
    "payload": "..."
  }
}
```

Adapter au système réel.

## Cryptographie

Utiliser des primitives standards, notamment Web Crypto API/AES-GCM si
approprié. Étudier :

-   clé maître ;
-   mot de passe maître ;
-   recovery key ;
-   dérivation de clé ;
-   IV/nonce unique ;
-   intégrité ;
-   versionnement.

Ne jamais inventer de cryptographie maison.

## Point critique

Si la seule clé de déchiffrement est dans IndexedDB/localStorage/OPFS et
que l'utilisateur efface les données navigateur, le recovery peut
devenir inutilisable.

Concevoir donc une stratégie réaliste :

-   mot de passe maître ;
-   recovery key ;
-   combinaison des deux ;
-   keystore natif si wrapper natif ;
-   autre mécanisme sûr et compatible.

Documenter les compromis.

------------------------------------------------------------------------

# PHASE 4 --- BRIA ONDB

## Objectif

Bria OnDB permet au client de connecter son propre backend Cloud,
notamment son propre projet Supabase, afin que ses données puissent être
stockées dans son infrastructure.

Identifier exactement les champs demandés et leur usage réel.

Exemples possibles :

-   Project URL ;
-   clé anon/public ;
-   tokens ;
-   credentials ;
-   autres paramètres.

Ne pas considérer toutes les clés comme secrètes automatiquement.

## Classification obligatoire

Distinguer notamment :

-   Project URL ;
-   clé publique/anon ;
-   service-role/private key ;
-   mot de passe DB ;
-   tokens privés ;
-   autres credentials.

Une clé Supabase publique par conception n'est pas équivalente à une
service-role key.

**Une clé privilégiée ne doit jamais être exposée au frontend.**

## Audit OnDB

Vérifier :

-   saisie ;
-   validation ;
-   stockage ;
-   chiffrement ;
-   utilisation ;
-   transmission ;
-   logs ;
-   export ;
-   recovery ;
-   restauration ;
-   sécurité.

Les secrets OnDB doivent être chiffrés dans les recovery files.

------------------------------------------------------------------------

# PHASE 5 --- RECOVERY

Mettre en place ou compléter un moteur de recovery adapté à l'existant.

Le recovery peut contenir :

``` text
Données métier
Configuration
Préférences
Bria OnKey chiffré
Bria OnDB chiffré
Métadonnées
Version du schéma
Intégrité
```

Format versionné possible :

``` text
.mbeuk
```

Ne pas imposer ce format si un meilleur format existe déjà.

## Double recovery

Lorsque possible :

``` text
recovery.current.mbeuk
recovery.previous.mbeuk
recovery.tmp
```

Flux :

``` text
TMP → validation → CURRENT
ancien CURRENT → PREVIOUS
```

Ne jamais laisser une écriture interrompue détruire la dernière copie
valide.

------------------------------------------------------------------------

# PHASE 6 --- DOSSIER UTILISATEUR

Lorsque la plateforme le permet :

1.  demander à l'utilisateur de choisir un dossier ;
2.  expliquer pourquoi ;
3.  demander l'autorisation ;
4.  la conserver lorsque techniquement possible ;
5.  créer un dossier dédié ;
6.  y maintenir les fichiers de recovery ;
7.  sauvegarder automatiquement selon une stratégie non bloquante.

Exemple :

``` text
Documents/
└── Mbeuk/
    └── [Application]/
        ├── recovery.current.mbeuk
        ├── recovery.previous.mbeuk
        └── metadata
```

Le nom réel dépend du produit.

------------------------------------------------------------------------

# PHASE 6 BIS --- PREMIÈRE OUVERTURE, UNE SEULE FOIS, SANS MOT DE PASSE

Cette phase complète les phases 5, 6, 8 et 26. Elle ne les annule pas :
chiffrement, intégrité, double fichier current/previous, séparation du
Hub et interdiction d'exposer un service-role restent obligatoires.

Le mot de passe maître saisi par l'utilisateur est abandonné pour ce
produit. Beaucoup d'utilisateurs abandonnent l'application dès qu'on
leur redemande un mot de passe. La protection repose sur la possession
du dossier de l'application ou du compte Google, pas sur une phrase
secrète tapée à chaque restauration.

## Première ouverture

À la première ouverture, sur téléphone ou ordinateur, proposer une seule
fois où conserver les données. L'utilisateur peut cocher le local, et
peut aussi relier Google Drive. Les deux peuvent être actifs ensemble.

Pour le local :

1. l'utilisateur choisit seulement un dossier parent ;
2. l'application crée elle-même, à l'intérieur, un dossier au nom de
   l'application ;
3. pour MbeukCV, ce dossier s'appelle `MbeukCV` ;
4. si le dossier choisi porte déjà ce nom, ne pas en imbriquer un
   second.

Exemple :

``` text
Dossier choisi par l'utilisateur/
└── MbeukCV/
    ├── recovery.current.mbeuk
    ├── recovery.previous.mbeuk
    └── recovery.key
```

Pour Google Drive :

1. un bouton relie le compte Google déjà ouvert dans le navigateur ;
2. aucun mot de passe de récupération n'est demandé : le clic suffit ;
3. l'application crée un dossier au nom de l'application et y place les
   mêmes fichiers, y compris `recovery.key`.

Le client OAuth Google est public. Le jeton de session reste en mémoire.
Il n'est pas un secret de service.

## Clé automatique

L'application génère elle-même la clé de recovery.

- Elle est écrite dans `recovery.key`, dans le dossier de l'application.
- La même clé est envoyée dans Drive quand Drive est relié.
- Elle est aussi retenue dans le stockage du navigateur tant que ce
  stockage existe, pour ne plus rien redemander.
- Le fichier `.mbeuk` reste chiffré (AES-GCM) et intègre. La clé n'est
  pas un mot de passe choisi par l'utilisateur.
- Ne pas régénérer la clé si `recovery.key` existe déjà : les anciennes
  copies deviendraient illisibles.
- La clé de travail quotidienne, par exemple la clé Claude utilisée pour
  générer, reste disponible sans redemander cette clé de recovery.

Documenter le compromis : quelqu'un qui possède le dossier, ou le compte
Google, peut lire la copie. C'est le choix retenu pour que la reprise
se fasse sans mot de passe et, lorsque c'est possible, sans bouton.

## Enregistrement automatique

Après ce premier réglage :

- ne plus afficher le choix du dossier ;
- ne plus demander d'écrire un mot de passe ;
- ne pas exiger un bouton Enregistrer à chaque modification, ni à chaque
  changement de page ;
- chaque modification métier part automatiquement dans le dossier
  `MbeukCV` ;
- si l'utilisateur est en ligne et que Drive est relié, la même copie
  part en parallèle sur Drive ;
- hors connexion, le travail local continue ; Drive est mis à jour au
  retour d'Internet ;
- l'écriture reste non bloquante, avec fichier temporaire puis promotion
  current/previous.

Tant que les données du navigateur existent, ce réglage n'est jamais
redemandé.

## Après effacement des données du navigateur

Ne pas demander un bouton Restaurer si la copie peut revenir seule.

Dès l'ouverture, si le stockage du navigateur est vide :

1. si l'utilisateur est en ligne et que la session Google est encore
   ouverte, reprendre la dernière copie Drive automatiquement, sans
   clic, sans fenêtre, sans mot de passe ;
2. ne pas créer de dossier Drive vide pendant cette recherche ;
3. si cette reprise automatique réussit, l'utilisateur travaille
   aussitôt, comme avant l'effacement.

Le dossier déjà créé sur le téléphone ou l'ordinateur ne peut pas être
relu tout seul. Le navigateur retire l'autorisation en même temps que
les données du site. Aucune application web ne peut contourner cela.

Dans ce cas seulement, réafficher le même choix de dossier qu'à la
première ouverture. Si l'utilisateur reprend le même emplacement et que
`MbeukCV` contient déjà une copie, la recharger automatiquement. Ne pas
l'écraser avec un navigateur vide. Ne pas ajouter un second bouton
Restaurer.

Ne jamais remplacer en silence des données locales plus récentes.

## Limite à dire clairement

Le choix est unique tant que le navigateur garde ses données. Drive
revient sans bouton tant que le compte Google du navigateur est encore
ouvert. Le dossier local exige un nouveau choix du même emplacement :
c'est une limite du navigateur, pas un oubli du produit. Une PWA ne peut
pas réinstaller ce dossier ni conserver cette permission après
l'effacement. Sur iPhone, le choix de dossier surveillé est souvent
indisponible : Drive est alors le seul chemin vraiment automatique.

------------------------------------------------------------------------

# PHASE 7 --- FERMETURE / RÉOUVERTURE

Tester :

``` text
Configuration OnKey
+
Configuration OnDB
+
Données métier
+
Recovery
        ↓
Fermeture navigateur
        ↓
Réouverture
        ↓
Récupération automatique lorsque possible
```

L'utilisateur ne doit pas être obligé de ressaisir inutilement ses clés
si elles ont été restaurées correctement.

------------------------------------------------------------------------

# PHASE 8 --- RESET NAVIGATEUR

Test obligatoire :

``` text
Créer données
Configurer OnKey
Configurer OnDB
Créer recovery
Fermer
Effacer données navigateur
Rouvrir
Réauthentifier si nécessaire
Réautoriser le dossier seulement si Drive n'a pas pu revenir seul
La reprise Drive se fait sans clic lorsque la session Google existe
Vérifier données
Vérifier OnKey
Vérifier OnDB
```

La récupération ne doit pas dépendre uniquement d'un stockage que le
reset peut supprimer.

Le scénario produit est celui de la phase 6 bis : une seule demande au
premier lancement, copie automatique ensuite. Après effacement du
navigateur, Drive revient sans bouton si la session Google est ouverte.
Le dossier local n'est relu qu'en choisissant à nouveau le même
emplacement, parce que le navigateur retire l'autorisation.

------------------------------------------------------------------------

# PHASE 9 --- LIMITES PWA

Ne jamais promettre qu'une PWA peut :

-   écrire silencieusement dans n'importe quel dossier ;
-   conserver toujours une permission externe ;
-   obtenir un identifiant matériel permanent ;
-   garantir le même filesystem sur Windows/Android/iOS ;
-   contourner les restrictions du navigateur.

Auditer séparément :

### Windows

Chrome, Edge, PWA, File System Access, OPFS, IndexedDB, Web Crypto.

### Android

Chrome/PWA, stockage, permissions, File System Access si disponible, Web
Crypto.

### iOS/iPadOS

Safari/PWA, Files, IndexedDB, OPFS, Web Crypto et limites réelles.

Pour chaque mécanisme, indiquer :

**SUPPORTED / PARTIAL / UNSUPPORTED / NOT RELIABLE**

Si une exigence nécessite une vraie persistance native, proposer sans
l'imposer :

-   Capacitor ;
-   Tauri ;
-   Flutter ;
-   autre wrapper approprié.

------------------------------------------------------------------------

# PHASE 10 --- CAPABILITY DETECTOR

Créer ou compléter un détecteur pour :

-   IndexedDB ;
-   Dexie ;
-   SQLite WASM ;
-   OPFS ;
-   Persistent Storage ;
-   File System Access ;
-   Web Crypto ;
-   Service Worker ;
-   Storage Estimate.

Le système choisit le meilleur mécanisme disponible.

Prévoir des fallbacks.

------------------------------------------------------------------------

# PHASE 11 --- PERSISTENT STORAGE

Étudier :

``` javascript
navigator.storage.persist()
```

L'utiliser lorsque pertinent.

Attention : cela réduit le risque d'éviction mais ne remplace pas un
recovery indépendant.

------------------------------------------------------------------------

# PHASE 12 --- EXPORT / IMPORT

Prévoir si absent :

-   Exporter mes données ;
-   Importer mes données ;
-   Créer une sauvegarde ;
-   Restaurer ;
-   Exporter configuration ;
-   Importer configuration.

L'import doit gérer correctement, selon les droits :

-   métier ;
-   OnKey ;
-   OnDB.

Toujours chiffrer les secrets.

------------------------------------------------------------------------

# PHASE 13 --- SUPABASE / CLOUD

Si Supabase existe :

**NE PAS RECRÉER LA BASE.**

Auditer :

-   tables ;
-   colonnes ;
-   relations ;
-   foreign keys ;
-   indexes ;
-   migrations ;
-   RLS ;
-   policies ;
-   triggers ;
-   functions ;
-   RPC ;
-   Storage ;
-   Auth ;
-   Edge Functions ;
-   Realtime ;
-   sync ;
-   contraintes.

Distinguer :

``` text
Supabase Auth
≠ Supabase Database
≠ Supabase Storage
≠ Bria OnDB
≠ Hub Central
```

L'existence de Supabase Auth ne prouve pas que les données métier sont
sauvegardées dans le Cloud.

------------------------------------------------------------------------

# PHASE 14 --- SI CLOUD MÉTIER ABSENT

Si une version Cloud est prévue mais que le backend métier manque :

ne pas implémenter immédiatement.

Après validation :

1.  concevoir schéma ;
2.  tables ;
3.  relations ;
4.  RLS ;
5.  policies ;
6.  indexes ;
7.  contraintes ;
8.  synchronisation ;
9.  conflits ;
10. SQL.

Créer :

``` text
READY_TO_RUN_SUPABASE_MIGRATION.sql
```

SQL :

-   versionné ;
-   non destructif ;
-   idempotent autant que possible ;
-   sans DROP/TRUNCATE dangereux ;
-   accompagné de rollback lorsque possible.

------------------------------------------------------------------------

# PHASE 15 --- SYNCHRONISATION

Si Local + Cloud :

``` text
LOCAL CHANGE
→ TRANSACTION
→ SYNC QUEUE
→ CLOUD
→ ACK
→ MARK SYNCED
```

Et :

``` text
CLOUD CHANGE
→ SYNC
→ LOCAL
```

Auditer :

-   UUID ;
-   version ;
-   timestamps ;
-   dirty state ;
-   queue ;
-   retry ;
-   idempotence ;
-   conflits ;
-   suppressions ;
-   restauration.

------------------------------------------------------------------------

# PHASE 16 --- OFFLINE

En mode offline autorisé, une coupure réseau ne doit pas empêcher :

-   ouverture ;
-   consultation ;
-   modification ;
-   utilisation métier ;
-   stockage local ;
-   recovery.

Seules les fonctions réellement distantes peuvent nécessiter Internet.

------------------------------------------------------------------------

# PHASE 17 --- SÉCURITÉ

Scanner tout le projet pour :

-   API keys ;
-   passwords ;
-   bearer tokens ;
-   JWT ;
-   service-role ;
-   private keys ;
-   DB passwords ;
-   credentials ;
-   secrets hardcodés ;
-   secrets dans logs ;
-   secrets dans tests ;
-   secrets dans Git ;
-   secrets dans exports ;
-   secrets dans recovery.

Ne jamais mettre en clair dans les logs :

``` text
API KEY
PASSWORD
PRIVATE KEY
SERVICE ROLE
DB PASSWORD
TOKEN
```

Masquer les secrets dans les diagnostics.

------------------------------------------------------------------------

# PHASE 18 --- HUB CENTRAL

Ne pas modifier le Hub Central dans cette mission sauf nécessité
explicitement validée.

Ne pas mettre dans le recovery :

-   private keys Hub ;
-   secrets serveur Hub ;
-   service-role ;
-   secrets de signature ;
-   secrets Edge Functions.

Les licences et entitlements doivent être resynchronisables selon le
contrat existant.

------------------------------------------------------------------------

# PHASE 19 --- DEVICE ID

Auditer tout device ID existant.

Ne jamais prétendre qu'un navigateur fournit un identifiant matériel
permanent.

Vérifier :

-   génération ;
-   persistance ;
-   reset ;
-   duplication ;
-   sécurité ;
-   compatibilité avec la licence existante.

------------------------------------------------------------------------

# PHASE 20 --- RESTAURATION SÉCURISÉE

Avant restauration :

``` text
Fichier trouvé
→ format valide ?
→ application compatible ?
→ version compatible ?
→ intégrité valide ?
→ déchiffrement possible ?
→ données cohérentes ?
→ version locale plus récente ?
→ RESTAURER
```

Si les données locales sont plus récentes :

**ne pas écraser silencieusement.**

------------------------------------------------------------------------

# PHASE 21 --- TESTS

## Tests locaux

-   création ;
-   modification ;
-   suppression ;
-   fermeture ;
-   réouverture ;
-   offline ;
-   recovery ;
-   restauration ;
-   corruption ;
-   current/previous.

## Bria OnKey

-   ajout ;
-   modification ;
-   suppression ;
-   chiffrement ;
-   recovery ;
-   restauration ;
-   utilisation ;
-   absence dans logs.

## Bria OnDB

-   configuration ;
-   validation ;
-   connexion ;
-   recovery ;
-   restauration ;
-   modification ;
-   invalidation ;
-   sécurité.

## Cloud

-   lecture ;
-   écriture ;
-   RLS ;
-   synchronisation ;
-   reconnexion ;
-   retry ;
-   conflits.

------------------------------------------------------------------------

# PHASE 22 --- TEST DE CORRUPTION

Simuler :

-   fichier tronqué ;
-   checksum incorrect ;
-   mauvaise version ;
-   mauvaise application ;
-   mauvais mot de passe ;
-   mauvaise clé.

Le système doit refuser proprement la restauration sans détruire
l'existant.

------------------------------------------------------------------------

# PHASE 23 --- TEST DOUBLE RECOVERY

Tester :

``` text
CURRENT valide
PREVIOUS valide
TMP incomplet
```

Vérifier que CURRENT et PREVIOUS restent utilisables.

------------------------------------------------------------------------

# PHASE 24 --- MATRICE DE RÉGRESSION

Créer :

  Fonction            Avant   Après   Résultat
  ------------------- ------- ------- ----------
  Login                               
  Création compte                     
  Fonction métier 1                   
  Fonction métier 2                   
  Offline                             
  Local DB                            
  Cloud                               
  Bria OnKey                          
  Bria OnDB                           
  Recovery                            
  Export                              
  Import                              
  PWA                                 

Aucune fonction importante ne doit disparaître.

------------------------------------------------------------------------

# PHASE 25 --- PERFORMANCE

Le recovery doit être non bloquant autant que possible.

Étudier :

-   debounce ;
-   batch ;
-   dirty state ;
-   snapshots ;
-   incremental backup ;
-   compression ;
-   queue ;
-   écriture asynchrone.

Ne pas écrire un énorme fichier après chaque frappe.

------------------------------------------------------------------------

# PHASE 26 --- UX

Lors de la sélection d'un dossier :

> « Choisissez un dossier dans lequel l'application conservera une copie
> de récupération de vos données et de vos configurations protégées. »

L'utilisateur doit comprendre :

-   ce qui est sauvegardé ;
-   ce qui est chiffré ;
-   où se trouve la récupération ;
-   ce qui se passe après reset ;
-   quelles limites existent selon son appareil.

Compléter cette explication avec la phase 6 bis :

-   le choix du dossier parent se fait une seule fois ;
-   l'application crée le dossier à son nom ;
-   aucun mot de passe de récupération n'est demandé ;
-   l'enregistrement est automatique, en local et sur Drive quand la
    connexion est là ;
-   après effacement du navigateur, Drive revient sans bouton si la
    session Google est encore ouverte ;
-   le dossier du téléphone ou de l'ordinateur ne se rouvre pas seul :
    le même choix d'emplacement recharge la copie déjà présente, sans
    bouton Restaurer.

------------------------------------------------------------------------

# PHASE 27 --- ARCHIVAGE

Ne pas confondre :

``` text
Recovery opérationnel
≠
Backup
≠
Archive historique
≠
Export utilisateur
```

Le présent travail concerne principalement :

**continuité + protection + récupération + persistance.**

L'archivage historique fera l'objet d'un traitement séparé.

------------------------------------------------------------------------

# PHASE 28 --- AUDIT ROOT CAUSE

Pour chaque problème :

  ----------------------------------------------------------------------------
  ID         Problème   Cause      Fichiers   Impact     Priorité   Solution
                        racine                                      
  ---------- ---------- ---------- ---------- ---------- ---------- ----------

  ----------------------------------------------------------------------------

Identifier notamment :

-   stockage uniquement navigateur ;
-   absence recovery ;
-   OnKey non persistant ;
-   OnDB non persistant ;
-   secrets en clair ;
-   absence de chiffrement ;
-   permissions fragiles ;
-   absence fallback ;
-   Supabase incomplet ;
-   RLS absent/mauvais ;
-   sync fragile ;
-   reset destructif ;
-   conflits ;
-   données dupliquées.

------------------------------------------------------------------------

# PHASE 29 --- MATRICE DE PRÉSERVATION

Avant modification :

  Élément   Emplacement   Fonctionnement actuel   Action   Risque
  --------- ------------- ----------------------- -------- --------

Inclure :

-   UI ;
-   routes ;
-   business logic ;
-   DB ;
-   auth ;
-   PWA ;
-   offline ;
-   APIs ;
-   OnKey ;
-   OnDB.

------------------------------------------------------------------------

# PHASE 30 --- VALIDATION AVANT MODIFICATION

Produire obligatoirement :

1.  Architecture actuelle ;
2.  Architecture cible ;
3.  Cartographie données ;
4.  Cartographie secrets ;
5.  Audit OnKey ;
6.  Audit OnDB ;
7.  Audit Supabase ;
8.  Audit sécurité ;
9.  Audit multi-plateforme ;
10. Root causes ;
11. Fichiers à modifier ;
12. Fichiers à préserver ;
13. Matrice avant/après ;
14. Plan de migration ;
15. SQL éventuel ;
16. Tests ;
17. Risques ;
18. Rollback ;
19. Dry-run.

Puis :

``` text
AUDIT COMPLETED.
ROOT CAUSES IDENTIFIED.
IMPLEMENTATION PLAN READY.
NO FILES MODIFIED.
WAITING FOR HUMAN VALIDATION.
```

**STOP.**

------------------------------------------------------------------------

# PHASE 31 --- APRÈS VALIDATION HUMAINE

Seulement après validation :

``` text
IMPLEMENT
→ MIGRATE
→ TEST
→ SECURITY AUDIT
→ REGRESSION TEST
→ PLATFORM TEST
→ FINAL VALIDATION
→ FINAL REPORT
```

Si un nouveau problème critique apparaît :

**STOP et demander une nouvelle validation.**

------------------------------------------------------------------------

# PHASE 32 --- LIVRABLES

Créer uniquement ce qui est nécessaire :

``` text
AUDIT/
  architecture-current.md
  data-map.md
  security-audit.md
  bria-onkey-audit.md
  bria-ondb-audit.md
  supabase-audit.md
  platform-compatibility.md

RECOVERY/
  recovery-format.md
  recovery-service.*
  encryption-service.*
  capability-detector.*
  export-import-service.*

SUPABASE/
  READY_TO_RUN_SUPABASE_MIGRATION.sql

TESTS/
  local-recovery-tests.*
  onkey-recovery-tests.*
  ondb-recovery-tests.*
  cloud-sync-tests.*
  security-tests.*
  regression-tests.*

DOCS/
  FINAL_IMPLEMENTATION_REPORT.md
  RECOVERY_GUIDE.md
  DEPLOYMENT_CHECKLIST.md
```

Adapter les extensions à la stack réelle.

------------------------------------------------------------------------

# PHASE 33 --- RAPPORT FINAL

Le rapport doit contenir :

1.  Executive Summary ;
2.  Architecture avant ;
3.  Architecture après ;
4.  Stockage local ;
5.  Recovery ;
6.  Bria OnKey ;
7.  Bria OnDB ;
8.  Secrets ;
9.  Supabase ;
10. Synchronisation ;
11. Sécurité ;
12. Multi-plateforme ;
13. Fichiers modifiés ;
14. Fichiers créés ;
15. Fichiers non modifiés ;
16. SQL ;
17. Tests ;
18. Régression ;
19. Limites ;
20. Risques résiduels ;
21. Procédure de récupération ;
22. Procédure après reset navigateur ;
23. Rollback ;
24. Checklist déploiement.

------------------------------------------------------------------------

# PHASE 34 --- CRITÈRES DE SUCCÈS

Le projet est réussi uniquement si :

-   les données métier sont préservées ;
-   offline fonctionne ;
-   Cloud fonctionne lorsqu'il existe ;
-   recovery fonctionne lorsque techniquement supporté ;
-   les limites plateforme sont documentées ;
-   Bria OnKey est persistant et récupérable ;
-   Bria OnKey est chiffré dans le recovery ;
-   Bria OnDB est persistant et récupérable ;
-   les credentials critiques sont protégés ;
-   aucun secret n'est exposé dans les logs ;
-   Supabase est audité ;
-   RLS est vérifié ;
-   les migrations sont non destructives ;
-   le reset navigateur possède un scénario de récupération ;
-   une version plus récente n'est jamais écrasée silencieusement ;
-   Hub Central reste séparé du stockage métier ;
-   les fonctionnalités existantes restent opérationnelles ;
-   les tests passent.

------------------------------------------------------------------------

# PRIORITÉS ABSOLUES

``` text
1. INTÉGRITÉ DES DONNÉES
2. PROTECTION DES SECRETS
3. RÉCUPÉRATION
4. CONTINUITÉ OFFLINE
5. FIABILITÉ CLOUD
6. COMPATIBILITÉ AVEC L'EXISTANT
7. SÉCURITÉ
8. PERFORMANCE
9. UX
10. ÉLÉGANCE ARCHITECTURALE
```

# RÈGLE FINALE

Toujours raisonner :

> « Je vais comprendre le système existant, conserver ce qui fonctionne,
> sécuriser ce qui est fragile, ajouter les protections manquantes et ne
> migrer que ce qui doit réellement l'être. »

Architecture cible conceptuelle :

``` text
APPLICATION
   │
   ├── BUSINESS
   │
   └── INTEGRATION
        ├── AUTH
        ├── LICENSE
        └── ENTITLEMENT
             │
      ┌──────┼───────────┐
      ↓      ↓           ↓
   LOCAL   BRIA        BRIA
   DATA    ONKEY       ONDB
      │      │           │
      └──────┴───────────┘
             ↓
       ENCRYPTION
             ↓
         RECOVERY
        /              LOCAL        CLOUD
    FOLDER      SUPABASE
        \         /
          SYNC
```

Cette architecture est une cible d'audit, pas une autorisation de
reconstruction.

**AUCUNE MODIFICATION AVANT LA VALIDATION HUMAINE.**
