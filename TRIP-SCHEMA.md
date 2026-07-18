# Caneta Football trip JSON guide

The companion uses schema version 1. The default demonstration is `data/trip.json`. Published journeys can be stored in `data/journeys/` and loaded with `?trip=TRIP-ID`.

## Core fields

```json
{
  "schemaVersion": 1,
  "journeyId": "CFT-0001",
  "productType": "Caneta Personalised Football Trip",
  "demo": false,
  "travellerName": "First name",
  "destination": "Destination",
  "tripTitle": "Trip title",
  "subtitle": "Theme or regions",
  "startDate": "2026-11-12",
  "endDate": "2026-11-16",
  "timezone": "America/Argentina/Buenos_Aires",
  "currency": "ARS",
  "homeCurrency": "GBP",
  "intro": "Customer-facing introduction",
  "routeOverview": "Why the whole route works",
  "match": {},
  "days": [],
  "places": []
}
```

Use ISO dates and 24-hour times.

## Match object

Required:

- `homeTeam`
- `awayTeam`
- `competition`
- `date`
- `kickoff`
- `stadium`
- `ticketStatus`
- `recommendedArrival`
- `timeline`
- `checklist`
- `transport`
- `supporterAdvice`
- `safetyNote`
- `verification`

Recommended:

- `stand`
- `entrance`
- `idRequirement`
- `bagRule`

The customer version must never imply that Caneta has validated a ticket unless that validation genuinely occurred through an authorised process.

## Day and activity

Each day requires:

- `id`
- `date`
- `location`
- `theme`
- `summary`
- `routeLogic`
- `activities`

Each activity requires a unique stable `id`, `title` and `type`.

Supported types:

- `fixed`
- `suggested`
- `optional`
- `food`
- `task`

Activities may also contain:

- `placeId`
- `time`
- `description`
- `duration`
- `travelTime`
- `cost`
- `address`
- `latitude`
- `longitude`
- `mapUrl`
- `practicalNote`
- `alternative`
- `verification`

## Football places

Each approved place should contain:

- `id`
- `name`
- `destination`
- `neighbourhood`
- `category`
- `footballSignificance`
- `description`
- coordinates or `mapUrl`
- `practicalNote`
- `tags`
- `scheduled`
- `active`

Recommended additional production fields:

```json
{
  "clubConnections": [],
  "visitorSuitability": "",
  "matchdaySuitability": "",
  "accessNotes": "",
  "safetyNotes": "",
  "officialUrl": "",
  "affiliateUrl": "",
  "verifiedAt": ""
}
```

Supported prototype tags include:

- `in-trip`
- `before-match`
- `after-match`
- `stadium`
- `history`
- `fan-culture`
- `food`
- `shopping`
- `free`
- `rainy-day`

## Supporting data

The companion also accepts:

- `accommodation`
- `preparationChecklist`
- planned `budget`
- `map`
- `guideSections`
- `practicalInfo`
- `emergencyInfo`

## Publication rules

- Use only approved places and reviewed route information.
- Never invent a fixture, ticket, entrance, price, opening time, access rule, transport connection or safety claim.
- State clearly when information requires confirmation.
- Keep match operational information separate from cultural interpretation.
- Recheck fixture, ticket, access, transport and supporter conditions closest to the match.
- Do not include passport numbers, payment-card details, medical records or private documents.
- Keep IDs stable so local saves and notes still match after an update.
