# Intégration CVPro ↔ Mbeuk Job Exchange

## Phase 0 — Matrice d’audit (état au 2026-10-08)

| Fonctionnalité | EXISTE | PARTIELLE | À AMÉLIORER | À CRÉER |
|----------------|--------|-----------|-------------|---------|
| Candidate / Profile | ✓ `user_profiles`, Hub `profiles` | | Lier discovery au profil métier | `professional_discovery_enabled` |
| CV | ✓ `cv_data` JSON, classique / IA / ATS | | | |
| Documents | ✓ dossier HTML, PJ candidature | | Snapshot versionné | `application_snapshots` |
| Expériences / compétences | ✓ dans `CvData` | | | |
| Métiers (terms) | ✓ `profileTerms` | | Taxonomie MbeukRH | |
| Moteur matching | ✓ `scoreOffer`, `offerMatchesProfile` | | Seuils Job Exchange | Pipeline post-ingestion |
| Scoring | ✓ 0–100 % offres | | Justification RH | export discovery |
| Scraping | ✓ `LISTING_SOURCES`, cron | | Normaliser source `SCRAPING` | |
| RapidAPI / JSearch | ✓ `jsearch`, rotation | | Alias source `RAPIDAPI` | |
| Base d’offres | ✓ `job_offers` | | `external_ref`, dédup | `INTERNAL_MBEUKRH` |
| Notifications | ✓ alerte métier `mbeuk_alert` (accueil) | | Push opportunité ciblée | `job_exchange_notifications` |
| Préférences | ✓ alerte on/off | | Opt-in discovery | API discovery |
| Authentification | ✓ Supabase + Hub Gate | | | |
| API backend | ✓ routes `/api/*` | | Webhook Exchange | `/api/job-exchange/*` |
| Supabase / RLS | ✓ policies own-data | | Tables Exchange | migration 005 |
| Historique candidatures | ✓ `applications` | | source, invitation, snapshot | colonnes + UI |
| Favoris | | | | Non implémenté (hors scope initial) |
| Confidentialité | | ✓ pas d’export auto PII | Discovery sans email/tél | projection RH |

## Sources d’offres (cible)

| Code | Description | Implémentation actuelle |
|------|-------------|-------------------------|
| `INTERNAL_MBEUKRH` | Job Exchange direct | **Nouveau** — webhook |
| `SCRAPING` | Sites publics | ids sources listing |
| `RAPIDAPI` | JSearch | `source = jsearch` (alias affiché) |
| `OTHER` | Technique / système | `system` |

Les valeurs legacy en base (`jsearch`, ids scraping) **restent** ; l’UI et les rapports utilisent `normalizeOfferSource()`.

## Flux cible

```text
Job Exchange (serveur)
  → POST /api/job-exchange/webhook (secret serveur)
  → ingest + dedupe
  → scoreOffer / offerMatchesProfile (existant)
  → candidats discovery ON + seuil score
  → invitation + notification (anti-spam)
```

## Secrets (jamais côté client)

- `MBEUK_JOB_EXCHANGE_WEBHOOK_SECRET` — HMAC webhook
- `MBEUK_JOB_EXCHANGE_API_KEY` — appels sortants optionnels vers Exchange

## Déduplication

Clés : `external_ref` + `source`, fallback `url`, fingerprint titre/entreprise/lieu/hash description.

## Talent discovery (RH)

Export via `buildDiscoveryProfile()` : id, métier, compétences, expérience, résumé, localisation générale, score — **sans** email, téléphone, CNI, diplômes privés, CV fichier.

## États invitation

`DISCOVERED` → `INVITED` → `VIEWED` → `INTERESTED` / `APPLIED` / `DECLINED` / `EXPIRED`

## Candidature MbeukRH

Confirmation explicite → snapshot CV + consentement → `applications` + `application_snapshots`.

## Tests

`npm test` (inclut `scripts/test-job-exchange.mjs`).

Scénarios couverts en code : webhook HMAC, ingest + matching, notifications (plafond/jour), discovery ON/OFF, invitation RH (clé service), candidature + snapshot, dédup empreinte, fermeture offre.

## Matrice — livré (2026-10-08)

| Élément | Statut |
|---------|--------|
| Migration `005_job_exchange.sql` | Livré |
| Source `INTERNAL_MBEUKRH` + dédup | Livré |
| Pipeline matching existant post-webhook | Livré |
| `professional_discovery_enabled` + API | Livré |
| Talent discovery RH (`GET …/service/talent`) | Livré |
| Invitation RH (`POST …/service/invite`) | Livré |
| UI Opportunités + consentement POSTULER | Livré |
| `application_snapshots` | Livré |
| Mes candidatures (source, invitation) | Livré |
| Secrets serveur uniquement | Livré |

## API (résumé)

| Route | Rôle |
|-------|------|
| `POST /api/job-exchange/webhook` | Ingest / close (HMAC `x-mbeuk-signature`) |
| `GET/PATCH /api/job-exchange/discovery` | Opt-in candidat |
| `GET /api/job-exchange/invitations` | Liste opportunités |
| `PATCH /api/job-exchange/invitations/[id]` | VIEWED / INTERESTED / DECLINED |
| `POST /api/job-exchange/apply` | Candidature + snapshot |
| `GET/PATCH /api/job-exchange/notifications` | Notifications opportunité |
| `GET /api/job-exchange/service/talent?externalRef=` | Profils RH (Bearer API key) |
| `POST /api/job-exchange/service/invite` | Invitation entreprise |
| `GET /api/job-exchange/service/application?applicationId=` | Snapshot candidature RH |
