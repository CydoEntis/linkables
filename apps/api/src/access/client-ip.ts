import { isIPv6 } from "node:net";

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
