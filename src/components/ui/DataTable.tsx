import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface Column<T> {
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  className?: string
}

export function DataTable<T extends object>({
  columns,
  data,
  emptyMessage = 'No records found.',
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-base font-mono">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  'px-3 py-3 border border-gray-100 text-left text-gray-500 bg-surface font-bold',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-base text-muted border border-gray-100"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50 transition-colors">
                {columns.map((col, ci) => (
                  <td key={ci} className={cn('px-3 py-3 border border-gray-100', col.className)}>
                    {(() => {
                      const value = typeof col.accessor === 'function'
                        ? col.accessor(row)
                        : (row[col.accessor] as React.ReactNode)

                      if (
                        typeof value === 'string' &&
                        col.header.toLowerCase() === 'status' &&
                        value
                      ) {
                        return <StatusBadge status={value} />
                      }

                      return value ?? ''
                    })()}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
