# Prompt for converting an approved Caneta itinerary into the app format

Use this only after the itinerary has been reviewed by Caneta Football.

```text
Convert the approved Caneta Football itinerary below into valid JSON that follows the supplied TRIP-SCHEMA.md structure.

Requirements:
- Return JSON only, with no markdown fences or explanation.
- Keep every factual statement faithful to the approved itinerary.
- Do not invent fixtures, tickets, clubs, stadium entrances, prices, opening hours, routes, transport, access rules, safety conditions or verification dates.
- Where information is missing, write "Confirm before publication" rather than guessing.
- Set "demo" to false only when Caneta has approved the customer-facing content.
- Give every day, activity and place a unique stable ID.
- Link scheduled activities to approved places using placeId.
- Use ISO dates and 24-hour times.
- Distinguish fixed, suggested, optional, food and practical-task activities.
- Build a dedicated match object with timeline, checklist, ticket/entry information, primary and backup transport, supporter advice, safety note and verification.
- Separate cultural context from operational match guidance.
- Include realistic reviewed travel times and route logic.
- Keep descriptions concise and readable on a mobile phone.
- Add only relevant Football Map tags defined in TRIP-SCHEMA.md.
- Use affiliates only where the approved itinerary includes them, and never let an affiliate link replace an official safety or access source.
- Do not include passport information, medical details, payment data, private booking documents or API keys.

APPROVED ITINERARY:
[PASTE THE APPROVED ITINERARY HERE]
```
