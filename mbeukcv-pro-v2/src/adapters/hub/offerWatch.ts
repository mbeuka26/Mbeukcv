import { listMyMatches, refreshMatchesViaBackend } from '@/services/backendApi';
import { ensureBackendSession } from '@/services/hubIdentity';
import { getSupabaseClient } from '@/services/supabase';
import type { OfferWatch } from '@/ports';

export const hubOfferWatch: OfferWatch = {
  available: true,
  async match(request) {
    const session = await ensureBackendSession();
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Backend non configuré. Renseignez votre URL et clé Supabase dans Paramètres.');
    }

    const { error } = await supabase.from('profils_candidats').upsert(
      {
        licence_code: session.licenceCode,
        mots_cles: request.motsCles,
        cv_brut_texte: request.cvBrutTexte,
        mis_a_jour_le: new Date().toISOString(),
      },
      { onConflict: 'licence_code' }
    );
    if (error) {
      throw new Error(`Profil non enregistré : ${error.message}`);
    }

    return refreshMatchesViaBackend(request.scoreMinimum);
  },
  list: listMyMatches,
};
