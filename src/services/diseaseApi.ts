import type { Diagnosis, Suggestion, Usage } from '../types';

export interface DiseaseService {
  analyze(base64Jpeg: string): Promise<Diagnosis>;
  getUsage(): Promise<Usage>;
}

export class DiseaseApiError extends Error {}

const ENDPOINT = 'https://plant.id/api/v3/health_assessment?details=description,treatment';
const USAGE_ENDPOINT = 'https://plant.id/api/v3/usage_info';
const TIMEOUT_MS = 30000;

function toList(v: unknown): string[] | undefined {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') return [v];
  return undefined;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// Accepts the nested v3 shape ({ remaining: { month } }) and the flat v2 shape ({ remaining_month }).
function pick(data: any, group: 'remaining' | 'credit_limits' | 'used', period: 'month' | 'total'): number | null {
  const flatGroup = group === 'credit_limits' ? 'limit' : group;
  return num(data?.[group]?.[period]) ?? num(data?.[`${flatGroup}_${period}`]);
}

function toSuggestion(raw: any): Suggestion {
  const t = raw?.details?.treatment;
  return {
    id: String(raw?.id ?? raw?.name),
    name: String(raw?.name ?? 'Unknown'),
    probability: Number(raw?.probability ?? 0),
    description: typeof raw?.details?.description === 'string' ? raw.details.description : undefined,
    treatment: t && {
      biological: toList(t.biological),
      chemical: toList(t.chemical),
      prevention: toList(t.prevention),
    },
  };
}

export const plantIdService: DiseaseService = {
  async analyze(base64Jpeg) {
    const apiKey = process.env.EXPO_PUBLIC_PLANTID_API_KEY;
    if (!apiKey) {
      throw new DiseaseApiError('Missing API key. Set EXPO_PUBLIC_PLANTID_API_KEY in .env and restart.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey },
        body: JSON.stringify({ images: [`data:image/jpeg;base64,${base64Jpeg}`] }),
        signal: controller.signal,
      });
    } catch (e) {
      const aborted = (e as Error)?.name === 'AbortError';
      throw new DiseaseApiError(aborted ? 'The request timed out. Try again.' : 'Network error. Check your connection.');
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 401) throw new DiseaseApiError('Invalid API key.');
    if (res.status === 429) throw new DiseaseApiError('Free quota used up. Try again later or use another key.');
    if (!res.ok) throw new DiseaseApiError(`Service error (${res.status}).`);

    const data = await res.json();
    const result = data?.result;
    const isPlant = Boolean(result?.is_plant?.binary ?? true);
    const isHealthy = Boolean(result?.is_healthy?.binary);
    const suggestions: Suggestion[] = (result?.disease?.suggestions ?? []).slice(0, 3).map(toSuggestion);
    return { isPlant, isHealthy, suggestions };
  },

  async getUsage() {
    const apiKey = process.env.EXPO_PUBLIC_PLANTID_API_KEY;
    if (!apiKey) throw new DiseaseApiError('Missing API key.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(USAGE_ENDPOINT, { headers: { 'Api-Key': apiKey }, signal: controller.signal });
      if (res.status === 401) throw new DiseaseApiError('Invalid API key.');
      if (!res.ok) throw new DiseaseApiError(`Service error (${res.status}).`);
      const data = await res.json();
      return {
        remainingMonth: pick(data, 'remaining', 'month'),
        limitMonth: pick(data, 'credit_limits', 'month'),
        usedMonth: pick(data, 'used', 'month') ?? 0,
        remainingTotal: pick(data, 'remaining', 'total'),
      };
    } catch (e) {
      if (e instanceof DiseaseApiError) throw e;
      throw new DiseaseApiError('Could not load credits.');
    } finally {
      clearTimeout(timer);
    }
  },
};
