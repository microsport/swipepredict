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

// Mock data for demo mode when API key is not available
const MOCK_FIXTURES: ApiFixture[] = [
  {
    fixture: { id: 1001, date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), status: { short: 'NS' } },
    league: { id: 262, name: 'Liga MX' },
    teams: {
      home: { id: 2283, name: 'Club América', logo: '' },
      away: { id: 2269, name: 'Guadalajara', logo: '' },
    },
  },
  {
    fixture: { id: 1002, date: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), status: { short: 'NS' } },
    league: { id: 262, name: 'Liga MX' },
    teams: {
      home: { id: 2279, name: 'Cruz Azul', logo: '' },
      away: { id: 2285, name: 'UNAM Pumas', logo: '' },
    },
  },
  {
    fixture: { id: 1003, date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), status: { short: 'NS' } },
    league: { id: 262, name: 'Liga MX' },
    teams: {
      home: { id: 2282, name: 'Tigres UANL', logo: '' },
      away: { id: 2286, name: 'Monterrey', logo: '' },
    },
  },
  {
    fixture: { id: 1004, date: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(), status: { short: 'NS' } },
    league: { id: 262, name: 'Liga MX' },
    teams: {
      home: { id: 2276, name: 'Toluca', logo: '' },
      away: { id: 2274, name: 'Santos Laguna', logo: '' },
    },
  },
  {
    fixture: { id: 1005, date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), status: { short: 'NS' } },
    league: { id: 262, name: 'Liga MX' },
    teams: {
      home: { id: 2271, name: 'León', logo: '' },
      away: { id: 2283, name: 'Club América', logo: '' },
    },
  },
  {
    fixture: { id: 1006, date: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), status: { short: 'NS' } },
    league: { id: 262, name: 'Liga MX' },
    teams: {
      home: { id: 2269, name: 'Guadalajara', logo: '' },
      away: { id: 2282, name: 'Tigres UANL', logo: '' },
    },
  },
];

const MOCK_EVENTS: ApiEvent[] = [
  { time: { elapsed: 23 }, type: 'Goal', detail: 'Normal Goal', team: { id: 2283, name: 'Club América' } },
  { time: { elapsed: 41 }, type: 'Card', detail: 'Yellow Card', team: { id: 2269, name: 'Guadalajara' } },
  { time: { elapsed: 67 }, type: 'Goal', detail: 'Normal Goal', team: { id: 2269, name: 'Guadalajara' } },
];

export const IS_DEMO_MODE = !process.env.FOOTBALL_API_KEY;

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
  if (IS_DEMO_MODE) {
    console.log('[DEMO MODE] Returning mock fixtures');
    return MOCK_FIXTURES.slice(0, next);
  }
  return get<ApiFixture[]>('/fixtures', {
    league: String(leagueId),
    next: String(next),
    season: '2026',
  });
}

export async function getLiveFixtures(leagueId = LIGA_MX_ID): Promise<ApiFixture[]> {
  if (IS_DEMO_MODE) {
    console.log('[DEMO MODE] Returning empty live fixtures');
    return [];
  }
  return get<ApiFixture[]>('/fixtures', {
    league: String(leagueId),
    live: 'all',
  });
}

export async function getFixtureEvents(fixtureId: number): Promise<ApiEvent[]> {
  if (IS_DEMO_MODE) {
    console.log('[DEMO MODE] Returning mock events');
    return MOCK_EVENTS;
  }
  return get<ApiEvent[]>('/fixtures/events', { fixture: String(fixtureId) });
}

export async function getWorldCupFixtures(next = 20): Promise<ApiFixture[]> {
  if (IS_DEMO_MODE) {
    console.log('[DEMO MODE] Returning mock World Cup fixtures');
    return MOCK_FIXTURES.slice(0, next);
  }
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
