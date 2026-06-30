import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { LogoOverlayInline } from '@/components/ui/LogoOverlayInline';
import { cn } from '@/lib/utils';

import { BREAKPOINTS, type DataTableColumn, type DataTableProps, type HideBelow } from './types';

export { BREAKPOINTS };
export type { DataTableColumn, DataTableProps, HideBelow };

const HIDE_CELL_CLASS_MAP: Record<HideBelow, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
};

function useWindowWidth(): number {
  const [width, setWidth] = React.useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1280),
  );
  React.useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export function DataTable<T>(props: DataTableProps<T>) {
  const {
    items,
    columns,
    rowKey,
    overlay = false,
    overlayContent,
    overlayUseLogo = false,
    overlayTitle,
    overlayMessage,
    renderExpanded,
    renderMobileCard,
    mobileCardContainerClassName,
    wrapInCard = true,
    desktopWrapperClassName,
    hasMore,
    sentinelRef,
    sentinelClassName,
    tableClassName,
    containerClassName,
    cardClassName,
  } = props;

  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);
  const windowWidth = useWindowWidth();
  const canExpand = typeof renderExpanded === 'function';

  const effectiveHideBelow = React.useCallback((col: DataTableColumn<T>): HideBelow | undefined => {
    if (col.hideBelow) return col.hideBelow;
    return col.id.toLowerCase() === 'actions' ? 'xl' : undefined;
  }, []);

  const hiddenColumns = React.useMemo(
    () =>
      columns.filter((col) => {
        const hideBelow = effectiveHideBelow(col);
        return hideBelow ? windowWidth < BREAKPOINTS[hideBelow] : false;
      }),
    [columns, windowWidth, effectiveHideBelow],
  );

  const showToggle = hiddenColumns.length > 0 || canExpand;

  const baseTableClass = 'min-w-full text-sm text-foreground';
  const headCellBaseClass =
    'text-xs font-bold uppercase tracking-wide text-foreground/80 py-3 bg-muted/60 dark:bg-muted/40';
  const bodyCellBaseClass = 'py-3 text-foreground';
  const headRowClass = 'bg-muted/60 dark:bg-muted/40';
  const bodyRowClass =
    'align-top border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors duration-150 ease-out';

  const content = (
    <>
      <div className={desktopWrapperClassName || 'overflow-x-auto'}>
        <Table className={cn(baseTableClass, tableClassName)}>
          <TableHeader>
            <TableRow className={headRowClass}>
              {showToggle && <TableHead className={cn(headCellBaseClass, 'w-8 text-center')} />}
              {columns.map((col) => {
                const hideBelow = effectiveHideBelow(col);
                return (
                  <TableHead
                    key={col.id}
                    className={cn(
                      headCellBaseClass,
                      hideBelow ? HIDE_CELL_CLASS_MAP[hideBelow] : '',
                      col.headerClassName,
                    )}
                  >
                    {col.header}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const keyBase = rowKey({ item, index });
              const isExpanded = expandedKey === keyBase;

              return (
                <React.Fragment key={keyBase}>
                  <TableRow className={bodyRowClass}>
                    {showToggle && (
                      <TableCell className={cn(bodyCellBaseClass, 'w-8 text-center')}>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? 'Contraer fila' : 'Expandir fila'}
                          onClick={() =>
                            setExpandedKey((prev) => (prev === keyBase ? null : keyBase))
                          }
                          className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                    )}

                    {columns.map((col) => {
                      const hideBelow = effectiveHideBelow(col);
                      return (
                        <TableCell
                          key={col.id}
                          className={cn(
                            bodyCellBaseClass,
                            hideBelow ? HIDE_CELL_CLASS_MAP[hideBelow] : '',
                            col.cellClassName,
                          )}
                        >
                          {col.cell({ item, index })}
                        </TableCell>
                      );
                    })}
                  </TableRow>

                  {isExpanded && (
                    <TableRow className="bg-muted/30 border-b border-border">
                      {showToggle && <TableCell className="py-0" />}
                      <TableCell
                        colSpan={
                          columns.filter((col) => {
                            const hideBelow = effectiveHideBelow(col);
                            return !hideBelow || windowWidth >= BREAKPOINTS[hideBelow];
                          }).length
                        }
                        className="py-3 px-4"
                      >
                        {hiddenColumns.length > 0 && (
                          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                            {hiddenColumns.map((col) => {
                              const label =
                                col.mobileLabel ??
                                (typeof col.header === 'string' ? col.header : col.id);
                              return (
                                <React.Fragment key={col.id}>
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide self-center whitespace-nowrap">
                                    {label}
                                  </span>
                                  <span className="text-sm text-foreground flex items-center gap-2 flex-wrap">
                                    {col.cell({ item, index })}
                                  </span>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        )}

                        {canExpand && (
                          <div className={hiddenColumns.length > 0 ? 'mt-3' : undefined}>
                            {renderExpanded({ item, index })}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {renderMobileCard ? (
        <div
          className={
            mobileCardContainerClassName ||
            'sm:hidden mt-2 max-h-[60vh] overflow-auto space-y-3'
          }
        >
          {items.map((item, index) => (
            <React.Fragment key={`${rowKey({ item, index })}-mobile`}>
              {renderMobileCard({ item, index })}
            </React.Fragment>
          ))}
        </div>
      ) : null}

      {!!hasMore && sentinelRef ? (
        <div
          ref={sentinelRef as unknown as React.RefObject<HTMLDivElement>}
          aria-hidden
          className={sentinelClassName || 'h-1 w-full'}
          style={{ minHeight: 1 }}
        />
      ) : null}
    </>
  );

  return (
    <div className={cn('relative', containerClassName)}>
      {overlay ? (
        overlayContent ? (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-2xl">
            {overlayContent}
          </div>
        ) : overlayUseLogo ? (
          <LogoOverlayInline
            open
            title={overlayTitle || 'BUSCANDO'}
            message={overlayMessage || 'Buscando, por favor espere...'}
          />
        ) : (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10 rounded-2xl">
            <div className="text-sm text-muted-foreground">Cargando...</div>
          </div>
        )
      ) : null}

      {wrapInCard ? (
        <Card
          className={cn(
            'p-0 border border-border shadow-sm rounded-2xl overflow-hidden',
            cardClassName,
          )}
        >
          {content}
        </Card>
      ) : (
        content
      )}
    </div>
  );
}
