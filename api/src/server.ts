import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import metricsPlugin from 'fastify-metrics';
import {DashCoreRPC} from "./dashcoreRPC";
import { Knex } from 'knex';
import { getKnex } from './utils';
import cors from '@fastify/cors';
import schemas from './schemas';
import Routes from './routes';
import ServiceNotAvailableError from './errors/ServiceNotAvailableError';
import BlocksController from './controllers/BlocksController';
import TransactionsController from './controllers/TransactionsController';
import AddressesController from './controllers/AddressesController';
import MasternodesController from './controllers/MasternodesController';
import MasternodesDAO from './dao/MasternodesDAO';
import MarketController from './controllers/MarketController';
import GovernanceController from "./controllers/GovernanceController";
import MarketService from './services/MarketService';
import SearchDAO from './dao/SearchDAO';
import SearchController from './controllers/SearchController';
import MainController from './controllers/MainController';

function errorHandler(err: FastifyError, req: FastifyRequest, reply: FastifyReply): void {
  if (err instanceof ServiceNotAvailableError) {
    reply.status(503).send({ error: 'Dashcore backend is not available' });
    return;
  }

  console.error(err);
  reply.status(500);
  reply.send({ error: err.message });
}

let knex: Knex;
let fastify: FastifyInstance;

export const start = async (): Promise<FastifyInstance> => {
  fastify = Fastify();

  await fastify.register(cors, {
    // put your options here
  });

  await fastify.register(metricsPlugin, {
    endpoint: '/metrics',
  });

  schemas.forEach((schema) => fastify.addSchema(schema));

  knex = getKnex();

  await knex.raw('select 1')

  const dashcoreRPC = new DashCoreRPC();
  const mainController = new MainController(dashcoreRPC, knex);
  const blocksController = new BlocksController(knex);
  const transactionsController = new TransactionsController(knex);
  const addressesController = new AddressesController(knex);
  const masternodesDAO = new MasternodesDAO(knex);
  const masternodesController = new MasternodesController(masternodesDAO);
  const marketService = new MarketService();
  const marketController = new MarketController(marketService);
  const searchDAO = new SearchDAO(knex);
  const searchController = new SearchController(searchDAO);
  const governanceController = new GovernanceController(dashcoreRPC, knex);

  Routes({
    fastify,
    mainController,
    blocksController,
    transactionsController,
    addressesController,
    masternodesController,
    marketController,
    searchController,
    governanceController,
  });

  fastify.setErrorHandler(errorHandler);

  await fastify.ready();

  return fastify;
};

export const stop = async (): Promise<void> => {
  console.log('Server stopped');

  await fastify.close();
  await knex.destroy();
};

export const listen = async (server: FastifyInstance): Promise<void> => {
  server.listen({
    host: '0.0.0.0',
    port: 3005,
    listenTextResolver: (address: string) => {
      const msg = `Dash Core Explorer API listening on ${address}`;
      console.log(msg);
      return msg;
    },
  });
};
