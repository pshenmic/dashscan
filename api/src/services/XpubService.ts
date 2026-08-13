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

  // Digest, not the key: Redis keys surface in MONITOR and keyspace dumps.
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
   * Resolves an account-level key (m/44'/5'/account') to the wallet's addresses
   * by BIP44 gap-limit scan. Branch 0 is receive, 1 change.
   *
   * Derived strings and known ids are both cached. Caching used-ness is safe
   * because it is monotonic: the indexer never deletes an address row.
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

      // Confirmed lazily, only as far as the scan walks — checking the whole
      // cached list up front would make one large gap_limit request tax the rest.
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

      // Stop at the first run of `gapLimit` consecutive unused addresses: the
      // end of the wallet. Checking only between batches would scan past it.
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

      // Cached past the cutoff on purpose: a later, larger gap_limit reuses it.
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
