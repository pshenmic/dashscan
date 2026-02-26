import knex, { Knex } from 'knex';

export const getKnex = (): Knex => {
  return knex({
    client: 'pg',
    connection: process.env.DATABASE_URL,
  });
};