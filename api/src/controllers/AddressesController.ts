import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import AddressesDAO from '../dao/AddressesDAO';

export default class AddressesController {
  private addressesDAO: AddressesDAO;

  constructor(knex: Knex) {
    this.addressesDAO = new AddressesDAO(knex);
  }

  getAddresses = async (request: FastifyRequest<{ Querystring: { page?: number; limit?: number; order?: string } }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;

    const addresses = await this.addressesDAO.getAddresses(page, limit, order);

    response.send(addresses);
  };
}
