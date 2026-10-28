import type { Client, Transaction } from "@libsql/client";

// Native SQLite lock waits block Node's event loop. Queue operations outside a
// transaction so another request cannot block the transaction that must release
// its lock, or accidentally execute inside its snapshot.
export function serializeClient(client: Client) {
  let tail = Promise.resolve();
  async function reserve() {
    const previous = tail;
    const gate = Promise.withResolvers<undefined>();
    tail = gate.promise;
    await previous;
    return () => { gate.resolve(undefined); };
  }

  async function schedule<T>(run: () => Promise<T>): Promise<T> {
    const release = await reserve();
    try { return await run(); } finally { release(); }
  }

  function heldTransaction(transaction: Transaction, release: () => void): Transaction {
    return new Proxy(transaction, {
      get(target, property) {
        if (property === "commit" || property === "rollback") {
          return async () => {
            try { await target[property](); } finally { release(); }
          };
        }
        if (property === "close") return () => { try { target.close(); } finally { release(); } };
        const value: unknown = Reflect.get(target, property, target);
        const bound: unknown = typeof value === "function" ? value.bind(target) : value;
        return bound;
      },
    });
  }

  const wrapped = new Proxy(client, {
    get(target, property) {
      if (property === "transaction") {
        return async (mode?: "write" | "read" | "deferred") => {
          const release = await reserve();
          try { return heldTransaction(await target.transaction(mode), release); }
          catch (error) { release(); throw error; }
        };
      }
      if (property === "execute") return (...args: Parameters<Client["execute"]>) => schedule(() => target.execute(...args));
      if (property === "batch") return (...args: Parameters<Client["batch"]>) => schedule(() => target.batch(...args));
      if (property === "migrate") return (...args: Parameters<Client["migrate"]>) => schedule(() => target.migrate(...args));
      if (property === "executeMultiple") return (...args: Parameters<Client["executeMultiple"]>) => schedule(() => target.executeMultiple(...args));
      const value: unknown = Reflect.get(target, property, target);
      const bound: unknown = typeof value === "function" ? value.bind(target) : value;
        return bound;
    },
  });
  return { client: wrapped, close: async () => { await tail; client.close(); } };
}
