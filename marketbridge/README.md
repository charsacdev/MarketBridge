# MarketBridge

A Deriv-connected social trading platform, built as an **installable web app (PWA)**.
Stage 1 is this static HTML/CSS/JS build; every folder, partial and mock payload is
pre-shaped so Stage 2 (Laravel + Livewire) is a port, not a rewrite.

---

## Run it

Service workers and `fetch()` need HTTP — opening `index.html` from disk will not work.

```bash
# any static server, from this folder
npx serve .          # or: python -m http.server 8000
```

Then open `http://localhost:8000`.

| Route | What it is |
|---|---|
| `/index.html` | Public marketing site |
| `/auth/login.html` | Login → register → connect Deriv |
| `/users/index.html` | Customer app (the PWA `start_url`) |
| `/admin/index.html` | Admin console |

Add `?theme=dark` or `?theme=light` to any URL to force a theme — useful for QA
and screenshots. It is not persisted.

---

## Structure

```
marketbridge/
├── index.html  about  contact  faq            Public site
│   terms  privacy  risk-disclosure  signal-disclaimer
├── offline.html                               Shown when offline
├── manifest.webmanifest  sw.js                PWA: install + offline
│
├── auth/           login · register · forgot-password · connect-deriv
│
├── users/          THE CUSTOMER APP — 35 screens
│   ├── index.html                 Dashboard
│   ├── markets/    index · detail · watchlist
│   ├── trade/      index · accumulators · rise-fall · digits ·
│   │               multipliers · open-contracts · history
│   ├── signals/    index · detail-executable · detail-analysis ·
│   │               compose · provider
│   ├── community/  index · rooms · room · post-detail · compose
│   ├── results/    index · leaderboard
│   ├── resources/  index · detail
│   ├── wallet/     deposit · withdraw · leaving · transfer
│   ├── profile/    index · settings
│   ├── legal/      signal-disclaimer · risk-disclosure · report
│   └── notifications.html · search.html
│
├── admin/          THE ADMIN CONSOLE — 16 screens
│   index · analytics · settings · capabilities
│   users        → user-detail        (profile, trading, transactions,
│                                      rooms, security)
│   signals      → signal-detail      (params, provenance, chart)
│   boosted        community → community-detail
│   resources    → resource-edit      (course editor)
│   markets        reports            transactions
│
├── assets/
│   ├── css/    tokens · base · components · app · public · admin
│   ├── js/core/     icons · util · api · collection · uploads ·
│   │                ws · charts · shell · pwa
│   ├── js/components/  cards.js · datatable.js
│   └── icons/  logo.png + icon.png (brand) and generated PWA icons
│
├── mock/           API fixtures in the EXACT shape Laravel will return
└── _docs/          Original PRD + design mockups
```

---

## The three rules that make Stage 2 mechanical

**1. One file per component.** Every reusable card lives in
`assets/js/components/cards.js` as a template function that maps 1:1 to a Blade
component:

```
MB.card.signalExecutable(s)  ->  resources/views/livewire/signal/card-executable.blade.php
                             ->  app/Modules/Signal/Livewire/CardExecutable.php
                             ->  <livewire:signal.card-executable :signal="$signal" />
```

Keep the kebab-case basename identical at every hop and the mapping needs no lookup table.

**2. Mock JSON matches the future API byte-for-byte.** Pagination envelopes, ISO-8601
timestamps, and the `execution: null` asymmetry are all already correct. Porting is one
line in `assets/js/core/api.js`:

```js
var STAGE = 'mock';   // -> 'live'
```

**3. Zero colour literals outside `assets/css/tokens.css`.** That single file is why both
themes come free. If you are about to write a hex value anywhere else, add a token instead.

---

## Architectural rules enforced in this code

These are not conventions — they are structural, and breaking them takes real effort.

### Executable vs Analysis is a type, not a label

`MB.card.signal()` dispatches on `signal.kind` and nothing else:

