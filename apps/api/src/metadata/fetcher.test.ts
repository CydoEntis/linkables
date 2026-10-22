import type { LookupAddress, LookupOptions } from "node:dns";
import { createServer, type IncomingHttpHeaders, type RequestListener, type ServerResponse } from "node:http";
import type { AddressInfo, LookupFunction } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  BlockedAddressError,
  createFetcher,
  FetchError,
  guardLookup,
  isBlockedAddress,
} from "./fetcher";

const KB = 1024;
const MB = 1024 * KB;
const PAGE = "<html><head><title>Hi</title></head><body>hello</body></html>";

interface TestServer {
  origin: string;
  port: number;
  hits: string[];
  close(): Promise<void>;
}

async function startServer(handler: RequestListener, host = "127.0.0.1"): Promise<TestServer> {
  const hits: string[] = [];
  const server = createServer((req, res) => {
    hits.push(req.url ?? "");
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, host, resolve));
  const { port } = server.address() as AddressInfo;
  const origin = host.includes(":") ? `http://[${host}]:${String(port)}` : `http://${host}:${String(port)}`;
  return {
    origin,
    port,
    hits,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(() => { resolve(); });
      }),
  };
}

function sendHtml(res: ServerResponse, body = PAGE): void {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(302, { location });
  res.end();
}

function staticLookup(answers: Record<string, LookupAddress[]>, calls: string[] = []): LookupFunction {
  return (hostname, options, callback) => {
    calls.push(hostname);
    const found = answers[hostname];
    if (!found) {
      callback(Object.assign(new Error(`getaddrinfo ENOTFOUND ${hostname}`), { code: "ENOTFOUND" }), "", 0);
      return;
    }
    if (options.all) callback(null, found);
    else callback(null, found[0]?.address ?? "", found[0]?.family ?? 4);
  };
}

const refusingLookup: LookupFunction = (hostname) => {
  throw new Error(`lookup must not run for ${hostname}`);
};

