export default class ServiceNotAvailableError extends Error {
  code: number;

  constructor(code: number) {
    super();
    this.code = code;
  }
}