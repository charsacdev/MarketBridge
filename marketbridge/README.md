# VYBE by MarketBridge

*Trade Deriv. Connect. Learn. Win together.*

A Deriv-connected social trading platform, built as an **installable web app (PWA)**.
Stage 1 is this static HTML/CSS/JS build; every folder, partial and mock payload is
pre-shaped so Stage 2 (Laravel + Livewire) is a port, not a rewrite.

**VYBE** is the product name; **MarketBridge** is the company behind it. The
lockup reads `VYBE` over `BY MARKET BRIDGE`, and copy says "VYBE" wherever the
product is meant.

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

**Dark is the default.** With nothing stored the app renders dark whatever the
OS prefers; Settings offers Light and Auto, and that choice is remembered. Each
page carries a pre-paint snippet so the theme never flashes.

Add `?theme=dark`, `?theme=light` or `?theme=system` to any URL to force a theme
for one load — useful for QA and screenshots. It is not persisted.

> **Checking narrow layouts:** headless Chrome on this setup clamps its layout
> viewport to 548px, so `--window-size=390` renders at 548 and the PNG simply
> crops — which reads as overflow that is not there. Measure narrow layouts by
> loading the page in a sized `<iframe>` and reading `scrollWidth` against
> `clientWidth`; screenshot at 548 or wider.

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
├── users/          THE CUSTOMER APP
│   ├── index.html                 Dashboard
│   ├── markets/    index · detail · watchlist
│   ├── trade/      index · accumulators · rise-fall · digits ·
│   │               multipliers · open-contracts · history
│   ├── signals/    index · detail-executable · detail-analysis ·
│   │               compose · provider
│   ├── community/  index · rooms · room · post-detail · compose
│   ├── results/    index · leaderboard
│   ├── resources/  index · detail
│   ├── wallet/     accounts · account-detail · deposit · withdraw ·
│   │               transfer · history · statement · leaving
│   ├── profile/    index · settings · partner · saved · rewards
│   ├── legal/      signal-disclaimer · risk-disclosure · report
│   └── notifications.html · search.html
│
├── moderator/      CONTENT POLICING — 6 screens
│   index · reports · community → community-detail
│   signals → signal-detail
│
├── admin/          PLATFORM OPERATIONS — 14 screens
│   everything above, plus
│   analytics    users → user-detail   boosted
│   resources → resource-edit          markets   transactions
│
├── superadmin/     OWNS THE PLATFORM — 18 screens
│   everything above, plus
│   staff        (who has access, and the manifest as a comparison)
│   staff-audit  (append-only record of every staff action)
│   capabilities settings
│
├── assets/
│   ├── css/    tokens · base · components · app · public · admin
│   ├── js/core/     icons · util · api · collection · uploads ·
│   │                ws · charts · roles · shell · pwa
│   ├── js/components/  cards.js · datatable.js
│   └── icons/  logo.png + icon.png (brand) and generated PWA icons
│
├── tools/          sync-portals.js · check-links.js
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

### VYBE holds no funds

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

**Every list that can grow is paged.** A list rendered in full is a bug waiting
for the fixture to get bigger, so the rule is: if the row count is not bounded
by the design, it goes through `MB.collection()` (customer app) or
`MB.datatable()` (staff portals).

The exceptions are deliberate and all look the same: a fixed-`limit` teaser
that sits under a heading with a **View all** link — the dashboard's Live
Signals and Community strips, `results/index`'s Recent Results, the profile's
last three signals, the Top Providers rail. Those are previews of a paged page,
not lists in their own right.

Two paging modes, chosen by how the list is read:

- `mode: 'pages'` — numbered pager, for lists you scan and return to
  (trade history, markets, the leaderboard, resources, transaction history)
