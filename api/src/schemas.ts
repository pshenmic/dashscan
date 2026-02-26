const schemas = [
  {
    $id: 'hash',
    type: 'string',
    pattern: '^[A-Za-z0-9]+$',
    minLength: 64,
    maxLength: 64,
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
];

export default schemas;