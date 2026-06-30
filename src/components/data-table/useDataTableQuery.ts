import * as React from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';

import type { PaginatedResponse, PaginationParams } from '@/services/base/base.service';

import type { TableSortState } from './types';

export type UseDataTableQueryOptions<T> = {
  queryKey: QueryKey;
  fetchFn: (params: PaginationParams & Record<string, unknown>) => Promise<PaginatedResponse<T>>;
  initialPageSize?: number;
  enabled?: boolean;
  extraParams?: Record<string, unknown>;
};

export function useDataTableQuery<T>({
  queryKey,
  fetchFn,
  initialPageSize = 10,
  enabled = true,
  extraParams = {},
}: UseDataTableQueryOptions<T>) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [search, setSearch] = React.useState('');
  const [sort, setSortState] = React.useState<TableSortState>({ field: '', direction: 'asc' });
  const [selectedIds, setSelectedIds] = React.useState<Array<string | number>>([]);

  const query = useQuery({
    queryKey: [...queryKey, page, pageSize, search, sort, extraParams],
    queryFn: () =>
      fetchFn({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        sortBy: sort.field || undefined,
        sortOrder: sort.direction,
        ...extraParams,
      }),
    enabled,
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const items = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(total / pageSize));

  const handleSetSearch = React.useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleSetPageSize = React.useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const setSort = React.useCallback((field: string, direction?: 'asc' | 'desc') => {
    setSortState((prev) => ({
      field,
      direction: direction ?? (prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'),
    }));
    setPage(1);
  }, []);

  const toggleSort = React.useCallback((field: string) => setSort(field), [setSort]);

  const toggleSelection = React.useCallback((id: string | number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }, []);

  const selectAll = React.useCallback(() => {
    setSelectedIds(
      items
        .filter((item): item is T & { id: string | number } => {
          return typeof (item as { id?: unknown }).id === 'string' || typeof (item as { id?: unknown }).id === 'number';
        })
        .map((item) => item.id),
    );
  }, [items]);

  const clearSelection = React.useCallback(() => setSelectedIds([]), []);

  const isAllSelected =
    items.length > 0 &&
    items.every((item) => {
      const id = (item as { id?: string | number }).id;
      return id != null && selectedIds.includes(id);
    });

  return {
    items,
    total,
    totalPages,
    page,
    pageSize,
    search,
    sort,
    selectedIds,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    setPage,
    setPageSize: handleSetPageSize,
    setSearch: handleSetSearch,
    setSort,
    toggleSort,
    setSelectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isAllSelected,
    pagination: {
      page,
      pageSize,
      total,
      onPageChange: setPage,
      onPageSizeChange: setPageSize,
    },
  };
}
