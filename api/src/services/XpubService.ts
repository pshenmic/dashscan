import {createHash} from 'crypto';
import {HDKey} from '@scure/bip32';
import {secp256k1} from '@noble/curves/secp256k1.js';
import {hmac} from '@noble/hashes/hmac.js';
import {sha512} from '@noble/hashes/sha2.js';
import {Network, utils as sdkUtils} from 'dash-core-sdk';
import AddressesDAO from '../dao/AddressesDAO';
import {Cache} from '../cache';
import InvalidXpubError from '../errors/InvalidXpubError';
import {DerivedAddress, ResolvedXpub, ScannedBranch, XpubBranchCache} from '../types/xpub';
import {
  NETWORK,
  XPUB_BRANCHES,
  XPUB_CACHE_LIFE_TIME,
  XPUB_CACHE_VERSION,
  XPUB_DERIVATION_BATCH_SIZE,
  XPUB_MAX_ADDRESSES_PER_BRANCH,
  XPUB_VERSIONS,
} from '../constants';

const network = NETWORK === 'mainnet' ? Network.Mainnet : Network.Testnet;
const versions = XPUB_VERSIONS[NETWORK];

const Point = secp256k1.Point;
const Fn = Point.Fn;

export default class XpubService {
  private addressesDAO: AddressesDAO;
  private cache: Cache;
  private inFlight = new Map<string, Promise<ResolvedXpub>>();

  constructor(addressesDAO: AddressesDAO, cache: Cache) {
    this.addressesDAO = addressesDAO;
    this.cache = cache;
  }

  // Digest, not the key: Redis keys surface in MONITOR and keyspace dumps.
  private digest = (xpub: string): string =>
    createHash('sha256').update(`${NETWORK}:${xpub}`).digest('hex');

  // Versioned: entries now end on a gapLimit boundary rather than a batch one,
  // and an older instance sharing this Redis would confirm only the first batch
  // of one and report the rest of the wallet unused. A rolling deploy rescans.
  private cacheKey = (xpub: string, branch: number): string =>
    `xpub:${XPUB_CACHE_VERSION}:${this.digest(xpub)}:${branch}`;

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

  /**
   * BIP32 CKDpub over one branch, bound to that branch's key material.
   *
   * Open-coded rather than looping HDKey.deriveChild, which re-parses the
   * parent point and hash160s an identifier nobody reads on every child. A
   * cold scan runs this thousands of times, so that overhead was over half of
   * the request. Output is byte-identical, retry-on-invalid-tweak included.
   */
  private brancher = (node: HDKey, branch: number): ((from: number, count: number) => string[]) => {
    const branchNode = node.deriveChild(branch);
    const publicKey = branchNode.publicKey;
    const chainCode = branchNode.chainCode;

    if (publicKey == null || chainCode == null) {
      throw new InvalidXpubError('Failed to derive public key');
    }

    const point = Point.fromBytes(publicKey);

    // serP(Kpar) || ser32(index), rewritten in place per child.
    const data = new Uint8Array(37);
    const view = new DataView(data.buffer);

    data.set(publicKey);

    const childPublicKey = (index: number): Uint8Array => {
      view.setUint32(33, index, false);

      const I = hmac(sha512, chainCode, data);

      try {
        const tweak = Fn.fromBytes(I.subarray(0, 32));
        const child = tweak === 0n ? point : point.add(Point.BASE.multiply(tweak));

        if (child.is0()) {
          throw new Error('Child key is the point at infinity');
        }

        return child.toBytes(true);
      } catch {
        // BIP32 skips an index whose tweak is out of range. Needs a preimage
        // of hmac-sha512 to reach, so it never runs in practice.
        return childPublicKey(index + 1);
      }
    };

    return (from: number, count: number): string[] => {
      const addresses: string[] = [];

      for (let index = from; index < from + count; index++) {
        addresses.push(
          sdkUtils.publicKeyHashToAddress(sdkUtils.SHA256RIPEMD160(childPublicKey(index)), network),
        );
      }

      return addresses;
    };
  };

  private lookupIds = async (addresses: string[]): Promise<Map<string, number>> => {
    const rows = await this.addressesDAO.getAddressIds(addresses);

    return new Map(rows.map(({address, id}) => [address, id]));
  };

