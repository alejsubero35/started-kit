import * as React from 'react';

import type { TableSortState, UseDataTableOptions, UseDataTableReturn } from './types';

function defaultGetItemId<T>(item: T): string | number {
  return (item as { id: string | number }).id;
}

function getSearchableText<T>(item: T, fields?: UseDataTableOptions<T>['searchFields']): string {
  if (!fields || fields.length === 0) {
    return JSON.stringify(item).toLowerCase();
  }

  return fields
    .map((field) => {
      if (typeof field === 'function') return field(item);
      const value = item[field];
      return value == null ? '' : String(value);
    })
    .join(' ')
    .toLowerCase();
}

export function useDataTable<T>({
  items,
  initialPageSize = 10,
  searchFields,
  getItemId = defaultGetItemId,
}: UseDataTableOptions<T>): UseDataTableReturn<T> {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [sort, setSortState] = React.useState<TableSortState>({ field: '', direction: 'asc' });
  const [selectedIds, setSelectedIds] = React.useState<Array<string | number>>([]);

  const filteredItems = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    let result = items;

    if (term) {
      result = result.filter((item) => getSearchableText(item, searchFields).includes(term));
    }

    if (sort.field) {
      result = [...result].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sort.field];
        const bVal = (b as Record<string, unknown>)[sort.field];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const cmp = String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' });
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [items, search, searchFields, sort.field, sort.direction]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const setSort = React.useCallback((field: string, direction?: 'asc' | 'desc') => {
    setSortState((prev) => ({
      field,
      direction: direction ?? (prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'),
    }));
    setPage(1);
  }, []);

  const toggleSort = React.useCallback(
    (field: string) => setSort(field),
    [setSort],
  );

  const handleSetSearch = React.useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleSetPageSize = React.useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const toggleSelection = React.useCallback((id: string | number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id],
    );
  }, []);

  const selectAll = React.useCallback(() => {
    setSelectedIds(paginatedItems.map((item) => getItemId(item)));
  }, [paginatedItems, getItemId]);

  const clearSelection = React.useCallback(() => setSelectedIds([]), []);

  const isAllSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.includes(getItemId(item)));

  return {
    items: paginatedItems,
    allItems: filteredItems,
    search,
    setSearch: handleSetSearch,
    page,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    total,
    totalPages,
    sort,
    setSort,
    toggleSort,
    selectedIds,
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
      onPageSizeChange: handleSetPageSize,
    },
  };
}
