import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";
import { EmptyState } from "./StateViews";

export default function DataTable({
  columns,
  rows,
  rowKey = "symbol",
  defaultSortKey = null,
  defaultSortDir = "asc",
  pageSize = 25,
  stickyHeader = false,
  zebra = false,
  onRowClick,
  emptyTitle = "No matching rows",
  emptyDescription = "Try clearing your filters or adjusting the search query.",
}) {
  const [sortKey, setSortKey] = useState(defaultSortKey);
  const [sortDir, setSortDir] = useState(defaultSortDir);
  const [page, setPage] = useState(1);

  const handleSort = (col) => {
    if (!col.sortable) return;
    setPage(1);
    if (sortKey === col.key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col.key);
      setSortDir(col.defaultDir || "desc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    const getter = col?.sortValue || ((r) => r[sortKey]);

    return [...rows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      const aNull = va === null || va === undefined || Number.isNaN(va);
      const bNull = vb === null || vb === undefined || Number.isNaN(vb);
      if (aNull && bNull) return 0;
      if (aNull) return 1;
      if (bNull) return -1;

      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });
  }, [rows, columns, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, safePage, pageSize]);

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="lab-card min-w-0 overflow-hidden rounded-2xl">
      <div className={`overflow-x-auto ${stickyHeader ? "max-h-[70vh]" : ""}`}>
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead
            className={`lab-table-head ${
              stickyHeader
                ? "sticky top-0 z-10 bg-[#F3E8EA] dark:bg-[#2B1740]"
                : ""
            }`}
          >
            <tr className="text-xs font-bold uppercase tracking-wider text-[#3B1F4E] dark:text-brand-gold">
              {columns.map((col) => {
                const active = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={
                      col.sortable
                        ? active
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={`px-4 py-3.5 ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className={`inline-flex items-center gap-1.5 rounded transition-colors hover:text-brand-plum focus:outline-none dark:hover:text-brand-coral ${
                          col.align === "right" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <span>{col.label}</span>
                        <span
                          className={
                            active
                              ? "text-brand-plum dark:text-brand-coral"
                              : "text-brand-plum/45 dark:text-brand-coral/45"
                          }
                        >
                          {active ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="lab-table-body">
            {pagedRows.map((row, idx) => (
              <tr
                key={row[rowKey]}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={`${
                  zebra && idx % 2 === 1
                    ? "bg-brand-plum/[0.03] dark:bg-brand-coral/[0.04]"
                    : ""
                } ${
                  onRowClick
                    ? "cursor-pointer focus:bg-brand-coral/15 focus:outline-none"
                    : ""
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[var(--text-secondary)] ${
                      col.align === "right" ? "text-right tabular-nums" : ""
                    }`}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-table)] bg-brand-plum/[0.06] px-4 py-3 text-xs text-[var(--text-muted)] dark:bg-brand-plumDark/20">
          <span>
            Showing{" "}
            <strong className="text-[var(--text-primary)]">
              {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, sortedRows.length)}
            </strong>{" "}
            of{" "}
            <strong className="text-[var(--text-primary)]">
              {sortedRows.length}
            </strong>
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <span className="px-2 font-semibold text-[var(--text-primary)]">
              Page {safePage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="xs"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
