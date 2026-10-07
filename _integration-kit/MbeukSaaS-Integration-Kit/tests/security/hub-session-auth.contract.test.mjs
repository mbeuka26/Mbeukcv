// Test de contrat (non-régression) — P0 v1.8.0
//
// Contexte : jusqu'en v1.7.0, `requireHubAuth` traitait l'échec de
// `refreshSession` comme "non bloquant" et continuait malgré tout, dès lors
// que les en-têtes X-Hub-Session-Token / X-Hub-Refresh-Token / X-Hub-User-Id
// étaient simplement PRÉSENTS (non vides) — sans jamais être vérifiés comme
// VALIDES. Résultat : n'importe qui connaissant/devinant le hub_user_id
// d'un compte pouvait consulter/modifier son entitlement (hub-me,
// hub-license-status, hub-sync-license, hub-checkout) avec des jetons
// entièrement inventés. Ce test lit le fichier source et garantit que le
// correctif (fail-closed) n'est pas régressé silencieusement.
//
// Ce n'est pas un test d'exécution (le fichier est un module Deno/TS qui
// importe des URLs esm.sh et ne peut pas tourner sous node:test), mais un
// garde-fou structurel cohérent avec les autres tests "contract" du kit
// (health-check.test.mjs, manifest-schema.test.mjs...).

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SOURCE = readFileSync(
  new URL(
    "../../templates/supabase/edge-functions/_shared/hub-session-auth.ts",
    import.meta.url,
  ),
  "utf8",
);

test("un refreshSession invalide DOIT lever une HubAuthError (fail-closed)", () => {
  // Le correctif doit relancer une erreur bloquante dans le catch.
  const catchBlockMatch = SOURCE.match(
    /await getHubClient\(\)\.auth\.refreshSession\([\s\S]*?\}\s*catch[\s\S]*?\n\s*\}/,
  );
  assert.ok(catchBlockMatch, "bloc try/catch de refreshSession introuvable");
  const catchBlock = catchBlockMatch[0];
  assert.match(
    catchBlock,
    /throw new HubAuthError/,
    "refreshSession invalide doit lever HubAuthError (401) — ne jamais continuer silencieusement",
  );
});

test("l'ancien log 'refreshSession non bloquant' (v1.7.0) ne doit plus être présent", () => {
  assert.doesNotMatch(
    SOURCE,
    /refreshSession non bloquant/,
    "le log 'refreshSession non bloquant' de la v1.7.0 signalait un échec ignoré : " +
      "un refresh Hub invalide doit désormais systématiquement bloquer l'accès (401).",
  );
});

test("le risque résiduel (pas de binding token->identité côté SDK) reste documenté", () => {
  assert.match(
    SOURCE,
    /RISQUE RÉSIDUEL/,
    "le risque résiduel doit rester documenté tant que le Hub n'expose pas " +
      "un endpoint auth.getUser(session_token) -> { user_id, email }",
  );
});
