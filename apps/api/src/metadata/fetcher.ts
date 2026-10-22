import { lookup as systemLookup } from "node:dns";
import { BlockList, isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { Agent, errors, request, type Dispatcher } from "undici";

const MAX_REDIRECTS = 5;
const CONNECT_TIMEOUT_MS = 2_000;
const TOTAL_TIMEOUT_MS = 10_000;
const HEAD_WINDOW_BYTES = 512 * 1024;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const DEFAULT_PORTS = [80, 443];
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const HEAD_CLOSE = /<\/head>/i;
const HEAD_CLOSE_LENGTH = "</head>".length;
const USER_AGENT = "Mozilla/5.0 (compatible; linkaroo/1.0)";

export type FetchFailureReason =
  | "blocked"
  | "invalid_url"
  | "too_many_redirects"
  | "http_status"
  | "unsupported_type"
  | "too_large"
  | "timeout"
  | "network";

export class FetchError extends Error {
  constructor(
    readonly reason: FetchFailureReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class BlockedAddressError extends FetchError {
  constructor(message: string) {
    super("blocked", message);
  }
}

export interface FetcherOptions {
  lookup?: LookupFunction;
  allowedPorts?: readonly number[];
  allowAddresses?: readonly string[];
}

export interface HtmlPage {
  url: string;
  contentType: string | null;
  html: string | null;
}

interface Guard {
  agent: Agent;
  allowedPorts: ReadonlySet<number>;
  isAllowed: (address: string) => boolean;
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
];
const BLOCKED_V6: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
  ["fec0::", 10],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["64:ff9b:1::", 48],
];

const blockList = new BlockList();
for (const [network, prefix] of BLOCKED_V4) blockList.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of BLOCKED_V6) blockList.addSubnet(network, prefix, "ipv6");

export function isBlockedAddress(ip: string): boolean {
  const address = ip.split("%")[0] ?? "";
  const family = isIP(address);
  if (family === 4) return blockList.check(address, "ipv4");
  if (family === 6) return isBlockedIPv6(address);
  return true;
}

function isBlockedIPv6(address: string): boolean {
  const embedded = embeddedIPv4(parseIPv6(address));
  if (embedded !== null) return isBlockedAddress(embedded);
  return blockList.check(address, "ipv6");
}

// Addresses whose last 32 bits (or, for 6to4, bits 16-48) reach an IPv4 host
// are judged by that IPv4 address. ::/96 (deprecated IPv4-compatible) and
// ::ffff:0:0/96 (IPv4-translated) are included so ::127.0.0.1 cannot slip past.
function embeddedIPv4(hextets: number[]): string | null {
  const [h0, h1, h2, h3, h4, h5, h6, h7] = hextets;
  if (h6 === undefined || h7 === undefined) return null;
  const zeroHead = [h0, h1, h2, h3].every((h) => h === 0);
  if (zeroHead && h4 === 0 && (h5 === 0xffff || h5 === 0)) return hextetsToIPv4(h6, h7);
  if (zeroHead && h4 === 0xffff && h5 === 0) return hextetsToIPv4(h6, h7);
  if (h0 === 0x64 && h1 === 0xff9b && [h2, h3, h4, h5].every((h) => h === 0)) return hextetsToIPv4(h6, h7);
  if (h0 === 0x2002 && h1 !== undefined && h2 !== undefined) return hextetsToIPv4(h1, h2);
  return null;
}

function parseIPv6(address: string): number[] {
  const [head = "", tail] = address.split("::");
  const left = groupsToHextets(head);
  if (tail === undefined) return left;
  const right = groupsToHextets(tail);
  const zeros = new Array<number>(8 - left.length - right.length).fill(0);
  return [...left, ...zeros, ...right];
}

function groupsToHextets(part: string): number[] {
  if (part === "") return [];
  return part.split(":").flatMap((group) => (group.includes(".") ? ipv4ToHextets(group) : [parseInt(group, 16)]));
}

function ipv4ToHextets(ipv4: string): number[] {
  const [a = 0, b = 0, c = 0, d = 0] = ipv4.split(".").map(Number);
  return [(a << 8) | b, (c << 8) | d];
}

function hextetsToIPv4(high: number, low: number): string {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

// Checking inside the connection's own lookup means the address that is
// checked is the address that is connected, so DNS rebinding cannot swap it.
export function guardLookup(lookup: LookupFunction, isAllowed: (address: string) => boolean): LookupFunction {
  return (hostname, options, callback) => {
    lookup(hostname, options, (error, address, family) => {
      if (error) {
        callback(error, address, family);
        return;
      }
      const addresses = typeof address === "string" ? [address] : address.map((entry) => entry.address);
      if (addresses.length === 0) {
        callback(Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: "ENOTFOUND" }), address, family);
        return;
      }
      const refused = addresses.find((candidate) => !isAllowed(candidate));
      if (refused === undefined) callback(null, address, family);
      else callback(new BlockedAddressError(`${hostname} resolves to blocked address ${refused}`), address, family);
    });
  };
}

