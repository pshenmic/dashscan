import knex, { Knex } from 'knex';
import Intervals from './enums/Intervals'

export const getKnex = (): Knex => {
  return knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
  });
};

// https://github.com/wking/milliseconds-to-iso-8601-duration
export const iso8601duration = function (milliseconds: number | string): string {
  if (milliseconds === 0) {
    return 'P0D'
  }

  let offset = Math.floor(<number>milliseconds)
  let days = 0

  if (offset < 0) {
    days = Math.floor(offset % 86400000)
    offset -= 86400000 * days
  }

  milliseconds = offset % 1000

  offset = Math.floor(offset / 1000)

  const seconds = offset % 60
  offset = Math.floor(offset / 60)

  const minutes = offset % 60
  offset = Math.floor(offset / 60)

  const hours = offset % 24

  days += Math.floor(offset / 24)

  const parts = ['P']

  if (days) {
    parts.push(days + 'D')
  }

  if (hours || minutes || seconds || milliseconds) {
    parts.push('T')
    if (hours) {
      parts.push(hours + 'H')
    }
    if (minutes) {
      parts.push(minutes + 'M')
    }
    if (seconds || milliseconds) {
      parts.push(seconds.toString())
      if (milliseconds) {
        milliseconds = milliseconds.toString()
        while (milliseconds.length < 3) {
          milliseconds = '0' + milliseconds
        }
        parts.push('.' + milliseconds)
      }
      parts.push('S')
    }
  }
  return parts.join('')
}


// Calculating period and calculate the period
// and find the interval with less than 2 periods
// and take the previous interval
export const calculateInterval = (start, end) => {
  const intervalsInRFC = Object.keys(Intervals)

  const startTimestamp = start.getTime()
  const endTimestamp = end.getTime()

  const period = endTimestamp - startTimestamp

  return intervalsInRFC.reduce((previousValue, currentValue, currentIndex, array) => {
    const parts = period / Intervals[currentValue]

    if (parts < 4 && currentIndex > 0) {
      array.splice(intervalsInRFC.length)

      return previousValue
    } else if (parts <= 12 && currentIndex === 0) {
      array.splice(intervalsInRFC.length)

      return currentValue
    }

    return currentValue
  })
}