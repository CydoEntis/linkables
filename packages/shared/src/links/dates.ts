// A from/to bound is a bare date or an offset datetime. A bare date means its
// whole UTC day, on the client, in the query schema and in the API's SQL.
export function isDateOnly(bound: string): boolean {
  return bound.length === "YYYY-MM-DD".length;
}
