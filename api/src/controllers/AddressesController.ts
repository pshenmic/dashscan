import { FastifyRequest, FastifyReply } from 'fastify';
import { Knex } from 'knex';
import AddressesDAO from '../dao/AddressesDAO';
import {PaginatedQuery} from "./types";

export default class AddressesController {
  private addressesDAO: AddressesDAO;

  constructor(knex: Knex) {
    this.addressesDAO = new AddressesDAO(knex);
  }

  getAddresses = async (request: FastifyRequest<{ Querystring: PaginatedQuery }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;

    const addresses = await this.addressesDAO.getAddresses(page, limit, order);

    response.send(addresses);
  };
}
