import { crc32, deflateRawSync } from "node:zlib";

export type ZipFile = { name: string; data: Buffer };

// A minimal zip writer (deflate, no zip64): enough for an extension's few small
// files without adding a dependency or needing a zip tool on the build machine.
const UTF8_NAMES = 0x0800;
const DEFLATE = 8;
const VERSION = 20;
// Every entry is stamped 1980-01-01 00:00 (the DOS epoch), so a rebuild gives the same bytes.
const DOS_TIME = 0;
const DOS_DATE = (1 << 5) | 1;

type Packed = { name: Buffer; crc: number; size: number; deflated: Buffer; offset: number };

function localHeader(entry: Packed): Buffer {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(VERSION, 4);
  header.writeUInt16LE(UTF8_NAMES, 6);
  header.writeUInt16LE(DEFLATE, 8);
  header.writeUInt16LE(DOS_TIME, 10);
  header.writeUInt16LE(DOS_DATE, 12);
  header.writeUInt32LE(entry.crc, 14);
  header.writeUInt32LE(entry.deflated.length, 18);
  header.writeUInt32LE(entry.size, 22);
  header.writeUInt16LE(entry.name.length, 26);
  return Buffer.concat([header, entry.name]);
}

function centralHeader(entry: Packed): Buffer {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(VERSION, 4);
  header.writeUInt16LE(VERSION, 6);
  header.writeUInt16LE(UTF8_NAMES, 8);
  header.writeUInt16LE(DEFLATE, 10);
  header.writeUInt16LE(DOS_TIME, 12);
  header.writeUInt16LE(DOS_DATE, 14);
  header.writeUInt32LE(entry.crc, 16);
  header.writeUInt32LE(entry.deflated.length, 20);
  header.writeUInt32LE(entry.size, 24);
  header.writeUInt16LE(entry.name.length, 28);
  header.writeUInt32LE(entry.offset, 42);
  return Buffer.concat([header, entry.name]);
}

function endOfDirectory(count: number, size: number, offset: number): Buffer {
  const record = Buffer.alloc(22);
  record.writeUInt32LE(0x06054b50, 0);
  record.writeUInt16LE(count, 8);
  record.writeUInt16LE(count, 10);
  record.writeUInt32LE(size, 12);
  record.writeUInt32LE(offset, 16);
  return record;
}

export function zipFiles(files: readonly ZipFile[]): Buffer {
  const locals: Buffer[] = [];
  const packed: Packed[] = [];
  let offset = 0;
  for (const file of files) {
    const entry = { name: Buffer.from(file.name), crc: crc32(file.data), size: file.data.length, deflated: deflateRawSync(file.data), offset };
    const local = Buffer.concat([localHeader(entry), entry.deflated]);
    locals.push(local);
    packed.push(entry);
    offset += local.length;
  }
  const directory = Buffer.concat(packed.map(centralHeader));
  return Buffer.concat([...locals, directory, endOfDirectory(packed.length, directory.length, offset)]);
}
