# Erogram — Canonical translation spec

Generated: 2026-06-30

## Instructions for translation AI

Return JSON — one object per **id** below:

```json
{ "id": "groups", "en": "/groups", "de": "/de/gruppen", "es": "/es/grupos" }
```

Rules:
- Domain is always `erogram.pro` — paths only, no domain in output.
- EN = no prefix. DE = `/de/...`. ES = `/es/...`.
- `{placeholders}` = dynamic values — **never translate** (keep literal in all locales).
- Country/category/slug values inside placeholders stay English unless strong SEO reason.

## Out of scope — skip entirely

| Why | Routes |
| --- | --- |
| English-only | /blog, /blog/*, /ainsfw, /ainsfw/* |
| Admin | /admin/*, /OF/*, /advert/* |
| Auth | /login, /profile, /my-listings, /auth/*, /ofm/*, /join-erogram |
| Noindex checkout | /premium, /premium10, /premium15 |
| OF creator profiles | /{username}-onlyfans, /onlyfans/{creator} |
| DB content slugs | /{slug} (~360 groups + ~23 bots — slug is the listing name, not translated) |

---

## A. Static pages (23 rows)

| id | en | hint |
| --- | --- | --- |
| home | / | homepage |
| groups | /groups | telegram groups hub |
| bots | /bots | telegram bots hub |
| best-tg | /best-telegram-groups | best telegram groups hub |
| add | /add | submit listing hub |
| add-bot | /add/bot | submit bot |
| add-group | /add/group | submit group |
| add-thank-you | /add/thank-you | submit confirmation |
| about | /about | about |
| terms | /terms | terms |
| privacy | /privacy | privacy |
| contact | /contact | contact |
| submit | /submit | submit redirect |
| advertise | /advertise | advertise landing |
| advertisers | /advertisers | advertisers landing |
| ofmediakit | /ofmediakit | OF media kit |
| trending | /trending | trending hub |
| top100 | /top100 | top 100 |
| home1 | /home1 | alt homepage |
| premiumvault | /premiumvault | premium vault teaser |
| ai-nsfw-listings | /ai-nsfw-listings | AI listings |
| welcome | /welcome | welcome |
| best-of-creators | /best-onlyfans-creators | legacy OF hub |

---

## B. Repeating patterns (6 rows — one translation each)

| id | en pattern | example en | scale | translate segments |
| --- | --- | --- | --- | --- |
| tg-best-cat | /best-telegram-groups/{category} | /best-telegram-groups/amateur | 123 categories | best-telegram-groups |
| tg-best-country | /best-telegram-groups/country/{country} | /best-telegram-groups/country/germany | 100 countries | best-telegram-groups, country |
| groups-page | /groups/page/{n} | /groups/page/2 | dynamic | groups, page |
| groups-country | /groups/country/{country} | /groups/country/Germany | 100 countries | groups, country |
| bots-page | /bots/page/{n} | /bots/page/2 | dynamic | bots, page |
| bots-country | /bots/country/{country} | /bots/country/Germany | 100 countries | bots, country |

---

## C. OnlyFans (4 rows)

| id | en | example | translate | live reference (do not copy blindly) |
| --- | --- | --- | --- | --- |
| of-hub | /onlyfanssearch | — | hub segment | DE: /de/onlyfans-suche · ES: /es/onlyfans-busca |
| of-top | /Toponlyfanscreators | — | full path or keep EN | same URL all locales today |
| of-cat-vanity | /{cat}onlyfans | /blondeonlyfans | onlyfans suffix? (28 cats) | DE: /de/onlyfans-suche/{cat} · ES: /es/onlyfans-busca/{cat} |
| of-best-of | /onlyfanssearch/hottest-{slug}-onlyfans-models | hottest-latina-onlyfans-models | onlyfanssearch, hottest, onlyfans-models | 137 slug variants — {slug} stays EN |

**{cat} / {slug} values (keep English):** asian, blonde, teen, milf, amateur, redhead, goth, petite, big-ass, big-boobs, brunette, latina, ahegao, alt, cosplay, streamer, fitness, joi, lesbian, tattoo, curvy, ebony, feet, lingerie, thick, twerk, squirt, piercing — plus 137 best-of slugs (latina, nude, fetish, texas, california, …).

---

## D. Segment glossary (optional — translate once, reuse)

| segment | used in |
| --- | --- |
| groups | A, B |
| bots | A, B |
| best-telegram-groups | A, B |
| country | B |
| page | B |
| onlyfanssearch | C |
| onlyfans | C (vanity suffix) |

---

## Expected JSON output

```json
[
  { "id": "home", "en": "/", "de": "/de/", "es": "/es/" },
  { "id": "groups", "en": "/groups", "de": "/de/gruppen", "es": "/es/grupos" },
  { "id": "tg-best-cat", "en": "/best-telegram-groups/{category}", "de": "/de/beste-telegram-gruppen/{category}", "es": "/es/mejores-grupos-telegram/{category}" }
]
```

Total rows to translate: **33** (23 static + 6 patterns + 4 OF).

We apply your JSON in middleware + alternates.canonical.
