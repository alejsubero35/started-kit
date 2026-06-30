import type * as React from 'react';

export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;
export type HideBelow = keyof typeof BREAKPOINTS;

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (args: { item: T; index: number }) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  hideBelow?: HideBelow;
  mobileLabel?: string;
  sortable?: boolean;
};

export interface DataTableProps<T> {
  items: T[];
  columns: Array<DataTableColumn<T>>;
  rowKey: (args: { item: T; index: number }) => string;

  overlay?: boolean;
  overlayContent?: React.ReactNode;
  overlayUseLogo?: boolean;
  overlayTitle?: string;
  overlayMessage?: string;

  renderExpanded?: (args: { item: T; index: number }) => React.ReactNode;
  renderMobileCard?: (args: { item: T; index: number }) => React.ReactNode;
  mobileCardContainerClassName?: string;

  wrapInCard?: boolean;
  desktopWrapperClassName?: string;

  hasMore?: boolean;
  sentinelRef?: React.RefObject<HTMLDivElement>;
  sentinelClassName?: string;

  tableClassName?: string;
  containerClassName?: string;
  cardClassName?: string;
}

export type RowAction<T> = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  disabled?: (item: T) => boolean;
  hidden?: (item: T) => boolean;
  permission?: string | string[];
  role?: string | string[];
};

export type BulkAction<T> = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (items: T[]) => void;
  variant?: 'default' | 'destructive' | 'outline';
  disabled?: (items: T[]) => boolean;
  permission?: string | string[];
};

export type TableEmptyStateConfig = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export type TablePaginationConfig = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export type TableSortState = {
  field: string;
  direction: 'asc' | 'desc';
};

export type DataTableToolbarConfig = {
  title?: string;
  description?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  onRefresh?: () => void;
  onExport?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  showFilterButton?: boolean;
  onFilterClick?: () => void;
  actions?: React.ReactNode;
  permissions?: {
    create?: boolean;
    export?: boolean;
  };
};

export interface DataTableViewProps<T> extends Omit<DataTableProps<T>, 'items' | 'overlay'> {
  items: T[];
  loading?: boolean;
  error?: string | null;
  toolbar?: DataTableToolbarConfig;
  pagination?: TablePaginationConfig;
  emptyState?: TableEmptyStateConfig;
  selectable?: boolean;
  selectedIds?: Array<string | number>;
  onSelectionChange?: (ids: Array<string | number>) => void;
  bulkActions?: BulkAction<T>[];
  sort?: TableSortState;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  getItemId?: (item: T) => string | number;
}

export type UseDataTableOptions<T> = {
  items: T[];
  initialPageSize?: number;
  searchFields?: Array<keyof T | ((item: T) => string)>;
  getItemId?: (item: T) => string | number;
};

export type UseDataTableReturn<T> = {
  items: T[];
  allItems: T[];
  search: string;
  setSearch: (value: string) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  total: number;
  totalPages: number;
  sort: TableSortState;
  setSort: (field: string, direction?: 'asc' | 'desc') => void;
  toggleSort: (field: string) => void;
  selectedIds: Array<string | number>;
  setSelectedIds: (ids: Array<string | number>) => void;
  toggleSelection: (id: string | number) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isAllSelected: boolean;
  pagination: TablePaginationConfig;
};
