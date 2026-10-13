# Lotto Bayern bookmarklet

A bookmark that enters tickets from the EuroJackpot Simulator into Lotto Bayern’s Eurojackpot Normalschein. It is a third program next to the app and the server: it runs on Lotto Bayern’s page, inside the user’s own browser session.

It only fills in the form. It never picks numbers, and it never saves, submits or pays for a ticket.

## How the pieces fit

```
app (ticket tray)  ──"Fill on Lotto Bayern"──▶  link to the form, lines in the URL fragment
                                                        │
Lotto Bayern form  ◀──bookmark clicked──  bookmarklet reads the lines and fills the fields
```

- **Numbers come from the app.** Generation stays in `/api/generate`, like everywhere else. The bookmarklet has no generator, makes no network requests, and needs no CORS support from the server.
- **The line format is shared.** `app/utils/ticketLines.ts` writes and reads lines such as `4 12 20 27 49 | 2 9`. The app uses it to export tickets, the bookmarklet to import them, so there is one definition of a valid line.
- **Hand-over.** The app’s link carries the lines in the URL fragment (`#eurojackpot=4.12.20.27.49-2.9_…`). A fragment is not sent to Lotto Bayern’s server. If it does not survive, the lines can be pasted; the app has a copy button for that.

## Files

| Path                                   | What it is                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `bookmarklet/src/main.js`              | The panel: paste, preview, fill, undo                                                     |
| `bookmarklet/src/lottoBayernForm.js`   | Everything that touches Lotto Bayern’s page. If the site changes, this is the file to fix |
| `bookmarklet/src/panel.css`            | Panel styles, written with the app’s theme tokens                                         |
| `bookmarklet/build.mjs`                | Bundles the above into `public/bookmarklet/`                                              |
| `app/utils/ticketLines.ts`             | Shared line format, parser and hand-over link (tested in `app/utils/__tests__`)           |
| `app/components/LottoBayernExport.vue` | The “Lotto Bayern” panel in the ticket list                                               |
| `app/pages/bookmarklet.vue`            | Install page, served at `/bookmarklet`                                                    |

## Build

```sh
npm run bookmarklet:build
```

This runs automatically before `npm run dev` and `npm run build`. The output in `public/bookmarklet/` is generated and git-ignored; do not edit or commit it:

- `lotto-bayern-bookmarklet-url.txt`: the `javascript:` URL the install page offers
- `lotto-bayern-bookmarklet.js`: the same code, readable, for review

The panel is injected into a page that cannot load the app’s stylesheet, so the build copies the theme tokens that `panel.css` uses out of `app/assets/css/theme.css`. Renaming a token that the panel uses fails the build with a message naming it.

After changing the bookmarklet, the bookmark has to be installed again: a bookmarklet is a snapshot of the code, not a link to it.

## What it accepts

One line per field, 5 main numbers and 2 Euro numbers:

```
4 12 20 27 49 | 2 9
8 16 25 34 46 | 5 11
```

It also reads JSON: the app’s tickets (`mainNumbers` / `euroNumbers`), bare arrays, the earlier `mains` / `euros` shape and Lotto Bayern’s own draft payload. Nothing pasted is ever evaluated as code.

Only standard 5 + 2 lines fit this form, at most 12 per slip. System tickets are rejected rather than truncated; the app leaves them out of the export and says so.

## Filling

- Lines replace consecutive fields from the chosen start field. Other fields, draw days, duration and add-ons are left alone.
- Each field is filled through the site’s own number editor and read back afterwards. A field that does not end up with the expected numbers stops the run with a message.
- **Undo fill** restores what was in the fields before, for as long as the panel stays open.
- A partly filled field is refused: complete or clear it on the site first.

## Limits

- The form-filling code is written against Lotto Bayern’s markup and has no automated test against the real site. It was last exercised against a local stand-in that reproduces the page structure the code expects.
- It runs only on `https://www.lotto-bayern.de/eurojackpot/normalschein`; anywhere else it shows a hint and stops.