describe("isBlockedAddress", () => {
  it.each([
    ["0.0.0.0/8", "0.0.0.0"],
    ["0.0.0.0/8", "0.255.255.255"],
    ["10/8", "10.0.0.1"],
    ["10/8", "10.255.255.255"],
    ["100.64/10", "100.64.0.1"],
    ["100.64/10", "100.127.255.255"],
    ["127/8", "127.0.0.1"],
    ["127/8", "127.255.255.254"],
    ["169.254/16", "169.254.169.254"],
    ["172.16/12", "172.16.0.1"],
    ["172.16/12", "172.31.255.255"],
    ["192.168/16", "192.168.1.1"],
    ["198.18/15", "198.18.0.1"],
    ["198.18/15", "198.19.255.255"],
    ["192.0.0/24", "192.0.0.1"],
    ["224/4 multicast", "224.0.0.1"],
    ["224/4 multicast", "239.255.255.255"],
    ["240/4 and up", "240.0.0.1"],
    ["240/4 and up", "255.255.255.255"],
    ["::", "::"],
    ["::1", "::1"],
    ["fc00::/7", "fc00::1"],
    ["fc00::/7", "fdff:ffff::1"],
    ["fe80::/10", "fe80::1"],
    ["fe80::/10", "febf::1"],
    ["fe80::/10 with zone id", "fe80::1%eth0"],
    ["ff00::/8 multicast", "ff02::1"],
    ["IPv4-mapped dotted", "::ffff:127.0.0.1"],
    ["IPv4-mapped hex", "::ffff:7f00:1"],
    ["IPv4-mapped hex, uppercase", "::FFFF:7F00:1"],
    ["IPv4-mapped, uncompressed", "0:0:0:0:0:ffff:7f00:1"],
    ["IPv4-mapped metadata address", "::ffff:a9fe:a9fe"],
    ["IPv4-mapped private", "::ffff:10.0.0.1"],
    ["IPv4-compatible ::/96", "::127.0.0.1"],
    ["NAT64 64:ff9b::/96 hex", "64:ff9b::7f00:1"],
    ["NAT64 64:ff9b::/96 dotted", "64:ff9b::10.0.0.1"],
    ["6to4 2002::/16 loopback", "2002:7f00:1::"],
    ["6to4 2002::/16 private", "2002:c0a8:101::1"],
    ["IPv4-translated ::ffff:0:0/96", "::ffff:0:7f00:1"],
    ["IPv4-translated ::ffff:0:0/96 dotted", "::ffff:0:10.0.0.1"],
    ["local-use NAT64 64:ff9b:1::/48", "64:ff9b:1::808:808"],
    ["local-use NAT64 64:ff9b:1::/48", "64:ff9b:1:ffff:ffff:ffff:ffff:ffff"],
    ["Teredo 2001::/32", "2001::1"],
    ["Teredo 2001::/32", "2001:0:ffff:ffff:ffff:ffff:ffff:ffff"],
    ["site-local fec0::/10", "fec0::1"],
    ["site-local fec0::/10", "feff:ffff::1"],
    ["discard 100::/64", "100::1"],
    ["discard 100::/64", "100::ffff:ffff:ffff:ffff"],
    ["documentation 2001:db8::/32", "2001:db8::1"],
    ["documentation 2001:db8::/32", "2001:db8:ffff:ffff:ffff:ffff:ffff:ffff"],
    ["not an IP address", "localhost"],
    ["bracketed literal", "[::1]"],
  ])("refuses %s: %s", (_range, ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "11.0.0.1",
    "100.63.255.255",
    "100.128.0.0",
    "172.15.255.255",
    "172.32.0.0",
    "192.167.255.255",
    "192.169.0.0",
    "198.17.255.255",
    "198.20.0.0",
    "192.0.1.1",
    "223.255.255.255",
    "2606:4700:4700::1111",
    "fbff::1",
    "::ffff:8.8.8.8",
    "::ffff:808:808",
    "64:ff9b::808:808",
    "2002:808:808::1",
    "::ffff:0:808:808",
    "64:ff9b:2::1",
    "2001:1::1",
    "2001:4860:4860::8888",
    "100:0:0:1::1",
    "2001:db7:ffff::1",
    "2001:db9::1",
  ])("allows public address %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe("URL parsing", () => {
  it.each([
    ["http://2130706433/", "127.0.0.1"],
    ["http://0x7f.1/", "127.0.0.1"],
    ["http://0177.0.0.1/", "127.0.0.1"],
    ["http://127.1/", "127.0.0.1"],
    ["http://[::ffff:127.0.0.1]/", "[::ffff:7f00:1]"],
  ])("normalises %s to %s before the address check", (url, hostname) => {
    expect(new URL(url).hostname).toBe(hostname);
  });
});

describe("guardLookup", () => {
  const allowPublic = (address: string) => !isBlockedAddress(address);

  function resolveWith(answer: string | LookupAddress[], options: LookupOptions) {
    const inner: LookupFunction = (_hostname, _options, callback) => {
      if (typeof answer === "string") callback(null, answer, 4);
      else callback(null, answer);
    };
    return new Promise<{ error: unknown; address: unknown }>((resolve) => {
      guardLookup(inner, allowPublic)("site.test", options, (error, address) => {
        resolve({ error, address });
      });
    });
  }

  it("refuses a single-address answer that is private", async () => {
    const { error } = await resolveWith("10.0.0.1", {});
    expect(error).toBeInstanceOf(BlockedAddressError);
  });

  it("passes a single-address answer that is public", async () => {
    const { error, address } = await resolveWith("93.184.216.34", {});
    expect(error).toBeNull();
    expect(address).toBe("93.184.216.34");
  });

  it("refuses an all: true answer when any address is private", async () => {
    const answer = [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ];
    const { error } = await resolveWith(answer, { all: true });
    expect(error).toBeInstanceOf(BlockedAddressError);
  });
});

describe("fetcher with production defaults", () => {
  const fetcher = createFetcher({ lookup: refusingLookup });

  it.each([
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://2130706433/",
    "http://0x7f.1/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0/",
  ])("refuses %s without a DNS lookup", async (url) => {
    await expect(fetcher.fetchHtml(url)).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it("refuses http://localhost/ through the system resolver", async () => {
    await expect(createFetcher().fetchHtml("http://localhost/")).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it.each(["file:///etc/passwd", "ftp://example.com/"])("refuses the %s scheme", async (url) => {
    await expect(fetcher.fetchHtml(url)).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it("refuses port 8080 before resolving the host", async () => {
    const calls: string[] = [];
    const guarded = createFetcher({ lookup: staticLookup({ "example.test": [{ address: "93.184.216.34", family: 4 }] }, calls) });
    await expect(guarded.fetchHtml("http://example.test:8080/")).rejects.toThrow(/port 8080/);
    expect(calls).toEqual([]);
  });

  it("refuses a DNS name that resolves to a private address", async () => {
    const guarded = createFetcher({ lookup: staticLookup({ "internal.test": [{ address: "10.0.0.1", family: 4 }] }) });
    await expect(guarded.fetchHtml("http://internal.test/")).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it("refuses a DNS name when any resolved address is private", async () => {
    const answers = { "mixed.test": [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.1", family: 4 }] };
    const guarded = createFetcher({ lookup: staticLookup(answers) });
    await expect(guarded.fetchHtml("http://mixed.test/")).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it("reports a DNS name with no addresses as a network failure", async () => {
    const guarded = createFetcher({ lookup: staticLookup({ "empty.test": [] }) });
    const result = guarded.fetchHtml("http://empty.test/");
    await expect(result).rejects.toMatchObject({ reason: "network" });
    await expect(result).rejects.toHaveProperty("cause.code", "ENOTFOUND");
  });

  it("reports an unparseable URL as invalid_url", async () => {
    await expect(fetcher.fetchHtml("not a url")).rejects.toMatchObject({ reason: "invalid_url" });
  });
});

describe("fetcher against a local server", () => {
  let server: TestServer;
  let proxy: TestServer;
  let fetcher: ReturnType<typeof createFetcher>;
  let lastHeaders: IncomingHttpHeaders = {};

  beforeAll(async () => {
    server = await startServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://local");
      const chain = /^\/chain\/(\d+)$/.exec(url.pathname);
      if (chain) {
        const left = Number(chain[1]);
        if (left === 0) sendHtml(res);
        else redirect(res, `/chain/${String(left - 1)}`);
        return;
      }
      switch (url.pathname) {
        case "/html":
          sendHtml(res);
          return;
        case "/redirect":
          redirect(res, url.searchParams.get("to") ?? "/");
          return;
        case "/headers":
          lastHeaders = req.headers;
          sendHtml(res);
          return;
        case "/head-then-hang":
          res.writeHead(200, { "content-type": "text/html" });
          res.write("<html><head><title>Hi</title></HEAD><body>");
          return;
        case "/split-head":
          res.writeHead(200, { "content-type": "text/html" });
          res.write("<html><head><title>Hi</title></he");
          setTimeout(() => res.write("ad><body>"), 50);
          return;
        case "/no-head-end":
          res.writeHead(200, { "content-type": "text/html" });
          res.write(`<html><head>${"a".repeat(600 * KB)}`);
          return;
        case "/missing":
          res.writeHead(404, { "content-type": "text/html" });
          res.end(PAGE);
          return;
        case "/pdf":
          res.writeHead(200, { "content-type": "application/pdf" });
          res.end("%PDF-1.7");
          return;
        case "/json":
          res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
          res.end(JSON.stringify({ title: "A video" }));
          return;
        case "/json-error":
          res.writeHead(401, { "content-type": "application/json" });
          res.end("Unauthorized");
          return;
        case "/json-as-text":
          res.writeHead(200, { "content-type": "text/plain" });
          res.end(JSON.stringify({ title: "A video" }));
          return;
        case "/json-huge":
          res.writeHead(200, { "content-type": "application/json" });
          res.end(`"${"a".repeat(3 * MB)}"`);
          return;
        case "/stall-headers":
          return;
        case "/stall-body":
          res.writeHead(200, { "content-type": "text/html" });
          res.write("<html>");
          return;
        default:
          res.writeHead(404);
          res.end();
      }
    });
    proxy = await startServer((_req, res) => { sendHtml(res, "<html><head><title>proxy</title></head></html>"); });
    fetcher = createFetcher({
      lookup: refusingLookup,
      allowAddresses: ["127.0.0.1"],
      allowedPorts: [server.port, 80],
    });
  });

  afterAll(async () => {
    await server.close();
    await proxy.close();
  });

  it("fetches an allowed page and returns its head", async () => {
    const page = await fetcher.fetchHtml(`${server.origin}/html`);
    expect(page).toEqual({
      url: `${server.origin}/html`,
      contentType: "text/html",
      html: "<html><head><title>Hi</title></head>",
    });
  });

  it("strips credentials from the final URL", async () => {
    const target = encodeURIComponent(`http://user:secret@127.0.0.1:${String(server.port)}/html`);
    const page = await fetcher.fetchHtml(`http://a:b@127.0.0.1:${String(server.port)}/redirect?to=${target}`);
    expect(page.url).toBe(`${server.origin}/html`);
  });

  it.each([
    ["http://10.0.0.1/", /10\.0\.0\.1/],
    ["http://169.254.169.254/", /169\.254\.169\.254/],
    ["http://[::1]/", /::1/],
    ["http://example.test:8080/", /port 8080/],
    ["file:///etc/passwd", /file:/],
  ])("refuses a redirect to %s", async (target, reason) => {
    const result = fetcher.fetchHtml(`${server.origin}/redirect?to=${encodeURIComponent(target)}`);
    await expect(result).rejects.toBeInstanceOf(BlockedAddressError);
    await expect(result).rejects.toThrow(reason);
  });

  it("refuses a redirect from a host name to http://127.0.0.1/", async () => {
    const v6 = await startServer((req, res) => {
      if (req.url === "/ok") sendHtml(res);
      else redirect(res, "http://127.0.0.1/");
    }, "::1");
    try {
      const viaName = createFetcher({
        lookup: staticLookup({ "site.test": [{ address: "::1", family: 6 }] }),
        allowAddresses: ["::1"],
        allowedPorts: [v6.port, 80],
      });
      const reachable = await viaName.fetchHtml(`http://site.test:${String(v6.port)}/ok`);
      expect(reachable.html).toContain("<title>Hi</title>");
      const result = viaName.fetchHtml(`http://site.test:${String(v6.port)}/hop`);
      await expect(result).rejects.toBeInstanceOf(BlockedAddressError);
      await expect(result).rejects.toThrow(/127\.0\.0\.1/);
    } finally {
      await v6.close();
    }
  });

  it("follows 5 redirects", async () => {
    await expect(fetcher.fetchHtml(`${server.origin}/chain/5`)).resolves.toMatchObject({ url: `${server.origin}/chain/0` });
  });

  it("refuses a 6th redirect", async () => {
    await expect(fetcher.fetchHtml(`${server.origin}/chain/6`)).rejects.toMatchObject({ reason: "too_many_redirects" });
  });

  it("sends no X-Request-Id or traceparent header", async () => {
    await fetcher.fetchHtml(`${server.origin}/headers`);
    expect(lastHeaders["x-request-id"]).toBeUndefined();
    expect(lastHeaders.traceparent).toBeUndefined();
  });

  it("ignores proxy environment variables", async () => {
    const names = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"];
    const saved = names.map((name) => [name, process.env[name]] as const);
    for (const name of names) process.env[name] = proxy.origin;
    try {
      const page = await createFetcher({ lookup: refusingLookup, allowAddresses: ["127.0.0.1"], allowedPorts: [server.port] })
        .fetchHtml(`${server.origin}/html`);
      expect(page.html).toContain("<title>Hi</title>");
      expect(proxy.hits).toEqual([]);
    } finally {
      for (const [name, value] of saved) {
        if (value === undefined) Reflect.deleteProperty(process.env, name);
        else process.env[name] = value;
      }
    }
  });

  it("stops reading at </head> without waiting for the rest", async () => {
    const page = await fetcher.fetchHtml(`${server.origin}/head-then-hang`);
    expect(page.html).toBe("<html><head><title>Hi</title></HEAD>");
  });

  it("finds </head> split across two chunks", async () => {
    const page = await fetcher.fetchHtml(`${server.origin}/split-head`);
    expect(page.html).toBe("<html><head><title>Hi</title></head>");
  });

  it("stops reading at 512 KB when there is no </head>", async () => {
    const page = await fetcher.fetchHtml(`${server.origin}/no-head-end`);
    expect(page.html).toHaveLength(512 * KB);
  });

  it("hard-aborts a body over 2 MB", async () => {
    await expect(fetcher.fetchJson(`${server.origin}/json-huge`)).rejects.toMatchObject({ reason: "too_large" });
  });

  it("records a non-html response's type with no html", async () => {
    await expect(fetcher.fetchHtml(`${server.origin}/pdf`)).resolves.toEqual({
      url: `${server.origin}/pdf`,
      contentType: "application/pdf",
      html: null,
    });
  });

  it("reports a non-2xx page as http_status", async () => {
    await expect(fetcher.fetchHtml(`${server.origin}/missing`)).rejects.toMatchObject({ reason: "http_status" });
  });

  it("parses a JSON response", async () => {
    await expect(fetcher.fetchJson(`${server.origin}/json`)).resolves.toEqual({ title: "A video" });
  });

  it("refuses a non-2xx JSON response labelled as JSON", async () => {
    await expect(fetcher.fetchJson(`${server.origin}/json-error`)).rejects.toMatchObject({ reason: "http_status" });
  });

  it("refuses a JSON body served as text/plain", async () => {
    await expect(fetcher.fetchJson(`${server.origin}/json-as-text`)).rejects.toMatchObject({ reason: "unsupported_type" });
  });

  it("refuses a redirect to a private address from fetchJson", async () => {
    const target = encodeURIComponent("http://10.0.0.1/");
    await expect(fetcher.fetchJson(`${server.origin}/redirect?to=${target}`)).rejects.toBeInstanceOf(BlockedAddressError);
  });

  it("times out a slow server after 10 s", { timeout: 15_000 }, async () => {
    const started = Date.now();
    const results = await Promise.allSettled([
      fetcher.fetchHtml(`${server.origin}/stall-headers`),
      fetcher.fetchHtml(`${server.origin}/stall-body`),
    ]);
    for (const result of results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(result.reason).toBeInstanceOf(FetchError);
        expect(result.reason).toMatchObject({ reason: "timeout" });
      }
    }
    expect(Date.now() - started).toBeGreaterThanOrEqual(9_900);
  });
});
