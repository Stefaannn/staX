import { describe, it, expect } from 'vitest';
import { applyHubFilters } from '../../lib/filterHubs';
import type { Hub } from '../../hooks/useHubs';

const makeHub = (overrides: Partial<Hub> & { id: string }): Hub => ({
  name: 'Test Hub',
  game: 'Valorant',
  mode: 'ranked',
  description: null,
  creator_id: 'user-2',
  created_at: '2024-01-01T00:00:00Z',
  join_type: 'free',
  max_members: 10,
  ...overrides,
});

const defaultOptions = {
  searchName: '',
  filterGame: '',
  filterMode: 'all' as const,
  hideFull: false,
  showOnlyMine: false,
  sortBy: 'newest' as const,
  memberCounts: {},
  memberships: new Set<string>(),
  userId: 'user-1',
};

const hubs: Hub[] = [
  makeHub({ id: 'hub-1', name: 'Valorant Squad', game: 'Valorant', mode: 'ranked', created_at: '2024-03-01T00:00:00Z' }),
  makeHub({ id: 'hub-2', name: 'CS2 Chill', game: 'CS2', mode: '4fun', created_at: '2024-02-01T00:00:00Z' }),
  makeHub({ id: 'hub-3', name: 'Apex Ranked', game: 'Apex Legends', mode: 'ranked', created_at: '2024-01-01T00:00:00Z', max_members: 3 }),
  makeHub({ id: 'hub-4', name: 'Valorant 4Fun', game: 'Valorant', mode: '4fun', creator_id: 'user-1', created_at: '2024-04-01T00:00:00Z' }),
];

describe('applyHubFilters', () => {
  it('returneaza toate hub-urile fara filtre', () => {
    const result = applyHubFilters(hubs, defaultOptions);
    expect(result).toHaveLength(4);
  });

  it('filtreaza dupa numele hub-ului (case insensitive)', () => {
    const result = applyHubFilters(hubs, { ...defaultOptions, searchName: 'valorant' });
    expect(result).toHaveLength(2);
    expect(result.every(h => h.name.toLowerCase().includes('valorant'))).toBe(true);
  });

  it('filtreaza dupa joc exact', () => {
    const result = applyHubFilters(hubs, { ...defaultOptions, filterGame: 'CS2' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('hub-2');
  });

  it('filtreaza dupa mod ranked', () => {
    const result = applyHubFilters(hubs, { ...defaultOptions, filterMode: 'ranked' });
    expect(result).toHaveLength(2);
    expect(result.every(h => h.mode === 'ranked')).toBe(true);
  });

  it('filtreaza dupa mod 4fun', () => {
    const result = applyHubFilters(hubs, { ...defaultOptions, filterMode: '4fun' });
    expect(result).toHaveLength(2);
    expect(result.every(h => h.mode === '4fun')).toBe(true);
  });

  it('ascunde hub-urile pline', () => {
    const memberCounts = { 'hub-3': 3 };
    const result = applyHubFilters(hubs, { ...defaultOptions, hideFull: true, memberCounts });
    expect(result.find(h => h.id === 'hub-3')).toBeUndefined();
    expect(result).toHaveLength(3);
  });

  it('nu ascunde hub-urile care nu sunt pline', () => {
    const memberCounts = { 'hub-3': 2 };
    const result = applyHubFilters(hubs, { ...defaultOptions, hideFull: true, memberCounts });
    expect(result).toHaveLength(4);
  });

  it('afiseaza doar hub-urile utilizatorului (creator sau membru)', () => {
    const memberships = new Set(['hub-2']);
    const result = applyHubFilters(hubs, { ...defaultOptions, showOnlyMine: true, memberships, userId: 'user-1' });
    const ids = result.map(h => h.id);
    expect(ids).toContain('hub-4'); // creator
    expect(ids).toContain('hub-2'); // membru
    expect(ids).not.toContain('hub-1');
    expect(ids).not.toContain('hub-3');
  });

  it('sorteaza dupa cele mai noi (default)', () => {
    const result = applyHubFilters(hubs, { ...defaultOptions, sortBy: 'newest' });
    expect(result[0].id).toBe('hub-4'); // 2024-04-01 cel mai recent
    expect(result[result.length - 1].id).toBe('hub-3'); // 2024-01-01 cel mai vechi
  });

  it('sorteaza dupa popularitate (numar membri)', () => {
    const memberCounts = { 'hub-1': 8, 'hub-2': 5, 'hub-3': 1, 'hub-4': 3 };
    const result = applyHubFilters(hubs, { ...defaultOptions, sortBy: 'popular', memberCounts });
    expect(result[0].id).toBe('hub-1'); // 8 membri
    expect(result[result.length - 1].id).toBe('hub-3'); // 1 membru
  });

  it('combina mai multe filtre simultan', () => {
    const result = applyHubFilters(hubs, {
      ...defaultOptions,
      filterGame: 'Valorant',
      filterMode: 'ranked',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('hub-1');
  });

  it('returneaza lista goala daca niciun hub nu corespunde', () => {
    const result = applyHubFilters(hubs, { ...defaultOptions, searchName: 'xyznonexistent' });
    expect(result).toHaveLength(0);
  });
});
