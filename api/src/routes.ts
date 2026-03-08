import { FastifyInstance } from 'fastify';
import BlocksController from './controllers/BlocksController';
import TransactionsController from './controllers/TransactionsController';
import AddressesController from './controllers/AddressesController';
import MasternodesController from './controllers/MasternodesController';
import MarketController from './controllers/MarketController';
import SearchController from './controllers/SearchController';

interface RoutesOptions {
  fastify: FastifyInstance;
  blocksController: BlocksController;
  transactionsController: TransactionsController;
  addressesController: AddressesController;
  masternodesController: MasternodesController;
  marketController: MarketController;
  searchController: SearchController;
}

const currencyParam = {
  type: 'object',
  properties: {
    currency: { type: 'string', enum: ['usd', 'btc'] },
  },
  required: ['currency'],
};

export default function Routes({ fastify, blocksController, transactionsController, addressesController, masternodesController, marketController, searchController }: RoutesOptions): void {
  const routes = [
    {
      path: '/status',
      method: 'GET',
      handler: (request, reply) => reply.status(200).send({ status: 'ok' }),
    },
    {
      path: '/blocks',
      method: 'get',
      handler: blocksController.getBlocks,
      schema: {
        querystring: { $ref: 'paginationOptions#' },
      },
    },
    {
      path: '/block/:hash',
      method: 'get',
      handler: blocksController.getBlockByHash,
      schema: {
        params: {
          type: 'object',
          properties: {
            hash: { $ref: 'hash#' },
          },
        },
      },
    },
    {
      path: '/transactions',
      method: 'get',
      handler: transactionsController.getTransactions,
      schema: {
        querystring: { $ref: 'paginationOptions#' },
      },
    },
    {
      path: '/transactions/history',
      method: 'get',
      handler: transactionsController.getTransactionHistory,
    },
    {
      path: '/transactions/height/:height',
      method: 'get',
      handler: transactionsController.getTransactionsByBlockHeight,
      schema: {
        querystring: { $ref: 'paginationOptions#' },
        params: {
          type: 'object',
          properties: {
            height: {
              type: ['integer'],
              minimum: 1,
            },
          },
        },
      },
    },
    {
      path: '/transaction/:hash',
      method: 'get',
      handler: transactionsController.getTransactionByHash,
      schema: {
        params: {
          type: 'object',
          properties: {
            hash: { $ref: 'hash#' },
          },
        },
      },
    },
    {
      path: '/addresses',
      method: 'get',
      handler: addressesController.getAddresses,
      schema: {
        querystring: { $ref: 'paginationOptions#' },
      },
    },
    {
      path: '/masternodes',
      method: 'get',
      handler: masternodesController.getMasternodes,
      schema: {
        querystring: { $ref: 'paginationOptions#' },
      },
    },
    {
      path: '/price/:currency',
      method: 'get',
      handler: marketController.getPrice,
      schema: {
        params: {
          type: 'object',
          properties: {
            currency: { type: 'string', enum: ['usd', 'btc'] },
          },
          required: ['currency'],
        },
      },
    },
    {
      path: '/price/:currency/historical',
      method: 'get',
      handler: marketController.getHistoricalPrices,
      schema: {
        params: {
          type: 'object',
          properties: {
            currency: { type: 'string', enum: ['usd', 'btc'] },
          },
          required: ['currency'],
        },
      },
    },
    {
      path: '/marketcap/:currency',
      method: 'get',
      handler: marketController.getMarketCap,
      schema: {
        params: {
          type: 'object',
          properties: {
            currency: { type: 'string', enum: ['usd', 'btc'] },
          },
          required: ['currency'],
        },
      },
    },
    {
      path: '/marketcap/:currency/historical',
      path: '/price/:currency',
      method: 'get',
      handler: marketController.getPrice,
      schema: { params: currencyParam },
    },
    {
      path: '/price/:currency/historical',
      method: 'get',
      handler: marketController.getHistoricalPrices,
      schema: { params: currencyParam },
    },
    {
      path: '/marketcap/:currency',
      method: 'get',
      handler: marketController.getMarketCap,
      schema: { params: currencyParam },
    },
    {
      path: '/marketcap/:currency/historical',
      method: 'get',
      handler: marketController.getHistoricalMarketCaps,
      schema: { params: currencyParam },
    },
    {
      path: '/volume/:currency',
      method: 'get',
      handler: marketController.getHistoricalMarketCaps,
      schema: {
        params: {
          type: 'object',
          properties: {
            currency: { type: 'string', enum: ['usd', 'btc'] },
          },
          required: ['currency'],
        },
      },
    },
    {
      path: '/volume/:currency',
      method: 'get',
      handler: marketController.getVolume,
      schema: {
        params: {
          type: 'object',
          properties: {
            currency: { type: 'string', enum: ['usd', 'btc'] },
          },
          required: ['currency'],
        },
      },
    },
    {
      path: '/volume/:currency/historical',
      method: 'get',
      handler: marketController.getHistoricalVolumes,
      schema: {
        params: {
          type: 'object',
          properties: {
            currency: { type: 'string', enum: ['usd', 'btc'] },
          },
          required: ['currency'],
        },
      },
    },
    {
      path: '/search',
      method: 'get',
      handler: searchController.search,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            query: { type: 'string', minLength: 1 },
          },
          required: ['query'],
        },
      },
    },
  ];

  routes.forEach((route) =>
    (fastify as any)[route.method.toLowerCase()](
      route.path,
      { schema: route.schema ?? null },
      route.handler,
    ),
  );
}
