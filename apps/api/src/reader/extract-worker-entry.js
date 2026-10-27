// A worker thread starts without the TypeScript loader when the parent is not
// run through tsx (Vitest), so this plain module registers it before loading
// the worker. Under tsx (dev and the production image) registering again is harmless.
import { register } from "tsx/esm/api";

register();
await import("./extract-worker.ts");