- **`executable`** → green card, `Trade This Signal`, opens a pre-filled trade ticket.
  Carries an `execution` object with a `capability_id`.
- **`analysis`** → blue card, `View Market`, routes to the market page.
  Carries `execution: null` and **has no field that could hold a capability**.

The composer (`users/signals/compose.html`) will not even offer the executable form
for a market with no native capabilities.

### The capability registry decides what is tradeable

`mock/capabilities.json` is the single source of truth. Every surface that shows a
trade action resolves against it:

- `users/index.html` — Trade Now cards
- `users/trade/index.html` — module list (non-native families render locked)
- `users/markets/detail.html` — per-market trade options
- `users/signals/compose.html` — which composer is offered
- `admin/capabilities.html` — the operator's view of the whole registry

Unknown or stale capability **fails closed**. In Stage 2 this becomes two tables plus
a `TradeGuard::assertExecutable()` chokepoint in front of every purchase.

### Price data is browser-direct; money goes through the server

`assets/js/core/ws.js` owns one reference-counted socket per tab. With no `app_id`
configured it runs a local simulator that emits realistic Boom/Crash/Volatility ticks,
so the whole UI is drivable with no credentials. Set `MB.ws.config.app_id` to go live —
the public surface (`subscribe` / `request` / `on`) does not change.

Purchases always go through `MB.api.post('trade/purchase', …)` so they can be guarded,
audited and attributed to a signal. They are never sent browser-direct.

### MarketBridge holds no funds

There is no wallet and no balance anywhere in this codebase. The dashboard figure is a
cached read with a visible timestamp that turns amber when stale
(`users/index.html` → `balanceStamp`). Deposit and withdrawal record intent and consent,
then hand off — see `users/wallet/leaving.html`.

---

## PWA / "downloadable"

`manifest.webmanifest` + `sw.js` make this installable and offline-capable.

- **Android / Chrome / Edge** — `beforeinstallprompt`, one tap
- **iPhone / Safari** — no install API exists; `pwa.js` shows the Share → Add to Home Screen sheet
- **Desktop** — install icon in the address bar

Caching strategy in `sw.js`:

| Resource | Strategy |
|---|---|
| App shell (HTML/CSS/JS) | stale-while-revalidate |
| Mock / API data | network-first |
| Images, fonts | cache-first |
| `/api/v1/trade`, `/deriv`, `/payments` | **never cached** |

Stale money is worse than no money — trading endpoints are excluded by rule, and
`offline.html` says so explicitly rather than showing a cached price.

---

## Conventions

- **Shell is data-driven.** Pages carry `data-shell="app|site|admin|auth"`,
  `data-nav`, `data-root`, `data-title`, `data-back`; `shell.js` renders the chrome.
  No nav markup is ever duplicated.
- **Icons** are inline SVG strings in `icons.js`, hydrated from `data-icon="name"`.
  Works from `file://`, from the network, and from the SW cache with no extra request.
- **Charts** are hand-drawn inline SVG in `charts.js` — no library. Seeded PRNG, so a
  given chart is stable across reloads. Colours come from tokens, so they re-theme.
- **Every list has three states** — skeleton, empty, error. `MB.render()` handles all
  three; do not hand-roll a list without them.
- **Numbers use `font-variant-numeric: tabular-nums`** wherever they sit in a column,
  so prices do not jitter on tick updates.


---

## Lists, filters and pagination

Two controllers cover every list in the platform. Neither is a library — both
port straight onto Livewire.

### `MB.collection()` — customer app

```js
var c = MB.collection({
  from: 'signals', into: '#feed', template: MB.card.sig,
  perPage: 8, mode: 'pages',          // or 'more' for a Load more button
  filters: {
    category: function (s, v) { return v === 'all' || s.market.category === v; },
    pair:     function (s, v) { return v === 'all' || s.market.symbol === v; }
  }
});
c.bind('#catChips', 'category').bindSelect('#pairSel', 'pair');
```

