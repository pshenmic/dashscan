import { FastifyRequest, FastifyReply } from 'fastify';
import SearchDAO from '../dao/SearchDAO';
import {Knex} from "knex";

export default class SearchController {
  private searchDAO: SearchDAO;

  constructor(knex: Knex) {
    this.searchDAO = new SearchDAO(knex);
  }

  search = async (request: FastifyRequest<{ Querystring: { query: string } }>, reply: FastifyReply): Promise<void> => {
    const { query } = request.query;
    const result = await this.searchDAO.search(query);
    reply.send(result);
  };
}