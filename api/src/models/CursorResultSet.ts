// Keyset counterpart to PaginatedResultSet, for sets too expensive to offset
// into. `nextCursor` is null on the last page.
export default class CursorResultSet<T> {
  resultSet: T[];
  pagination: { limit: number; nextCursor: string | null };

  constructor(resultSet: T[], limit: number, nextCursor: string | null) {
    this.resultSet = resultSet;
    this.pagination = { limit, nextCursor };
  }
}
