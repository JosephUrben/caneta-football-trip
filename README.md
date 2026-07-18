# Caneta Football — My Football Trip

A mobile-first, installable and offline-friendly customer companion for approved Caneta Football trips.

## Product proposition

**Caneta Football turns a match into a complete cultural trip.**

The public Caneta website attracts, informs and converts football travellers. This companion delivers the final reviewed product: the matchday plan, itinerary, football map, saved places, spending and local guide.

The product is deliberately not a live-scores app, ticket marketplace or unrestricted itinerary generator.

## Companion screens

- **Home:** trip-stage dashboard, countdown, fixture, preparation, spending and next action.
- **Matchday:** fixture, recommended arrival, timeline, ticket/entry checklist, primary and backup transport, supporter context and safety verification.
- **Trip:** complete day-by-day route with fixed, suggested, optional, food and practical activities.
- **Football Map:** approved stadiums, museums, football history, fan culture, food, shops and alternatives.
- **Saved:** local shortlist, personal notes and data export.
- **Budget:** natural-language expense entry, home/local currencies, category summaries, CSV export and local storage.
- **Guide:** football culture, phrases, ticket principles, practical information, preparation and data controls.

## Customer-specific URLs

The default demonstration loads from `data/trip.json`.

Additional reviewed trips can be stored in `data/journeys/` and opened with:

```text
https://josephurben.github.io/caneta-football-trip/?trip=CFT-DEMO-BA-001
```

Trip IDs accept letters, numbers, hyphens and underscores only.

## Deliberate MVP limits

- No accounts, passwords or cross-device sync.
- No live AI, fixture, ticket, opening-hours, weather or transport APIs.
- No ticket sale or payment inside the companion.
- No promise that a ticket, fixture, entrance or route is valid without current human verification.
- No secure passport, medical, payment-card or private-document storage.
- External maps handle live navigation.

Saves, progress, checklists, notes and budget records remain in the current browser. The traveller can export them.

## Local preview

Run a local web server from the repository root:

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

A service worker will not work when `index.html` is opened directly as a file.

## Publishing

GitHub Pages should use **GitHub Actions** as its source. Every push to `main` runs `.github/workflows/pages.yml`.

Increase `CACHE_VERSION` in `sw.js` whenever core cached files change.

## Production workflow

```text
Tally trip brief
      ↓
Customer operations database
      ↓
Caneta master football database
      ↓
AI-assisted structured draft
      ↓
Human itinerary and route review
      ↓
Fixture, ticket, access, transport and safety recheck
      ↓
Customer JSON + Google My Maps
      ↓
Published companion URL
      ↓
Email delivery
```

Read `TRIP-SCHEMA.md` and `AI-TRIP-PROMPT.md` before producing a customer trip.
