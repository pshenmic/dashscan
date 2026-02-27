import { FastifyInstance } from 'fastify';
import BlocksController from './controllers/BlocksController';
import TransactionsController from './controllers/TransactionsController';
import AddressesController from './controllers/AddressesController';

interface RoutesOptions {
  fastify: FastifyInstance;
  blocksController: BlocksController;
  transactionsController: TransactionsController;
  addressesController: AddressesController;
}

export default function Routes({ fastify, blocksController, transactionsController, addressesController }: RoutesOptions): void {
  const routes = [
    {
      path: '/status',
      method: 'GET',
      handler: (request, reply) => reply.status(200).send({status: 'ok'}),
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
  ];

  routes.forEach((route) =>
    (fastify as any)[route.method.toLowerCase()](
      route.path,
      { schema: route.schema ?? null },
      route.handler,
    ),
  );
}
