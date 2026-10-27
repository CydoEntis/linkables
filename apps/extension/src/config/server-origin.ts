import { z } from "zod";

export const serverOriginSchema = z.string().trim().transform((value) => value.replace(/\/+$/, "")).pipe(
  z.url().refine((value) => {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
    return !url.username && !url.password && url.origin === value && (url.protocol === "https:" || (url.protocol === "http:" && local));
  }, "Enter an HTTPS server address without a path, such as https://linkables.example.com."),
);

export function hostPermission(origin: string): string {
  const url = new URL(origin);
  return `${url.protocol}//${url.hostname}/*`;
}
