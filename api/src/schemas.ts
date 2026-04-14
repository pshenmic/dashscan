const schemas = [
  {
    $id: 'hash',
    type: 'string',
    pattern: '^[A-Za-z0-9]+$',
    minLength: 64,
    maxLength: 64,
  },
  {
    $id: 'address',
    type: 'string',
    maxLength: 35,
    minLength: 33,
    pattern: '^[A-Za-z0-9]+$',
  },
  {
    $id: 'paginationOptions',
    type: 'object',
    properties: {
      page: {
        type: ['integer', 'null'],
        minimum: 1,
      },
      limit: {
        type: ['integer', 'null'],
        minimum: 0,
        maximum: 100,
      },
      order: {
        type: ['string', 'null'],
        enum: ['asc', 'desc'],
      },
    },
  },
  {
    $id: 'timeInterval',
    type: 'object',
    properties: {
      timestamp_start: {
        type: ['string', 'null'],
        format: 'date-time'
      },
      timestamp_end: {
        type: ['string', 'null'],
        format: 'date-time'
      },
      timespan: {
        type: ['string', 'null'],
        enum: ['1h', '24h', '3d', '1w']
      },
      intervals_count: {
        type: ['number', 'null'],
        minimum: 2,
        maximum: 100
      }
    }
  },
];

export default schemas;