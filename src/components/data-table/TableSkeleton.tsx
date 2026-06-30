import * as React from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showActions?: boolean;
  showSelection?: boolean;
  showExpand?: boolean;
  wrapInCard?: boolean;
  className?: string;
}

export function TableSkeleton({
  columns = 5,
  rows = 5,
  showActions = true,
  showSelection = false,
  showExpand = false,
  wrapInCard = true,
  className,
}: TableSkeletonProps) {
  const content = (
    <div className={cn('overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            {showExpand && (
              <TableHead className="w-8">
                <div className="h-4 w-4 skeleton rounded" />
              </TableHead>
            )}
            {showSelection && (
              <TableHead className="w-10">
                <div className="h-4 w-4 skeleton rounded" />
              </TableHead>
            )}
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i} className="py-3">
                <div className="h-3 w-20 skeleton rounded" />
              </TableHead>
            ))}
            {showActions && (
              <TableHead className="w-24">
                <div className="h-3 w-16 skeleton rounded" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="border-b border-border">
              {showExpand && (
                <TableCell className="py-4">
                  <div className="h-4 w-4 skeleton rounded" />
                </TableCell>
              )}
              {showSelection && (
                <TableCell className="py-4">
                  <div className="h-4 w-4 skeleton rounded" />
                </TableCell>
              )}
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex} className="py-4">
                  <div className="h-4 skeleton rounded" />
                </TableCell>
              ))}
              {showActions && (
                <TableCell className="py-4">
                  <div className="h-8 w-16 skeleton rounded" />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (wrapInCard) {
    return (
      <Card className="p-0 border border-border shadow-sm rounded-2xl overflow-hidden">
        {content}
      </Card>
    );
  }

  return content;
}
