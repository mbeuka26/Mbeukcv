import { hubApplicationMailer } from '@/adapters/hub/applicationMailer';
import { hubAtsAnalyzer } from '@/adapters/hub/atsAnalyzer';
import { hubCvHistoryStore } from '@/adapters/hub/cvHistoryStore';
import { hubDocumentGenerator } from '@/adapters/hub/documentGenerator';
import { hubOfferWatch } from '@/adapters/hub/offerWatch';
import { localApplicationMailer } from '@/adapters/local/applicationMailer';
import { localAtsAnalyzer } from '@/adapters/local/atsAnalyzer';
import { localCvHistoryStore } from '@/adapters/local/cvHistoryStore';
import { localDocumentGenerator } from '@/adapters/local/documentGenerator';
import { localOfferWatch } from '@/adapters/local/offerWatch';
import type {
  AdapterMode,
  ApplicationMailer,
  AtsAnalyzer,
  CvHistoryStore,
  DocumentGenerator,
  OfferWatch,
} from '@/ports';
import { hasSupabaseBackend } from '@/services/supabase';

export function documentGenerator(mode: AdapterMode): DocumentGenerator {
  return mode === 'hub' ? hubDocumentGenerator : localDocumentGenerator;
}

export function atsAnalyzer(mode: AdapterMode): AtsAnalyzer {
  return mode === 'hub' ? hubAtsAnalyzer : localAtsAnalyzer;
}

export function applicationMailer(mode: AdapterMode): ApplicationMailer {
  return mode === 'hub' ? hubApplicationMailer : localApplicationMailer;
}

export function offerWatch(mode: AdapterMode): OfferWatch {
  return mode === 'hub' ? hubOfferWatch : localOfferWatch;
}

export function cvHistoryStore(mode: AdapterMode): CvHistoryStore {
  return mode === 'hub' ? hubCvHistoryStore : localCvHistoryStore;
}

/** Le hub est choisi quand Paramètres contient une configuration Supabase. */
export function modeFromSettings(): AdapterMode {
  return hasSupabaseBackend() ? 'hub' : 'local';
}
