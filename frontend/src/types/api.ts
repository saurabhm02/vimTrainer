export interface ApiResponse<T> {
  data: T;
  meta: Record<string, unknown>;
  error: null;
}

export interface ApiError {
  data: null;
  meta: Record<string, unknown>;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedMeta {
  total: number;
  limit: number;
  nextCursor: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
  error: null;
}

export interface AuthTokenResponse {
  accessToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateSessionRequest {
  mode: import('./models').PracticeMode;
  length: 10 | 20 | 30;
  keymapIds?: string[];
}

export interface SessionChallenge {
  keymapId: string;
  keySequence: string;
  mode: import('./models').VimMode;
  description: string;
  category: string;
}

export interface AttemptRequest {
  keymapId: string;
  typedSequence: string;
  responseMs: number;
}

export interface AttemptResult {
  isCorrect: boolean;
  correctSequence: string;
  srsUpdate: {
    easeFactor: number;
    intervalDays: number;
    nextReviewAt: string;
  };
}
