import Fastify, { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import metricsPlugin from 'fastify-metrics';
import cors from '@fastify/cors';
import schemas from './schemas';
import Routes from './routes';
import ServiceNotAvailableError from './errors/ServiceNotAvailableError';
import BlocksController from './controllers/BlocksController';
import { getKnex } from './utils';
import TransactionsController from './controllers/TransactionsController';
import AddressesController from './controllers/AddressesController';
import { Knex } from 'knex';

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

  const blocksController = new BlocksController(knex);
  const transactionsController = new TransactionsController(knex);
  const addressesController = new AddressesController(knex);

  Routes({
    fastify,
    blocksController,
    transactionsController,
    addressesController,
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
