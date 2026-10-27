# Third-party notices

Linkables source is licensed under AGPL-3.0-only. This license does not replace
the licenses of dependencies, bundled fonts, or other third-party material.

The application uses React, Vite, Hono, Drizzle, Better Auth, libSQL, TanStack,
Zod, Base UI, Tailwind CSS, Lucide, Mozilla Readability, and other packages listed
in the package manifests and pinned lockfile. Their license and copyright files
remain in installed packages. Release builds copy dependency notices into a
`licenses` directory in the web bundle and extension packages. Keep these notices
when redistributing packages or building a derived distribution.

The bundled Familjen Grotesk, IBM Plex Mono, and Unbounded fonts are distributed
through Fontsource. Preserve the fonts' SIL Open Font License notices supplied
with those packages. Lucide icons retain their ISC license.

For the installed dependency inventory, run:

```sh
pnpm licenses list --json
```

Inspect each workspace's installed dependencies when preparing a distribution.
This document is an index to upstream notices, not a relicensing of those works.
