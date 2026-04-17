import { FastifyInstance } from 'fastify';
import BlocksController from './controllers/BlocksController';
import TransactionsController from './controllers/TransactionsController';
import AddressesController from './controllers/AddressesController';
import MasternodesController from './controllers/MasternodesController';
import MarketController from './controllers/MarketController';
import SearchController from './controllers/SearchController';
import GovernanceController from "./controllers/GovernanceController";
import MainController from './controllers/MainController';

interface RoutesOptions {
  fastify: FastifyInstance;
  mainController: MainController;
  blocksController: BlocksController;
  transactionsController: TransactionsController;
  addressesController: AddressesController;
  masternodesController: MasternodesController;
  marketController: MarketController;
  searchController: SearchController;
  governanceController: GovernanceController;
}

export default function Routes({ fastify, mainController, blocksController, transactionsController, addressesController, masternodesController, marketController, searchController, governanceController }: RoutesOptions): void {
  const routes = [
    {
      path: '/status',
      method: 'GET',
      handler: mainController.getStatus,
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
      path: '/blocks/transactions/stats',
      method: 'get',
      handler: blocksController.getTxCountStats,
      schema: {
        querystring: { $ref: 'timeInterval#' },
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
      path: '/transactions/stats',
      method: 'get',
      handler: transactionsController.getTransactionCountSeries,
      schema: {
        querystring: {
          allOf: [
            { $ref: 'timeInterval#' },
            {
              type: 'object',
              properties: {
                running_total: { type: 'boolean' },
              },
            },
          ],
        },
      },
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
            query: { 
              type: 'string', 
              minLength: 1,
              pattern: '^[0-9A-Za-z]+$',
            },
          },
          required: ['query'],
        },
      },
    },
    {
      path: '/governance/proposals',
      method: 'get',
      handler: governanceController.getProposals,
      schema: {
        querystring: {
          type: 'object',
          properties: {
            proposalType: {
              type: ['string', 'null'],
              enum: ['valid', 'funding', 'delete', 'endorsed', 'all'],
            },
          },
        },
      },
    },
    {
      path: '/transactions/mempool',
      method: 'get',
      handler: transactionsController.getPendingTransactions
    },
    {
      path: '/address/:address',
      method: 'get',
      handler: addressesController.getAddress,
      schema: {
        params: {
          type: 'object',
          properties: {
            address: { $ref: 'address#' },
          }
        }
      }
    },
    {
      path: '/address/:address/transactions',
      method: 'get',
      handler: transactionsController.getAddressTransactions,
      schema: {
        params: {
          type: 'object',
          properties: {
            address: { $ref: 'address#' },
          },
        },
        querystring: { $ref: 'paginationOptions#' },
      }
    },
    {
      path: '/address/:address/balance/history',
      method: 'get',
      handler: addressesController.getAddressBalanceSeries,
      schema: {
        params: {
          type: 'object',
          properties: {
            address: { $ref: 'address#' },
          },
        },
        querystring: { $ref: 'timeInterval#' },
      },
    }
  ];

  routes.forEach((route) =>
    (fastify as any)[route.method.toLowerCase()](
      route.path,
      { schema: route.schema ?? null },
      route.handler,
    ),
  );
}
