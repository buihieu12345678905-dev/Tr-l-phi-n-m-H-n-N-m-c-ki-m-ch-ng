export type InputMode = 'text' | 'image';

export type DocType =
  | 'auto'
  | 'tho-duong'
  | 'luc-bat'
  | 'sac-phong'
  | 'van-bia'
  | 'gia-pha'
  | 'khe-uoc';

export type ReadingDirection = 'auto' | 'vertical-rtl' | 'horizontal-ltr';

export type TokenScriptType = 'han' | 'nom' | 'variant' | 'punctuation';

export type VerificationStatus = 'verified' | 'review' | 'uncertain' | 'manual';

export interface HanNomToken {
  id: string;
  lineNumber: number;
  char: string;
  scriptType: TokenScriptType;
  reading: string;
  alternatives: string[];
  similarForms: string[];
  confidence: number;
  status: VerificationStatus;
  etymologyNote: string;
  verificationBasis: string;
  manualOverride?: {
    char?: string;
    reading: string;
    note?: string;
    updatedAt: string;
  };
}

export interface TranscriptionLine {
  lineNumber: number;
  hanNom: string;
  quocNgu: string;
  translation: string;
  notes: string;
}

export interface VerificationFlag {
  char: string;
  lineNumber: number;
  issue: string;
  suggestion: string;
}

export interface TranscriptionResult {
  title: string;
  detectedScript: string;
  readingDirection: string;
  sourceIdentification: string;
  overallConfidence: number;
  summaryNote: string;
  lines: TranscriptionLine[];
  tokens: HanNomToken[];
  verificationChecklist: VerificationFlag[];
}

export interface GroundingCitation {
  title: string;
  uri: string;
}

export interface GroundingCheckResult {
  summaryMarkdown: string;
  citations: GroundingCitation[];
  checkedAt: string;
}

export interface TokenDeepCheckResult {
  char: string;
  recommendedReading: string;
  scriptType: TokenScriptType;
  radicalAnalysis: string;
  alternativeCandidates: Array<{
    reading: string;
    meaning: string;
    likelihood: string;
  }>;
  similarConfusableChars: Array<{
    char: string;
    reading: string;
    difference: string;
  }>;
  contextualReasoning: string;
  updatedConfidence: number;
  updatedStatus: VerificationStatus;
}

export interface SavedSession {
  id: string;
  createdAt: string;
  mode: InputMode;
  docType: DocType;
  inputText?: string;
  imagePreview?: string;
  result: TranscriptionResult;
  grounding?: GroundingCheckResult;
}

export interface ArchivalSample {
  id: string;
  title: string;
  era: string;
  docType: DocType;
  readingDirection: ReadingDirection;
  scriptLabel: string;
  description: string;
  hanNomText: string;
  sealText: string;
  plateStyle: 'woodblock' | 'edict' | 'stele';
}
