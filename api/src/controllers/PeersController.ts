import {FastifyReply, FastifyRequest} from "fastify";
import Redis from 'ioredis';
import PeersDAO from "../dao/PeersDAO";
import GeoIPService from "../services/GeoIPService";
import {PaginatedQuery} from "./types";

export default class PeersController {
  private peersDAO: PeersDAO;

  constructor(redis: Redis, geoIPService: GeoIPService) {
    this.peersDAO = new PeersDAO(redis, geoIPService);
  }

  getPeers = async (
    request: FastifyRequest<{ Querystring: PaginatedQuery }>,
    response: FastifyReply,
  ): Promise<void> => {
    const {page, limit, order = 'asc', available, country} = request.query;

    const peers = await this.peersDAO.getPeers(page, limit, order, available, country);

    response.send(peers);
  };
}