// Node skips the lookup for IP-literal hosts, so literals are checked here,
// on every hop, alongside scheme and port.
function assertAllowedTarget(url: URL, guard: Guard): void {
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) throw new BlockedAddressError(`scheme ${url.protocol} is not allowed`);
  const port = url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port);
  if (!guard.allowedPorts.has(port)) throw new BlockedAddressError(`port ${String(port)} is not allowed`);
  const host = url.hostname.replace(/^\[(.*)\]$/, "$1");
  if (isIP(host) !== 0 && !guard.isAllowed(host)) throw new BlockedAddressError(`address ${host} is blocked`);
}

function parseUrl(raw: string, base?: URL): URL {
  try {
    return new URL(raw, base);
  } catch (error) {
    if (error instanceof TypeError) throw new FetchError("invalid_url", "URL could not be parsed");
    throw error;
  }
}

// Redirects are followed by hand because undici's redirect interceptor has no
// per-hop hook to run assertAllowedTarget on.
async function requestFollowingRedirects(
  start: URL,
  accept: string,
  guard: Guard,
  signal: AbortSignal,
): Promise<{ url: URL; response: Dispatcher.ResponseData }> {
  let url = start;
  for (let hop = 0; ; hop++) {
    assertAllowedTarget(url, guard);
    const response = await request(url, {
      dispatcher: guard.agent,
      signal,
      headers: { accept, "user-agent": USER_AGENT },
    });
    const location = response.headers.location;
    if (!REDIRECT_STATUSES.has(response.statusCode) || typeof location !== "string") return { url, response };
    discard(response.body);
    if (hop === MAX_REDIRECTS) throw new FetchError("too_many_redirects", `more than ${String(MAX_REDIRECTS)} redirects`);
    url = parseUrl(location, url);
  }
}

// Destroying an unread undici body emits an abort error with no listener;
// the body is unwanted, so that error is expected and ignored.
function discard(body: Readable): void {
  body.on("error", () => undefined).destroy();
}

function assertSuccess(response: Dispatcher.ResponseData): void {
  if (response.statusCode >= 200 && response.statusCode < 300) return;
  discard(response.body);
  throw new FetchError("http_status", `unexpected status ${String(response.statusCode)}`);
}

