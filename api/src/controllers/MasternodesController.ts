import { FastifyRequest, FastifyReply } from 'fastify';
import MasternodesDAO from '../dao/MasternodesDAO';

export default class MasternodesController {
  private dao: MasternodesDAO;

  constructor(dao: MasternodesDAO) {
    this.dao = dao;
  }

  getMasternodes = async (request: FastifyRequest<{ Querystring: { page?: number; limit?: number; order?: string } }>, response: FastifyReply): Promise<void> => {
    const { page = 1, limit = 10, order = 'asc' } = request.query;

    const masternodes = await this.dao.getMasternodes(page, limit, order);

    response.send(masternodes);
  };
}
