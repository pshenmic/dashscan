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
    const { page = 1, limit = 10, order = 'asc' } = request.query;

    const masternodes = await this.masternodesDAO.getMasternodes(page, limit, order);

    response.send(masternodes);
  };
}
