import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

it("keeps saved links after stopping and restarting the database process", async () => {
  const folder = await mkdtemp(join(tmpdir(), "linkables-persistence-"));
  const url = pathToFileURL(join(folder, "library.db")).href;
  const setup = `import {createDb} from './src/db/client.ts';
    import {migrateDb} from './src/db/migrate.ts';
    import {resource,savedLink} from './src/db/schema.ts';
    const c=createDb(${JSON.stringify(url)});await c.ready;await migrateDb(c.db);`;
  const run = (body: string) => promisify(execFile)(process.execPath, ["--import", "tsx", "--input-type=module", "-e", setup + body]);
  try {
    await run(`try{const [r]=await c.db.insert(resource).values({canonicalUrl:'https://example.com/saved'}).returning();
      await c.db.insert(savedLink).values({userId:crypto.randomUUID(),resourceId:r.id,originalUrl:r.canonicalUrl});}finally{await c.close();}`);
    const { stdout } = await run(`try{process.stdout.write(JSON.stringify({links:await c.db.$count(savedLink),resources:await c.db.$count(resource),integrity:(await c.db.$client.execute('pragma integrity_check')).rows}));}finally{await c.close();}`);
    expect(JSON.parse(stdout)).toEqual({ links: 1, resources: 1, integrity: [{ integrity_check: "ok" }] });
  } finally { await rm(folder, { recursive: true, force: true }); }
});
