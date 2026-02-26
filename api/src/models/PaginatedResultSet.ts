export default class PaginatedResultSet<T> {
  resultSet: T[];
  pagination: { page: number; limit: number; total: number };

  constructor(resultSet: T[], page: number, limit: number, total: any) {
    this.resultSet = resultSet;
    this.pagination = { page, limit, total: Number(resultSet.length ? total : -1) };
  }
}