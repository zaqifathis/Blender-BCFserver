import { FILTERS, type Filters } from "../config/topicFilters";
import type { Sort } from "../config/topicSorts";

const literal = (s: string) => `'${s.replace(/'/g, "''")}'`;

// Start of a local calendar day ("YYYY-MM-DD", plus offset days) as an OData datetime
function dayStart(day: string, offset = 0) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d + offset).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function toODataFilter(filters: Filters) {
  return FILTERS.flatMap(({ key, kind }) => {
    const f = filters[key];
    if (!f) return [];
    if (kind === "date") {
      return [f.from && `${key} ge ${dayStart(f.from)}`, f.to && `${key} lt ${dayStart(f.to, 1)}`].filter(Boolean);
    }
    if (!f.value) return [];
    return [kind === "list" ? `${key}/any(x: x eq ${literal(f.value)})` : `${key} eq ${literal(f.value)}`];
  }).join(" and ");
}

export const toODataOrderBy = ({ field, desc }: Sort) => `${field} ${desc ? "desc" : "asc"}`;