Filters compose, pagination resets on every change, and the three list states
(skeleton / empty / error) are built in. In Stage 2 the filter keys become
Livewire public properties and `page` becomes the paginator — the markup does
not change.

### `MB.datatable()` — admin

Sortable columns, live search, per-column filters, rows-per-page, row
selection, export and real pagination. All 10 admin tables run on it.

---

## Market catalogue

49 markets across 6 categories. Every market declares `contract_kinds`, which
is what decides whether a signal on it can be executable at all:

| Kind | Meaning | Executable here |
|---|---|---|
| `binary` | Rise/Fall, Digits, Accumulators | Yes |
| `multiplier` | Multipliers — leveraged, CFD-style | Yes |
| `cfd_mt5` | CFD trading on Deriv MT5 | **No — analysis only** |

That last row is why a trader can post a EUR/USD or BTC/USD CFD idea with
entry, stop and targets: it publishes as analysis with **View Market**, never
as a fake trade button. Forex, crypto, commodities and indices all carry both
species depending on the contract.

Filtering runs **category → pair** everywhere: markets, signals, the signal
composer, the community feed and the room directory.

---

## Rooms and chat

- **One room per market** — 49 of them, auto-derived from the catalogue.
- **Personal trader rooms** — owned by a trader, with a member list. The owner
  can remove any member except themselves; everyone else sees a read-only list.
- **Uploads everywhere** — images and files up to 12 MB, 6 per message, via
  browse, drag-and-drop or paste. `MB.uploads` holds them as object URLs and
  hands `MB.uploads.list()` to the API; Stage 2 swaps in storage keys.

---

## Brand

`assets/icons/logo.png` is the full lockup and `assets/icons/icon.png` is the
mark. Both are used directly, everywhere — `MB.brand()` and `MB.brandMark()`
are the only places that reference them. The PWA icons are generated from the
same mark geometry.


---

## Admin

Sixteen screens. The list pages drill through to detail pages rather than
cramming everything into a row.

| Screen | What it does |
|---|---|
| `users` → `user-detail` | Profile, trading, transaction history, rooms, and security — last IP, location, device, OS, browser, sessions, 2FA, failed logins |
| `signals` → `signal-detail` | Chart, body, execution parameters or analysis levels, and full provenance |
| `boosted` | Impressions, click-through, placement, expiry |
| `community` → `community-detail` | Growth chart, owner and creator, members with removal, block/flag. Manages market (pair) rooms and personal trader rooms together |
| `resources` → `resource-edit` | Upload cover and files, free or paid with a price, and a curriculum builder |
| `markets` | Add and edit markets, including which contract kinds are executable |
| `transactions` | Approval queue for withdrawals, with per-row and bulk approve/reject |
| `reports` | Slide-over review with remove / warn / suspend / ban / dismiss |

Every table is a `MB.datatable()` — sortable columns, live search, per-column
filters, rows-per-page, row selection, export and working pagination.

**Stat sliders.** Pages that have more numbers than fit use a horizontally
scrollable band of stat cards with arrow controls (`statSlider()`), rather than
a grid that truncates.

### Removed deliberately

`admin/partners.html` and `admin/audit-logs.html` were removed at the client's
request, along with their nav entries and fixtures.

---

## Marketing imagery

The homepage and About page use **showcase blocks built from the real product
components** — live market tiles, an actual chat thread with an attachment, the
two signal species side by side, a leaderboard — rather than stock photography.
What a visitor sees before signing up is what they get.

Charts scale properly at every width: candle count is derived from the rendered
pixel width (~13px per candle), strokes use `vector-effect="non-scaling-stroke"`
so they never stretch thin, and charts re-render on resize.

## Not yet built

Bot builder (deferred to post-v1 per the PRD), real Deriv OAuth exchange, and the
Laravel backend. Everything above is wired to the point where those drop in.
