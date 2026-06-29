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
      status: {
        type: ['string', 'null'],
        enum: ['ENABLED', 'POSE_BANNED'],
      },
      type: { type: ['string', 'null'], enum: ['REGULAR', 'EVO'] },
      available: { type: ['boolean', 'null'] },
      last_paid_before: {
        type: ['string', 'null'],
        format: 'date-time',
      },
      has_penalty: { type: ['boolean', 'null'] },
      country: {
        type: ['string', 'null'],
        enum: [
          'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
          'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
          'BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN',
          'CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
          'EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF',
          'GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM',
          'HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM',
          'JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC',
          'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK',
          'ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA',
          'NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG',
          'PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
          'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS',
          'ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO',
          'TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI',
          'VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
        ],
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
      intervals_count: {
        type: ['number', 'null'],
        minimum: 2,
        maximum: 100
      }
    }
  },
];

export default schemas;