import type { CvHistoryEntry } from '@/types';
import type { CvHistoryInput, CvHistoryStore } from '@/ports';
import { ensureBackendSession } from '@/services/hubIdentity';
import { getSupabaseClient } from '@/services/supabase';

interface HistoryRow {
  id: string;
  nom: string;
  cv_brut_texte: string;
  langue_cible: CvHistoryEntry['langueCible'];
  instructions_style: string;
  cree_le: string;
  mis_a_jour_le: string;
}

function toEntry(row: HistoryRow): CvHistoryEntry {
  return {
    id: row.id,
    nom: row.nom,
    cvBrutTexte: row.cv_brut_texte,
    langueCible: row.langue_cible,
    instructionsStyle: row.instructions_style,
    creeLe: row.cree_le,
    misAJourLe: row.mis_a_jour_le,
  };
}

async function client() {
  const session = await ensureBackendSession();
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Backend non configuré. Renseignez votre URL et clé Supabase dans Paramètres.');
  }
  return { session, supabase };
}

export const hubCvHistoryStore: CvHistoryStore = {
  async list() {
    const { session, supabase } = await client();
    const { data, error } = await supabase
      .from('historique_cv')
      .select('id, nom, cv_brut_texte, langue_cible, instructions_style, cree_le, mis_a_jour_le')
      .eq('licence_code', session.licenceCode)
      .order('mis_a_jour_le', { ascending: false });
    if (error) throw new Error(`Historique illisible : ${error.message}`);
    return ((data ?? []) as HistoryRow[]).map(toEntry);
  },

  async create(data: CvHistoryInput) {
    const { session, supabase } = await client();
    const id = crypto.randomUUID();
    const { error } = await supabase.from('historique_cv').insert({
      id,
      licence_code: session.licenceCode,
      nom: data.nom,
      cv_brut_texte: data.cvBrutTexte,
      langue_cible: data.langueCible,
      instructions_style: data.instructionsStyle ?? '',
    });
    if (error) throw new Error(`CV non enregistré sur le hub : ${error.message}`);
    return id;
  },

  async update(id, data) {
    const { session, supabase } = await client();
    const { error } = await supabase
      .from('historique_cv')
      .update({
        nom: data.nom,
        cv_brut_texte: data.cvBrutTexte,
        langue_cible: data.langueCible,
        instructions_style: data.instructionsStyle ?? '',
        mis_a_jour_le: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('licence_code', session.licenceCode);
    if (error) throw new Error(`CV non mis à jour sur le hub : ${error.message}`);
  },

  async remove(id) {
    const { session, supabase } = await client();
    const { error } = await supabase.from('historique_cv').delete().eq('id', id).eq('licence_code', session.licenceCode);
    if (error) throw new Error(`CV non supprimé sur le hub : ${error.message}`);
  },
};
