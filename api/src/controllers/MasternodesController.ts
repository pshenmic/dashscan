import { FastifyRequest, FastifyReply } from 'fastify';
import MasternodesDAO from '../dao/MasternodesDAO';

export default class MasternodesController {
  private dao: MasternodesDAO;

  constructor(dao: MasternodesDAO) {
    this.dao = dao;
  }

  getMasternodes = async (request: FastifyRequest, response: FastifyReply): Promise<void> => {
    const masternodes = await this.dao.getMasternodes();
    response.send(masternodes);
  };
}