  /**
   * Resolves an account-level key (m/44'/5'/account') to the wallet's addresses
   * by BIP44 gap-limit scan. Branch 0 is receive, 1 change.
   *
   * Every xpub endpoint resolves before it queries, so one wallet page load
   * fires three or four identical scans at once. They share the first one's
   * work instead of each paying for it: on a cold key that scan is the whole
   * request, and it is CPU the event loop cannot serve anything else during.
   */
  resolve = (xpub: string, gapLimit: number): Promise<ResolvedXpub> => {
    const key = `${this.digest(xpub)}:${gapLimit}`;
    const running = this.inFlight.get(key);

    if (running != null) {
      return running;
    }

    const scan = this.scan(xpub, gapLimit).finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, scan);

    return scan;
  };

  private scan = async (xpub: string, gapLimit: number): Promise<ResolvedXpub> => {
    const node = this.parse(xpub);

    // Concurrently: the branches share no state, and this overlaps one's Redis
    // and Postgres round trips with the other's derivation.
    const branches = await Promise.all(
      XPUB_BRANCHES.map((branch) => this.scanBranch(node, xpub, branch, gapLimit)),
    );

    const addresses: DerivedAddress[] = [];
    const addressIds: number[] = [];
    const nextUnused: Record<number, number | null> = {};

    branches.forEach((scanned) => {
      addresses.push(...scanned.addresses);
      addressIds.push(...scanned.addressIds);
      nextUnused[scanned.branch] = scanned.firstUnused;
    });

    return {addresses, addressIds, nextUnused};
  };

  /**
   * Derived strings and known ids are both cached. Caching used-ness is safe
   * because it is monotonic: the indexer never deletes an address row.
   */
  private scanBranch = async (
    node: HDKey,
    xpub: string,
    branch: number,
    gapLimit: number,
  ): Promise<ScannedBranch> => {
    const key = this.cacheKey(xpub, branch);
    const derive = this.brancher(node, branch);

    const cached = await this.cache.get<XpubBranchCache>(key);

    let derived = cached?.derived ?? [];

    const known = new Map<string, number>(Object.entries(cached?.ids ?? {}));

    const cachedCount = derived.length;
    const cachedIds = known.size;

    // Confirmed lazily, only as far as the scan walks — checking the whole
    // cached list up front would make one large gap_limit request tax the rest.
    let checkedTo = 0;

    const confirmUpTo = async (index: number): Promise<void> => {
      while (checkedTo <= index && checkedTo < derived.length) {
        const to = Math.min(checkedTo + XPUB_DERIVATION_BATCH_SIZE, derived.length);

        const slice = derived.slice(checkedTo, to).filter((address) => !known.has(address));

        (await this.lookupIds(slice)).forEach((id, address) => known.set(address, id));

        checkedTo = to;
      }
    };

    // Stop at the first run of `gapLimit` consecutive unused addresses: the
    // end of the wallet. Checking only between batches would scan past it.
    let scannedTo = 0;
    let run = 0;

    while (run < gapLimit && scannedTo < XPUB_MAX_ADDRESSES_PER_BRANCH) {
      if (scannedTo >= derived.length) {
        // Derivation costs ~10x a round trip per batch, so extend by the least
        // that could still end the scan — gapLimit — until enough wallet has
        // turned up that the batch will be walked rather than thrown away.
        const count = Math.min(
          derived.length < XPUB_DERIVATION_BATCH_SIZE ? gapLimit : XPUB_DERIVATION_BATCH_SIZE,
          XPUB_MAX_ADDRESSES_PER_BRANCH - derived.length,
        );

        derived = derived.concat(derive(derived.length, count));
      }

      await confirmUpTo(scannedTo);

      run = known.has(derived[scannedTo]) ? 0 : run + 1;
      scannedTo++;
    }

    // Cached past the cutoff on purpose: a later, larger gap_limit reuses it.
    // A scan that learned nothing new only extends the entry's life, rather
    // than shipping the whole list back to Redis to store it unchanged.
    if (derived.length !== cachedCount || known.size !== cachedIds) {
      await this.cache.set(key, {derived, ids: Object.fromEntries(known)}, XPUB_CACHE_LIFE_TIME);
    } else {
      await this.cache.touch(key, XPUB_CACHE_LIFE_TIME);
    }

    const addresses: DerivedAddress[] = [];
    const addressIds: number[] = [];

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

    return {branch, addresses, addressIds, firstUnused};
  };
}
