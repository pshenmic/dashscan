import { FastifyRequest, FastifyReply } from 'fastify';
import MasternodesDAO from '../dao/MasternodesDAO';
import {PaginatedQuery} from "./types";
import {Knex} from "knex";
import GeoIPService from "../services/GeoIPService";

export default class MasternodesController {
  private masternodesDAO: MasternodesDAO;

  constructor(knex: Knex, geoIPService: GeoIPService) {
    this.masternodesDAO = new MasternodesDAO(knex, geoIPService);
  }

  getMasternodes = async (request: FastifyRequest<{ Querystring: PaginatedQuery }>, response: FastifyReply): Promise<void> => {
    const {
      page,
      limit,
      order = 'asc',
      status,
      type,
      last_paid_before: lastPaidBefore,
      has_penalty: hasPenalty,
      country,
    } = request.query;

    const lastPaidBeforeUnix = lastPaidBefore != null
      ? Math.floor(new Date(lastPaidBefore).getTime() / 1000)
      : undefined;

    const masternodes = await this.masternodesDAO.getMasternodes(
      page, limit, order, status, type, lastPaidBeforeUnix, hasPenalty, country,
    );

    response.send(masternodes);
  };

  getMasternodeStats = async (request: FastifyRequest, response: FastifyReply): Promise<void> => {
    const stats = await this.masternodesDAO.getMasternodeStats();

    response.send(stats);
  };
}
