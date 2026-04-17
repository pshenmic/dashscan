import {FastifyRequest, FastifyReply} from 'fastify';
import {Knex} from 'knex';
import AddressesDAO from '../dao/AddressesDAO';
import {PaginatedQuery} from "./types";
import {calculateInterval, iso8601duration} from "../utils";
import Intervals from "../enums/Intervals";

export default class AddressesController {
  private addressesDAO: AddressesDAO;

  constructor(knex: Knex) {
    this.addressesDAO = new AddressesDAO(knex);
  }

  getAddresses = async (request: FastifyRequest<{
    Querystring: PaginatedQuery
  }>, response: FastifyReply): Promise<void> => {
    const {page = 1, limit = 10, order = 'asc'} = request.query;

    const addresses = await this.addressesDAO.getAddresses(page, limit, order);

    response.send(addresses);
  };

  getAddress = async (request: FastifyRequest<{
    Params: { address: string }
  }>, response: FastifyReply): Promise<void> => {
    const {address} = request.params;

    const result = await this.addressesDAO.getAddress(address);

    if (!result) {
      response.status(404).send({error: 'Address not found'});
      return;
    }

    response.send(result);
  }

  getAddressBalanceSeries = async (
    request: FastifyRequest<{
      Params: { address: string };
      Querystring: { timestamp_start: string; timestamp_end: string; timespan: string; intervals_count: number }
    }>,
    response: FastifyReply
  ): Promise<void> => {
    const {address} = request.params;
    const {
      timestamp_start: start = new Date().getTime() - 3600000,
      timestamp_end: end = new Date().getTime(),
      intervals_count: intervalsCount
    } = request.query;

    if (!start || !end) {
      return response.status(400).send({message: 'start and end must be set'})
    }

    if (new Date(start).getTime() > new Date(end).getTime()) {
      return response.status(400).send({message: 'start timestamp cannot be more than end timestamp'})
    }

    const intervalInMs =
      Math.ceil(
        (new Date(end).getTime() - new Date(start).getTime()) / Number(intervalsCount ?? NaN) / 1000
      ) * 1000

    const interval = intervalsCount
      ? iso8601duration(intervalInMs)
      : calculateInterval(new Date(start), new Date(end))

    const series = await this.addressesDAO.getAddressBalanceSeries(address, new Date(start), new Date(end), interval, isNaN(intervalInMs) ? Intervals[interval] : intervalInMs);

    response.send(series);
  }
}
