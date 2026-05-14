import { EventType } from '@swipepredict/shared';

const BASE_URL = 'https://v3.football.api-sports.io';
const LIGA_MX_ID = 262;
const WORLD_CUP_ID = 1;

interface ApiFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; name: string };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
}

interface ApiEvent {
  time: { elapsed: number };
  type: string;
  detail: string;
  team: { id: number; name: string };
}

const headers = {
  'x-rapidapi-key': process.env.FOOTBALL_API_KEY!,
  'x-rapidapi-host': process.env.FOOTBALL_API_HOST || 'v3.football.api-sports.io',
};

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`API-Football ${res.status}: ${await res.text()}`);
  const data = await res.json() as { response: T };
  return data.response;
}

export async function getUpcomingFixtures(leagueId = LIGA_MX_ID, next = 10): Promise<ApiFixture[]> {
  return get<ApiFixture[]>('/fixtures', {
    league: String(leagueId),
    next: String(next),
    season: '2026',
  });
}

export async function getLiveFixtures(leagueId = LIGA_MX_ID): Promise<ApiFixture[]> {
  return get<ApiFixture[]>('/fixtures', {
    league: String(leagueId),
    live: 'all',
  });
}

export async function getFixtureEvents(fixtureId: number): Promise<ApiEvent[]> {
  return get<ApiEvent[]>('/fixtures/events', { fixture: String(fixtureId) });
}

export async function getWorldCupFixtures(next = 20): Promise<ApiFixture[]> {
  return get<ApiFixture[]>('/fixtures', {
    league: String(WORLD_CUP_ID),
    next: String(next),
    season: '2026',
  });
}

// Determines event result from live match events
export function resolveEventResult(events: ApiEvent[], eventType: EventType, teamHomeId: number): boolean | null {
  switch (eventType) {
    case 'goal_first_half': {
      const goal = events.find(e => e.type === 'Goal' && e.time.elapsed <= 45);
      return goal !== undefined ? true : null;
    }
    case 'goal_both_teams': {
      const teamIds = new Set(events.filter(e => e.type === 'Goal').map(e => e.team.id));
      return teamIds.size >= 2;
    }
    case 'first_goal_home': {
      const first = events.find(e => e.type === 'Goal');
      if (!first) return null;
      return first.team.id === teamHomeId;
    }
    case 'card_before_30': {
      return events.some(e => e.type === 'Card' && e.time.elapsed < 30);
    }
    case 'over_2_5_goals': {
      const goals = events.filter(e => e.type === 'Goal').length;
      return goals > 2;
    }
    case 'corner_over_9': return null; // API-Football free doesn't include corners
    case 'penalty': {
      return events.some(e => e.type === 'Goal' && e.detail === 'Penalty');
    }
    default: return null;
  }
}
