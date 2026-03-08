import { FastifyRequest, FastifyReply } from 'fastify';
import SearchDAO from '../dao/SearchDAO';

export default class SearchController {
  private searchDAO: SearchDAO;

  constructor(searchDAO: SearchDAO) {
    this.searchDAO = searchDAO;
  }

  search = async (request: FastifyRequest<{ Querystring: { query: string } }>, reply: FastifyReply): Promise<void> => {
    const { query } = request.query;
    const result = await this.searchDAO.search(query);
    reply.send(result);
  };
}