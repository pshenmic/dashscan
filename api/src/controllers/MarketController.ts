import { FastifyRequest, FastifyReply } from 'fastify';
import MarketService, { Currency } from '../services/MarketService';

export default class MarketController {
  private marketService: MarketService;

  constructor(marketService: MarketService) {
    this.marketService = marketService;
  }

  getPrice = async (request: FastifyRequest<{ Params: { currency: Currency } }>, reply: FastifyReply): Promise<void> => {
    const { currency } = request.params;
    const price = await this.marketService.getCurrentPrice(currency);
    reply.send({ [currency]: price });
  };

  getMarketCap = async (request: FastifyRequest<{ Params: { currency: Currency } }>, reply: FastifyReply): Promise<void> => {
    const { currency } = request.params;
    const marketCap = await this.marketService.getCurrentMarketCap(currency);
    reply.send({ [currency]: marketCap });
  };

  getVolume = async (request: FastifyRequest<{ Params: { currency: Currency } }>, reply: FastifyReply): Promise<void> => {
    const { currency } = request.params;
    const volume = await this.marketService.getCurrentVolume(currency);
    reply.send({ [currency]: volume });
  };

  getHistoricalPrices = async (request: FastifyRequest<{ Params: { currency: Currency } }>, reply: FastifyReply): Promise<void> => {
    const { currency } = request.params;
    reply.send(await this.marketService.getHistoricalPrices(currency));
  };

  getHistoricalMarketCaps = async (request: FastifyRequest<{ Params: { currency: Currency } }>, reply: FastifyReply): Promise<void> => {
    const { currency } = request.params;
    reply.send(await this.marketService.getHistoricalMarketCaps(currency));
  };

  getHistoricalVolumes = async (request: FastifyRequest<{ Params: { currency: Currency } }>, reply: FastifyReply): Promise<void> => {
    const { currency } = request.params;
    reply.send(await this.marketService.getHistoricalVolumes(currency));
  };
}