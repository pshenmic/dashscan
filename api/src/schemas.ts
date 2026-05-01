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
      superblock: {
        type: ['boolean', 'null'],
      },
      transaction_type: {
        type: ['string', 'null'],
        enum: [
          'CLASSIC',
          'PROVIDER_REGISTRATION',
          'PROVIDER_UPDATE_SERVICE',
          'PROVIDER_UPDATE_REGISTRAR',
          'PROVIDER_UPDATE_REVOCATION',
          'COINBASE',
          'QUORUM_COMMITMENT',
          'MASTERNODE_HARD_FORK_SIGNAL',
          'ASSET_LOCK',
          'ASSET_UNLOCK',
        ],
      },
      coinjoin: { type: ['boolean', 'null'] },
      multisig: { type: ['boolean', 'null'] },
      block_height: { type: ['integer', 'null'], minimum: 1 },
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
      intervals_count: {
        type: ['number', 'null'],
        minimum: 2,
        maximum: 100
      }
    }
  },
];

export default schemas;