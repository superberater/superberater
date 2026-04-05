/**
 * Shared types and interfaces for the superberater wizard.
 */
import type { Locale } from "@/lib/i18n";
import type { Personality, ModelOption, AppConfig } from "@/lib/api";
import type { WizardState, SelectedAgent } from "@/lib/types";

export interface SuggestionData {
  suggested_agents: { name: string; reason: string; suggested_model?: string; model_reason?: string }[];
  suggested_style: string; style_reason: string;
  suggested_rounds: number; rounds_reason: string;
  suggested_decision_mode: string; decision_reason: string;
  suggested_moderator_model?: string; moderator_model_reason?: string;
}

export interface WizardProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  locale: Locale;
  appConfig: AppConfig;
  freeMode: boolean;
  models: ModelOption[];
}

export interface StepTopicProps extends WizardProps {
  sessionApiKey: string;
  setSessionApiKey: (v: string) => void;
  keyValidated: boolean;
  setKeyValidated: (v: boolean) => void;
  keyValidating: boolean;
  keyError: string;
  setKeyError: (v: string) => void;
  setFreeMode: (v: boolean) => void;
  handleValidateKey: () => void;
  uploading: boolean;
  uploadedFile: string | null;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileRef: React.RefObject<HTMLInputElement>;
  error: string;
}

export interface StepCrewProps extends WizardProps {
  personalities: Personality[];
  toggleAgent: (p: Personality) => void;
  removeAgent: (id: string) => void;
  suggestion: SuggestionData | null;
  showSuggestion: boolean;
  setShowSuggestion: (v: boolean) => void;
  suggesting: boolean;
  showCustomModal: boolean;
  setShowCustomModal: (v: boolean) => void;
  handleAddCustomAgent: (agent: SelectedAgent, saveToDb: boolean) => void;
}

export interface StepParamsProps extends WizardProps {
  suggestion: SuggestionData | null;
  showModPrompt: boolean;
  setShowModPrompt: (v: boolean) => void;
  moderatorModels: { value: string; label: string; cost: string; recommended?: boolean; reason?: string }[];
}

export interface StepSummaryProps extends WizardProps {
  sessionApiKey: string;
  freeMode: boolean;
  uploadedFile: string | null;
  moderatorModels: { value: string; label: string; cost: string; recommended?: boolean; reason?: string }[];
  error: string;
  loading: boolean;
  handleSubmit: () => void;
}
