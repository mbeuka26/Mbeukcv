# Compatibilité plateforme

Constat sur le code actuel. Aucune promesse au-delà de ce que les navigateurs permettent.

## Mécanismes

| Mécanisme | Pro v2 | SaaS | Windows Chrome/Edge | Android Chrome | iOS/iPadOS Safari |
| --- | --- | --- | --- | --- | --- |
| IndexedDB + Dexie | Utilisé | Absent | SUPPORTED | SUPPORTED | PARTIAL (éviction plus agressive, surtout hors écran d’accueil) |
| localStorage | Secrets et config | Device id, gate | SUPPORTED | SUPPORTED | PARTIAL (ITP, navigation privée, effacement) |
| OPFS | Absent | Absent | SUPPORTED si on l’ajoute | PARTIAL | PARTIAL |
| SQLite WASM | Absent | Absent | Non utilisé | Non utilisé | Non utilisé |
| Persistent Storage `navigator.storage.persist()` | Absent | Absent | SUPPORTED, souvent accordé en PWA installée | PARTIAL | NOT RELIABLE |
| File System Access (dossier choisi) | Absent | Absent | SUPPORTED (Chrome, Edge) | PARTIAL / souvent UNSUPPORTED | UNSUPPORTED pour l’écriture dossier arbitraire |
| Web Crypto AES-GCM | Non utilisé côté Pro | Serveur Node `crypto` seulement | SUPPORTED | SUPPORTED | SUPPORTED |
| Service Worker | Workbox, cache assets | `mbeuk-sw.js` via `pwa.js` | SUPPORTED en HTTPS | SUPPORTED | PARTIAL (installation et durée de vie limitées) |
| Storage estimate | Absent | Absent | SUPPORTED | SUPPORTED | PARTIAL |

Build standalone Pro (`vite.config.standalone.ts`, ouverture `file://`) : pas de service worker, localStorage souvent indisponible, repli mémoire non persistant (`safeStorage`). Le recovery dossier n’est pas possible dans ce mode.

## Ce qu’une PWA ne peut pas garantir

- Écrire en silence dans Documents.
- Garder pour toujours une permission de dossier.
- Fournir un identifiant matériel stable.
- Le même système de fichiers sur Windows, Android et iOS.
- Contourner l’effacement des données du site.

## Conséquence pour le recovery

| Plateforme | Recovery réaliste |
| --- | --- |
| Windows Chrome / Edge, app servie en HTTPS | Dossier choisi par l’utilisateur + IndexedDB + persist() si accordé |
| Android Chrome | IndexedDB + export manuel. Dossier : seulement si `showDirectoryPicker` répond |
| iOS Safari / PWA | Export / import de fichier (partage Fichiers). Pas de dossier surveillé en continu |
| Desktop natif futur | Tauri ou Capacitor possible, non imposé |

`navigator.storage.persist()` réduit l’éviction. Il ne remplace pas un fichier hors du navigateur.
