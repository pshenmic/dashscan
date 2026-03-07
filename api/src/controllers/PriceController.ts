import { FastifyRequest, FastifyReply } from 'fastify';
import PriceService from '../services/PriceService';

export default class PriceController {
  private priceService: PriceService;

  constructor(priceService: PriceService) {
    this.priceService = priceService;
  }

  getPrice = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const usd = await this.priceService.getCurrentPrice();
    reply.send({ usd });
  };

  getHistoricalPrices = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const prices = await this.priceService.getHistoricalPrices();
    reply.send(prices);
  };
}