export class PeerUserAgent {
  userAgent: string;
  count: number;

  constructor(userAgent: string, count: number) {
    this.userAgent = userAgent;
    this.count = count;
  }
}