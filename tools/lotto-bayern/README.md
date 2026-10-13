# Lotto Bayern bookmarklet

The bookmarklet is a form importer and a client of the app’s existing `/api/generate` endpoint. Number generation stays on the server. It exposes all four app algorithms: `uniform`, `weighted`, `favorites`, and `unpopular`.

## Build and install

```sh
npm run bookmarklet:build
```

Open `public/bookmarklet/install.html` in your browser and drag the installation link to the bookmarks bar. After deployment the same installer is served at `/bookmarklet/install.html`. Click the bookmark on Lotto Bayern’s Eurojackpot Normalschein page.

The generated public files are checked in for review and Gist distribution. Rebuild after editing the bookmarklet source, shared constants, or app theme tokens. Do not hand-edit the generated files.

## Server integration

Generation posts to the configured app origin’s `/api/generate` without cookies. The server middleware permits CORS only for that endpoint and the exact `https://www.lotto-bayern.de` origin. Requests from that origin are restricted to at most 12 standard 5+2 lines; normal app requests retain their system-ticket limits.

**Deploy the updated server before using server generation in the revised bookmarklet.** No app generation algorithms are bundled into the bookmarklet, and there is no silent client-side fallback. Offline imports of pasted numbers still work.

The app URL defaults to the live origin already documented in the project README. You can change it in the bookmarklet panel. Local HTTP origins are accepted for development, although browser mixed-content/private-network rules can prevent an HTTPS Lotto Bayern page from calling localhost.

## Algorithms and limits

- **Uniform:** calls the existing Fisher–Yates generator.
- **Weighted distribution:** calls the existing square-root frequency / Efraimidis–Spirakis sampler. No fixed odd/even or high/low buckets are imposed. Statistics failures follow the server’s uniform fallback.
- **Favourites:** calls the existing favourite generator and uses `FAVORITE_WEIGHT_MULTIPLIER`. Its existing statistics fallback includes favourites that fit, rather than merely boosting their weight. The bookmarklet follows the app’s favourite-count limits.
- **Unpopular:** calls the existing best-of-candidates generator, ranking by raw heuristic score rather than rounded display score. Its weights remain uncalibrated assumptions; the bookmarklet does not present expected prize-share estimates.

All methods use the same server implementation as the simulator. Generation only prepares a preview. Filling the normal ticket editor is a separate action; saving and playing stay manual.

## Imports

```text
4 12 20 27 49 | 2 9
8 16 25 34 46 | 5 11
```

Also accepts the app’s ticket arrays (`mainNumbers` / `euroNumbers`), arrays of seven numbers, `{ fields: [...] }`, `{ tickets: [...] }`, earlier `mains` / `euros` objects, and Lotto Bayern draft payloads. System tickets are rejected rather than silently truncated. Duplicate, incomplete and out-of-range lines are rejected before changing the form.

Undo restores the previous numbers in the last imported field range while the panel stays open. Other fields and ticket options retain their values. Site markup changes may require updating the editor selectors.
