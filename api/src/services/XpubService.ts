import {createHash} from 'crypto';
import {HDKey} from '@scure/bip32';
import {Network, utils as sdkUtils} from 'dash-core-sdk';
import AddressesDAO from '../dao/AddressesDAO';
import {Cache} from '../cache';
import InvalidXpubError from '../errors/InvalidXpubError';
import {DerivedAddress, ResolvedXpub, XpubBranchCache} from '../types/xpub';
import {
  NETWORK,
  XPUB_BRANCHES,
  XPUB_CACHE_LIFE_TIME,
  XPUB_DERIVATION_BATCH_SIZE,
  XPUB_MAX_ADDRESSES_PER_BRANCH,
  XPUB_VERSIONS,
} from '../constants';

const network = NETWORK === 'mainnet' ? Network.Mainnet : Network.Testnet;
const versions = XPUB_VERSIONS[NETWORK];

export default class XpubService {
  private addressesDAO: AddressesDAO;
  private cache: Cache;

  constructor(addressesDAO: AddressesDAO, cache: Cache) {
    this.addressesDAO = addressesDAO;
    this.cache = cache;
  }

  // Digest rather than the key itself: Redis keys surface in MONITOR, slowlog
  // and keyspace dumps, and an xpub discloses a wallet's whole history.
  private cacheKey = (xpub: string, branch: number): string =>
    `xpub:${createHash('sha256').update(`${NETWORK}:${xpub}`).digest('hex')}:${branch}`;

  private parse = (xpub: string): HDKey => {
    let node: HDKey;

    try {
      node = HDKey.fromExtendedKey(xpub.trim(), versions);
    } catch (e) {
      const message = (e as Error).message;

      throw new InvalidXpubError(
        message === 'Version mismatch' ? `Not a ${NETWORK} extended public key` : message,
      );
    }

    if (node.privateKey != null) {
      throw new InvalidXpubError('Extended private keys are not accepted');
    }

    return node;
  };

  private deriveRange = (branchNode: HDKey, from: number, count: number): string[] => {
    const addresses: string[] = [];

    for (let index = from; index < from + count; index++) {
      const {publicKey} = branchNode.deriveChild(index);

      if (publicKey == null) {
        throw new InvalidXpubError('Failed to derive public key');
      }

      addresses.push(sdkUtils.publicKeyHashToAddress(sdkUtils.SHA256RIPEMD160(publicKey), network));
    }

    return addresses;
  };

  private lookupIds = async (addresses: string[]): Promise<Map<string, number>> => {
    const rows = await this.addressesDAO.getAddressIds(addresses);

    return new Map(rows.map(({address, id}) => [address, id]));
  };

  /**
   * Resolves an account-level key (m/44'/5'/account') to the addresses the
   * wallet actually uses, by BIP44 gap-limit scan. Branch 0 is receive, 1 change.
   *
   * Both the derived strings and the ids of addresses already seen on chain are
   * cached. Caching used-ness is safe because it is monotonic — the indexer
   * inserts a row the first time an address appears and never deletes it — so
   * only addresses still unused at the last scan need re-checking. That keeps
   * the per-request lookup proportional to the trailing gap rather than to the
   * whole wallet, and a payment to a derived-but-unused address still shows up
   * immediately.
   */
  resolve = async (xpub: string, gapLimit: number): Promise<ResolvedXpub> => {
    const node = this.parse(xpub);

    const addresses: DerivedAddress[] = [];
    const addressIds: number[] = [];
    const nextUnused: Record<number, number | null> = {};

    for (const branch of XPUB_BRANCHES) {
      const branchNode = node.deriveChild(branch);
      const key = this.cacheKey(xpub, branch);

      const cached = await this.cache.get<XpubBranchCache>(key);

      let derived = cached?.derived ?? [];

      const known = new Map<string, number>(Object.entries(cached?.ids ?? {}));

      // Used-ness is confirmed lazily, in batches, only as far as the scan
      // actually walks. Checking the whole cached list up front would make a
      // single large gap_limit request tax every later one for the cache's life.
      let checkedTo = 0;

      const confirmUpTo = async (index: number): Promise<void> => {
        while (checkedTo <= index && checkedTo < derived.length) {
          const slice = derived
            .slice(checkedTo, checkedTo + XPUB_DERIVATION_BATCH_SIZE)
            .filter((address) => !known.has(address));

          (await this.lookupIds(slice)).forEach((id, address) => known.set(address, id));

          checkedTo += XPUB_DERIVATION_BATCH_SIZE;
        }
      };

      // Stop at the first run of `gapLimit` consecutive unused addresses — that
      // is the end of the wallet. Deriving in batches and only checking the gap
      // between them would scan past it and pick up addresses the wallet itself
      // would never derive.
      let scannedTo = 0;
      let run = 0;

      while (run < gapLimit && scannedTo < XPUB_MAX_ADDRESSES_PER_BRANCH) {
        if (scannedTo >= derived.length) {
          derived = derived.concat(
            this.deriveRange(branchNode, derived.length, XPUB_DERIVATION_BATCH_SIZE),
          );
        }

        await confirmUpTo(scannedTo);

        run = known.has(derived[scannedTo]) ? 0 : run + 1;
        scannedTo++;
      }

      // Cached beyond the cutoff on purpose: derivation is immutable, so a
      // later call with a larger gap limit reuses it instead of re-deriving.
      await this.cache.set(key, {derived, ids: Object.fromEntries(known)}, XPUB_CACHE_LIFE_TIME);

      let firstUnused: number | null = null;

      derived.slice(0, scannedTo).forEach((address, index) => {
        const addressId = known.get(address) ?? null;

        if (addressId == null && firstUnused == null) {
          firstUnused = index;
        }

        if (addressId != null) {
          addressIds.push(addressId);
        }

        addresses.push({address, branch, index, used: addressId != null, addressId});
      });

      nextUnused[branch] = firstUnused;
    }

    return {addresses, addressIds, nextUnused};
  };
}
