export default class SeriesData {
  timestamp: Date | null
  data: any | null

  constructor (timestamp: Date | null, data: any | null) {
    this.timestamp = timestamp ?? null
    this.data = data ?? null
  }
}
