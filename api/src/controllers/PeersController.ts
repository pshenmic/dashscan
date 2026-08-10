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
    const {page = 1, limit = 10, order = 'asc', available, country, user_agent, ip} = request.query;

    let userAgent: RegExp | undefined;

    try {
      userAgent = user_agent != null ? new RegExp(user_agent, 'i') : undefined;
    } catch {
      return response.status(400).send({error: 'user_agent must be a valid regular expression'});
    }

    const peers = await this.peersDAO.getPeers(page, limit, order, available, country, userAgent, ip);

    response.send(peers);
  };

  getPeerUserAgents = async (
    request: FastifyRequest<{ Querystring: PaginatedQuery }>,
    response: FastifyReply,
  ): Promise<void> => {
    const {page = 1, limit, order = 'desc'} = request.query;

    const userAgents = await this.peersDAO.getUserAgents(page, limit, order);

    response.send(userAgents);
  };
}