import { isIPv6 } from "node:net";
import type { Context } from "hono";
import type { Logger } from "../log/logger";
import type { AppEnv } from "./env";

const MAPPED_IPV4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;

function hextets(ip: string): string[] {
  const [head = "", tail] = ip.toLowerCase().split("::");
  const front = head === "" ? [] : head.split(":");
  if (tail === undefined) return front;
  const back = tail === "" ? [] : tail.split(":");
  return [...front, ...Array<string>(8 - front.length - back.length).fill("0"), ...back];
}

// One IPv6 subscriber usually holds a whole /64, so keying by the full address
// would hand them 2^64 separate limits.
export function addressKey(ip: string): string {
  const mapped = MAPPED_IPV4.exec(ip);
  if (mapped?.[1] !== undefined) return mapped[1];
  if (!isIPv6(ip)) return ip;
  const prefix = hextets(ip)
    .slice(0, 4)
    .map((part) => part.replace(/^0+(?=.)/, ""));
  return `${prefix.join(":")}::/64`;
}

// The web container's Caddy sets X-Real-IP from the host proxy's
// X-Forwarded-For, overwriting anything the client sent, and the API has no
// published port. Without it (dev, tests) every caller shares one window; in
// production that means the proxy is misconfigured, which is logged once.
export function clientKey(logger: Logger, behindProxy: boolean, what: string) {
  let warned = false;
  return (c: Context<AppEnv>): string => {
    const ip = c.req.header("X-Real-IP");
    if (ip !== undefined) return addressKey(ip);
    if (behindProxy && !warned) {
      warned = true;
      logger.warn(`${what} without X-Real-IP; every caller shares one rate limit`);
    }
    return "unknown";
  };
}