function contentTypeOf(response: Dispatcher.ResponseData): { mediaType: string | null; charset: string | null } {
  const header = response.headers["content-type"];
  if (typeof header !== "string") return { mediaType: null, charset: null };
  const [mediaType = "", ...params] = header.split(";");
  const charset = params.map((param) => /^\s*charset=["']?([^"';\s]+)/i.exec(param)?.[1]).find(Boolean) ?? null;
  return { mediaType: mediaType.trim().toLowerCase() || null, charset };
}

// Searches only each new chunk plus the few bytes before it, so a server that
// trickles tiny chunks cannot make the scan quadratic.
async function readHead(body: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  let carry = Buffer.alloc(0);
  for await (const chunk of body as AsyncIterable<Buffer>) {
    const window = Buffer.concat([carry, chunk]);
    const match = HEAD_CLOSE.exec(window.toString("latin1"));
    chunks.push(chunk);
    if (match) {
      const end = size - carry.length + match.index + HEAD_CLOSE_LENGTH;
      return Buffer.concat(chunks).subarray(0, Math.min(end, HEAD_WINDOW_BYTES));
    }
    size += chunk.length;
    if (size >= HEAD_WINDOW_BYTES) return Buffer.concat(chunks).subarray(0, HEAD_WINDOW_BYTES);
    carry = window.subarray(-(HEAD_CLOSE_LENGTH - 1));
  }
  return Buffer.concat(chunks);
}

function decode(bytes: Buffer, charset: string | null): string {
  try {
    return new TextDecoder(charset ?? "utf-8").decode(bytes);
  } catch (error) {
    if (error instanceof RangeError) return new TextDecoder("utf-8").decode(bytes);
    throw error;
  }
}

// The final URL is stored on the shared resource, so credentials in it would
// leak one user's secrets to everyone who saves the same page.
function withoutCredentials(url: URL): string {
  const clean = new URL(url);
  clean.username = "";
  clean.password = "";
  return clean.href;
}

async function getHtml(rawUrl: string, guard: Guard, signal: AbortSignal): Promise<HtmlPage> {
  const { url, response } = await requestFollowingRedirects(parseUrl(rawUrl), "text/html", guard, signal);
  assertSuccess(response);
  const { mediaType, charset } = contentTypeOf(response);
  if (mediaType !== "text/html") {
    discard(response.body);
    return { url: withoutCredentials(url), contentType: mediaType, html: null };
  }
  const head = await readHead(response.body);
  return { url: withoutCredentials(url), contentType: mediaType, html: decode(head, charset) };
}

async function getJson(rawUrl: string, guard: Guard, signal: AbortSignal): Promise<unknown> {
  const { response } = await requestFollowingRedirects(parseUrl(rawUrl), "application/json", guard, signal);
  assertSuccess(response);
  if (contentTypeOf(response).mediaType !== "application/json") {
    discard(response.body);
    throw new FetchError("unsupported_type", "response is not application/json");
  }
  try {
    return await response.body.json();
  } catch (error) {
    if (error instanceof SyntaxError) throw new FetchError("unsupported_type", "response is not valid JSON");
    throw error;
  }
}

function toFetchError(error: unknown, signal: AbortSignal): FetchError {
  if (error instanceof FetchError) return error;
  if (signal.aborted) return new FetchError("timeout", `no complete response within ${String(TOTAL_TIMEOUT_MS)} ms`);
  if (error instanceof errors.ResponseExceededMaxSizeError) return new FetchError("too_large", `body exceeds ${String(MAX_BODY_BYTES)} bytes`);
  return new FetchError("network", "request failed", { cause: error });
}

async function withTotalTimeout<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const signal = AbortSignal.timeout(TOTAL_TIMEOUT_MS);
  try {
    return await run(signal);
  } catch (error) {
    throw toFetchError(error, signal);
  }
}

export function createFetcher(options: FetcherOptions = {}) {
  const allowList = new Set(options.allowAddresses ?? []);
  const isAllowed = (address: string) => allowList.has(address) || !isBlockedAddress(address);
  const guard: Guard = {
    isAllowed,
    allowedPorts: new Set(options.allowedPorts ?? DEFAULT_PORTS),
    // An Agent of our own means proxy env vars and the global dispatcher never apply.
    agent: new Agent({
      connect: { lookup: guardLookup(options.lookup ?? systemLookup, isAllowed), timeout: CONNECT_TIMEOUT_MS },
      maxResponseSize: MAX_BODY_BYTES,
    }),
  };
  return {
    fetchHtml: (url: string) => withTotalTimeout((signal) => getHtml(url, guard, signal)),
    fetchJson: (url: string) => withTotalTimeout((signal) => getJson(url, guard, signal)),
  };
}

export const { fetchHtml, fetchJson } = createFetcher();
