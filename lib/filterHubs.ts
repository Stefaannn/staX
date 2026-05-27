import type { Hub } from '../hooks/useHubs';

export interface FilterOptions {
  searchName: string;
  filterGame: string;
  filterMode: 'all' | '4fun' | 'ranked';
  hideFull: boolean;
  showOnlyMine: boolean;
  sortBy: 'newest' | 'popular';
  memberCounts: Record<string, number>;
  memberships: Set<string>;
  userId: string;
}

export function applyHubFilters(hubs: Hub[], options: FilterOptions): Hub[] {
  return hubs
    .filter(hub => {
      if (options.searchName && !hub.name.toLowerCase().includes(options.searchName.toLowerCase())) return false;
      if (options.filterGame && hub.game !== options.filterGame) return false;
      if (options.filterMode !== 'all' && hub.mode !== options.filterMode) return false;
      if (options.hideFull && (options.memberCounts[hub.id] ?? 0) >= hub.max_members) return false;
      if (options.showOnlyMine && !options.memberships.has(hub.id) && hub.creator_id !== options.userId) return false;
      return true;
    })
    .sort((a, b) => {
      if (options.sortBy === 'popular') return (options.memberCounts[b.id] ?? 0) - (options.memberCounts[a.id] ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}
