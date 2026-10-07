import type { AtsAnalysisResult } from '@contracts/ats';
import type { CvHistoryEntry, GeneratedDocuments, GenerateDocsPayload, SendApplicationResult, UserMatch } from '@/types';

export type AdapterMode = 'local' | 'hub';

export type DocumentRequest = Omit<GenerateDocsPayload, 'customClaudeKey'>;

export interface DocumentGenerator {
  generate(payload: DocumentRequest): Promise<GeneratedDocuments>;
}

export interface AtsAnalyzer {
  analyze(cvTexte: string, offreTexte: string): Promise<AtsAnalysisResult>;
}

export interface MailDraft {
  destinataire: string;
  objet: string;
  message?: string;
  pieces?: {
    filename: string;
    contentBase64: string;
    mimeType: 'application/pdf';
  }[];
}

export interface ApplicationMailer {
  kind: 'mailto' | 'hub';
  send(draft: MailDraft): Promise<SendApplicationResult | void>;
}

export interface MatchRequest {
  motsCles: string[];
  cvBrutTexte: string;
  scoreMinimum: number;
}

export interface MatchRunResult {
  nbOffresAnalysees: number;
  nbMatchs: number;
  cached?: boolean;
  info?: string;
}

export interface OfferWatch {
  available: boolean;
  match(request: MatchRequest): Promise<MatchRunResult>;
  list(): Promise<UserMatch[]>;
}

export interface CvHistoryInput {
  nom: string;
  cvBrutTexte: string;
  langueCible: CvHistoryEntry['langueCible'];
  instructionsStyle?: string;
}

export interface CvHistoryStore {
  list(): Promise<CvHistoryEntry[]>;
  create(data: CvHistoryInput): Promise<string>;
  update(id: string, data: CvHistoryInput): Promise<void>;
  remove(id: string): Promise<void>;
}
