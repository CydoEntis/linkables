import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { zipFiles } from "./zip";

type Entry = { name: string; data: Buffer };

// Reads entries back through the central directory, as unzip and Chrome do.
function readZip(zip: Buffer): Entry[] {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const entries: Entry[] = [];
  for (let i = 0; i < count; i += 1) {
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extraLength = zip.readUInt16LE(at + 30);
    const commentLength = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLength);
    const dataStart = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const raw = zip.subarray(dataStart, dataStart + size);
    entries.push({ name, data: method === 8 ? inflateRawSync(raw) : raw });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

describe("zipFiles", () => {
  it("holds every file under its path with its contents", () => {
    const files = [
      { name: "manifest.json", data: Buffer.from('{"manifest_version":3}') },
      { name: "assets/popup.js", data: Buffer.from("console.log('hi');".repeat(50)) },
    ];
    expect(readZip(zipFiles(files))).toEqual(files);
  });

  it("holds an empty file", () => {
    const files = [{ name: "empty.txt", data: Buffer.alloc(0) }];
    expect(readZip(zipFiles(files))).toEqual(files);
  });

  it("gives the same bytes for the same files, so a rebuild changes nothing", () => {
    const files = [{ name: "a.txt", data: Buffer.from("a") }];
    expect(zipFiles(files).equals(zipFiles(files))).toBe(true);
  });
});