- `mode: 'more'` — a Load more button, for feeds you read downward
  (signals, community, rooms, comments, a market's tabs, statements)

Filters, search boxes and chip rows bind to the same controller, so the count,
the rows and the pager can never disagree:

```js
var c = MB.collection({ from: 'history', into: '#histList', perPage: 12,
                        mode: 'pages', countInto: '#hCount', ... });
c.bind('#hRange', 'range');        // chip / tab row
c.bindSelect('#mktSort', 'sort');  // <select>
c.bindInput('#resSearch', 'q');    // debounced text input
```

`done(shownRows, filteredRows)` fires on **every** render, empty included, so a
header that summarises the list stays in step with it — `trade/history.html`
computes its Staked / Net P/L / Win rate from the filtered set rather than the
whole fixture, and therefore can never contradict the rows underneath.


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

`MB.brand()` renders the wordmark and `MB.brandMark()` the infinity mark; they
are the only places that reference the artwork, so the lockup changes in one
edit. `assets/icons/logo.png` is the supplied full lockup and
`assets/icons/icon.png` the supplied mark; the PWA icons are generated from the
same geometry.

### The four jobs of red

The palette carries one green and several reds, and they are **not**
interchangeable. `tokens.css` names each job separately so a future edit cannot
collapse them:

| Token | Colour | Job |
|---|---|---|
| `--vy-trade` / `--mb-green` | green | Executable · Buy · Rise · Up · **confirming a trade** |
| `--mb-sell` | red | Sell · Fall · Down · loss · destructive |
| `--vy-brand` | red | Brand CTA · account actions · install · marketing |
| `--mb-analysis` | red | Analysis signals · View Market |

The rule the buttons enforce: **a trade-confirming button is always green, and a
red button never buys.** `btn-trade`, `btn-brand`, `btn-sell` and `btn-analysis`
exist so the intent is visible in the markup rather than inferred from a colour.

`--vy-teal` is the accent in the `V` of the wordmark and is used sparingly for
neutral emphasis — never for a trading direction.

`tokens.css` is the only file in the project that contains a colour value.

### Both colours have to be visible

A trading dashboard where everything is green is not reassuring, it is useless —
the reader learns nothing from a colour that never changes. So the fixtures carry
a realistic spread (about 45% of markets down on the day, signals split roughly
evenly between buy and sell), and the surfaces that summarise them show it:

- market cards, rows and sparklines take their colour from the actual 24h move
- the leaderboard shows rank movement, W/L and P/L, and win rate is only green
  when it beats breakeven
- market chips on posts and room rows carry their pair's direction
- Popular Markets picks one market per category before repeating, rather than
  the first eight rows — which were all volatility indices, and all green


---

## Staff portals

Three portals, cumulative in power. `assets/js/core/roles.js` is the single
manifest: it declares each role's nav and its permission list, and nothing
else states them.

| Portal | Who it is for | Adds over the one before |
|---|---|---|
| `moderator/` | Content policing | Reports, community rooms, signals. No people, money or settings. |
| `admin/` | Day-to-day operations | Users, boosted, resources, markets, transactions, analytics. |
| `superadmin/` | Owns the platform | Staff & Roles, Staff Audit, the capability registry, platform settings. |

### One markup, three portals

The pages are shared. `superadmin/` is the source of truth and
`tools/sync-portals.js` projects the pages each lesser role may open into
`admin/` and `moderator/`, changing only `data-role` on `<body>` and the title.
Behaviour diverges at runtime instead of in the source:

```html
<button data-can="user.suspend">Suspend</button>
```

`applyPermissions()` in `shell.js` **removes** every element whose `data-can`
the current role does not hold, and re-runs after each datatable or collection
render. Removing rather than hiding matters: a hidden control still exists in
the DOM and still reads as an offer.

```bash
node tools/sync-portals.js           # after editing any superadmin/ page
node tools/sync-portals.js --check   # CI: fail if the portals drifted
```

None of this is a security control — it decides what the UI *offers*. Stage 2
enforces the same manifest in Laravel middleware and policies, and the
permission names here are deliberately the names those policies will use.

### Responsive

The rail collapses to a drawer at 1020px. Below that the topbar puts the page
title on its own row and drops its actions to a second one, the subtitle and
the header search are hidden, and filter rows stack. Tables stay tables — they
scroll inside `.dt-scroll`, with a one-line hint underneath, because a clipped
column otherwise reads as a bug.

One thing worth knowing if you touch the grid: the `max-width: 1020px` rule
must use `grid-template-columns: minmax(0, 1fr)`, not `1fr`. A plain `1fr`
track cannot shrink below its content's min-content width, so a single wide
table pushed the whole console past the viewport and everything clipped at the
right edge.

### Screens

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
| `capabilities` | The Deriv capability registry — what is genuinely executable |
| `staff` *(owner)* | Who holds access, their role and 2FA state, and the manifest rendered as a comparison |
| `staff-audit` *(owner)* | Append-only record of every staff action, with severity and IP |

Every table is a `MB.datatable()` — sortable columns, live search, per-column
filters, rows-per-page, row selection, export and working pagination.
`MB.statSlider()` renders the scrollable stat bands; it lives in
`components/datatable.js` rather than being pasted into each page.

The owner account cannot be demoted or disabled from `staff` — that is the one
door the page must not be able to lock behind itself.

### Removed deliberately

`admin/partners.html` and `admin/audit-logs.html` were removed at the client's
request, along with their nav entries and fixtures. The staff audit is a
different thing: it records *staff* actions, not user activity.

Users can never reach a staff portal from the customer app. There is no link,
and Settings does not offer one.

---

## Marketing imagery

The homepage and About page use **showcase blocks built from the real product
components** — live market tiles, an actual chat thread with an attachment, the
two signal species side by side, a leaderboard — rather than stock photography.
What a visitor sees before signing up is what they get.

Charts scale properly at every width: candle count is derived from the rendered
pixel width (~13px per candle), strokes use `vector-effect="non-scaling-stroke"`
so they never stretch thin, and charts re-render on resize.

## The account area

`users/profile/index.html` is the account home: identity with the verified-trader
state, **Total Deriv Balance** summed from the connected accounts (never a stored
number), the account list, quick actions, a performance overview and the user's
own signals and posts. `users/wallet/statement.html` is the full statement behind
it — filter by account, period, entry type or reference, with a running balance
that reconciles to the closing figure at the top.

The design set shows a total of `$4,486.35` above accounts that sum to
`$4,024.95`. This build computes the honest total from the accounts rather than
copying the inconsistent figure.

Three more pages hang off the account drawer:

| Page | What it is |
|---|---|
| `profile/partner.html` | Deriv Partner (IB) status — referral link, funnel, tier progress, payouts. **Deriv pays the commission, not VYBE**, and the page says so |
| `profile/saved.html` | Bookmarked signals, posts, resources and markets. Stores *references* only, so a bookmark can never show a stale copy |
| `profile/rewards.html` | Contribution points and what they redeem for. **Points are not money** — not withdrawable, not transferable, no cash value |

These were linked from the account drawer but never built. They stayed missing
because the old link checker only read `href=` in markup, and the drawer builds
its hrefs in JS. `tools/check-links.js` now reads three kinds of reference —
markup, JS nav manifests, and `MB.api` fixture paths — which is how they, plus a
missing `mock/deriv/connection.json`, were found.

---

## Not yet built

Bot builder (deferred to post-v1 per the PRD), real Deriv OAuth exchange, and the
Laravel backend. Everything above is wired to the point where those drop in.
