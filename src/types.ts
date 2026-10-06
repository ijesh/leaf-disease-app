export type Suggestion = {
  id: string;
  name: string;
  probability: number;
  description?: string;
  treatment?: { biological?: string[]; chemical?: string[]; prevention?: string[] };
};

export type Diagnosis = {
  isPlant: boolean;
  isHealthy: boolean;
  suggestions: Suggestion[];
};

export type Usage = {
  /** Credits left this month, or null if the key has no monthly limit. */
  remainingMonth: number | null;
  /** Monthly credit limit, or null if unlimited. */
  limitMonth: number | null;
  usedMonth: number;
  /** Credits left in total (one-time allowance), if the key has a total limit. */
  remainingTotal: number | null;
};

export type RootStackParamList = {
  Home: undefined;
  Result: { diagnosis: Diagnosis; imageUri: string };
};
