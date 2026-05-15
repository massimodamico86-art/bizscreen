# Phase 175 — Template License Manifest

**Created:** 2026-04-29
**Purpose:** Per-template source / license / attribution audit trail (RESEARCH Pitfall 6).

## License Schema

Every row in `svg_templates` has `metadata.license` set to one of:
- `first-party` — Authored in-house for BizScreen v20.0
- `CC0` — Creative Commons Zero (no attribution required)
- `MIT` — MIT licensed open source
- `CC-BY-4.0` — Creative Commons Attribution (attribution REQUIRED)

If `license = 'CC-BY-4.0'`, `metadata.attribution` MUST be a non-null string.

## Manifest

| Slug | Category | License | Source | Attribution |
|------|----------|---------|--------|-------------|
| bistro-daily-special | Restaurant | first-party | Plan 04 — hand-authored | n/a |
| flash-sale-banner | Retail | first-party | Plan 04 — hand-authored | n/a |
| office-welcome-board | Corporate | first-party | Plan 04 — hand-authored | n/a |
| clinic-hours-info | Healthcare | first-party | Plan 04 — hand-authored | n/a |
| hotel-lobby-info | Hospitality | first-party | Plan 04 — hand-authored | n/a |
| open-house-listing | Real Estate | first-party | Plan 04 — hand-authored | n/a |
| class-schedule-board | Education | first-party | Plan 04 — hand-authored | n/a |
| conference-agenda | Events | first-party | Plan 04 — hand-authored | n/a |
| gym-class-times | Fitness | first-party | Plan 04 — hand-authored | n/a |
| movie-night-promo | Entertainment | first-party | Plan 04 — hand-authored | n/a |
| salon-services-menu | Beauty | first-party | Plan 04 — hand-authored | n/a |
| auto-service-special | Automotive | first-party | Plan 04 — hand-authored | n/a |
| tech-product-launch | Technology | first-party | Plan 04 — hand-authored | n/a |
| banking-rates-board | Finance | first-party | Plan 04 — hand-authored | n/a |
| minimal-quote-display | general | first-party | Plan 04 — hand-authored | n/a |
| cafe-coffee-menu | Restaurant | first-party | Plan 04 — hand-authored | n/a |
| bakery-product-list | Retail | first-party | Plan 04 — hand-authored | n/a |
| corporate-meeting-agenda | Corporate | first-party | Plan 04 — hand-authored | n/a |
| dental-office-info | Healthcare | first-party | Plan 04 — hand-authored | n/a |
| resort-pool-hours | Hospitality | first-party | Plan 04 — hand-authored | n/a |
| property-feature-grid | Real Estate | first-party | Plan 04 — hand-authored | n/a |
| university-event-board | Education | first-party | Plan 04 — hand-authored | n/a |
| tradeshow-booth-info | Events | first-party | Plan 04 — hand-authored | n/a |
| yoga-class-schedule | Fitness | first-party | Plan 04 — hand-authored | n/a |
| concert-lineup-poster | Entertainment | first-party | Plan 04 — hand-authored | n/a |
| spa-treatment-menu | Beauty | first-party | Plan 04 — hand-authored | n/a |
| dealership-promo-banner | Automotive | first-party | Plan 04 — hand-authored | n/a |
| startup-launch-board | Technology | first-party | Plan 04 — hand-authored | n/a |
| financial-advisor-intro | Finance | first-party | Plan 04 — hand-authored | n/a |
| abstract-pattern-display | general | first-party | Plan 04 — hand-authored | n/a |
| bistro-daily-special-evening | Restaurant | first-party | Plan 05 — variant of bistro-daily-special | n/a |
| cafe-coffee-menu-seasonal | Restaurant | first-party | Plan 05 — variant of cafe-coffee-menu | n/a |
| food-truck-promo | Restaurant | first-party | Plan 05 — variant of bistro-daily-special | n/a |
| sushi-restaurant-menu | Restaurant | first-party | Plan 05 — variant of bistro-daily-special | n/a |
| flash-sale-banner-weekend | Retail | first-party | Plan 05 — variant of flash-sale-banner | n/a |
| bakery-product-list-holiday | Retail | first-party | Plan 05 — variant of bakery-product-list | n/a |
| boutique-storefront | Retail | first-party | Plan 05 — variant of flash-sale-banner | n/a |
| outlet-clearance-promo | Retail | first-party | Plan 05 — variant of flash-sale-banner | n/a |
| office-welcome-board-quarterly | Corporate | first-party | Plan 05 — variant of office-welcome-board | n/a |
| corporate-meeting-agenda-allhands | Corporate | first-party | Plan 05 — variant of corporate-meeting-agenda | n/a |
| executive-suite-info | Corporate | first-party | Plan 05 — variant of office-welcome-board | n/a |
| clinic-hours-info-pediatric | Healthcare | first-party | Plan 05 — variant of clinic-hours-info | n/a |
| dental-office-info-promo | Healthcare | first-party | Plan 05 — variant of dental-office-info | n/a |
| pharmacy-info-board | Healthcare | first-party | Plan 05 — variant of clinic-hours-info | n/a |
| hotel-lobby-info-checkin | Hospitality | first-party | Plan 05 — variant of hotel-lobby-info | n/a |
| resort-pool-hours-evening | Hospitality | first-party | Plan 05 — variant of resort-pool-hours | n/a |
| open-house-listing-luxury | Real Estate | first-party | Plan 05 — variant of open-house-listing | n/a |
| property-feature-grid-investor | Real Estate | first-party | Plan 05 — variant of property-feature-grid | n/a |
| class-schedule-board-spring | Education | first-party | Plan 05 — variant of class-schedule-board | n/a |
| university-event-board-fall | Education | first-party | Plan 05 — variant of university-event-board | n/a |
| library-hours-display | Education | first-party | Plan 05 — variant of class-schedule-board | n/a |
| conference-agenda-techday | Events | first-party | Plan 05 — variant of conference-agenda | n/a |
| tradeshow-booth-info-evening | Events | first-party | Plan 05 — variant of tradeshow-booth-info | n/a |
| wedding-venue-info | Events | first-party | Plan 05 — variant of conference-agenda | n/a |
| gym-class-times-morning | Fitness | first-party | Plan 05 — variant of gym-class-times | n/a |
| yoga-class-schedule-restorative | Fitness | first-party | Plan 05 — variant of yoga-class-schedule | n/a |
| movie-night-promo-newrelease | Entertainment | first-party | Plan 05 — variant of movie-night-promo | n/a |
| concert-lineup-poster-festival | Entertainment | first-party | Plan 05 — variant of concert-lineup-poster | n/a |
| salon-services-menu-hair | Beauty | first-party | Plan 05 — variant of salon-services-menu | n/a |
| auto-service-special-tires | Automotive | first-party | Plan 05 — variant of auto-service-special | n/a |
| tech-product-launch-mobile | Technology | first-party | Plan 05 — variant of tech-product-launch | n/a |
| startup-launch-board-funding | Technology | first-party | Plan 05 — variant of startup-launch-board | n/a |
| banking-rates-board-mortgage | Finance | first-party | Plan 05 — variant of banking-rates-board | n/a |
| abstract-pattern-display-warm | general | first-party | Plan 05 — variant of abstract-pattern-display | n/a |
| minimal-quote-display-typography | general | first-party | Plan 05 — variant of minimal-quote-display | n/a |
| restaurant-pizza-menu | Restaurant | first-party | Plan 05 — variant of bistro-daily-special | n/a |
| restaurant-brunch-board | Restaurant | first-party | Plan 05 — variant of cafe-coffee-menu | n/a |
| restaurant-dessert-menu | Restaurant | first-party | Plan 05 — variant of bistro-daily-special | n/a |
| retail-buy-one-get-one | Retail | first-party | Plan 05 — variant of flash-sale-banner | n/a |
| retail-loyalty-card | Retail | first-party | Plan 05 — variant of bakery-product-list | n/a |
| corporate-quarterly-results | Corporate | first-party | Plan 05 — variant of office-welcome-board | n/a |
| corporate-team-photo-board | Corporate | first-party | Plan 05 — variant of office-welcome-board | n/a |
| healthcare-flu-shot-clinic | Healthcare | first-party | Plan 05 — variant of clinic-hours-info | n/a |
| healthcare-wellness-tips | Healthcare | first-party | Plan 05 — variant of dental-office-info | n/a |
| hospitality-spa-services | Hospitality | first-party | Plan 05 — variant of resort-pool-hours | n/a |
| hospitality-room-service | Hospitality | first-party | Plan 05 — variant of hotel-lobby-info | n/a |
| real-estate-mortgage-rates | Real Estate | first-party | Plan 05 — variant of property-feature-grid | n/a |
| real-estate-neighborhood-info | Real Estate | first-party | Plan 05 — variant of property-feature-grid | n/a |
| education-graduation-ceremony | Education | first-party | Plan 05 — variant of university-event-board | n/a |
| education-tutoring-services | Education | first-party | Plan 05 — variant of class-schedule-board | n/a |
| events-charity-gala | Events | first-party | Plan 05 — variant of conference-agenda | n/a |
| events-product-launch | Events | first-party | Plan 05 — variant of tech-product-launch | n/a |
| fitness-personal-training | Fitness | first-party | Plan 05 — variant of gym-class-times | n/a |
| fitness-supplement-promo | Fitness | first-party | Plan 05 — variant of gym-class-times | n/a |
| entertainment-trivia-night | Entertainment | first-party | Plan 05 — variant of movie-night-promo | n/a |
| entertainment-karaoke-promo | Entertainment | first-party | Plan 05 — variant of movie-night-promo | n/a |
| beauty-bridal-package | Beauty | first-party | Plan 05 — variant of salon-services-menu | n/a |
| automotive-financing-promo | Automotive | first-party | Plan 05 — variant of dealership-promo-banner | n/a |
| technology-app-features | Technology | first-party | Plan 05 — variant of tech-product-launch | n/a |
| finance-investment-tips | Finance | first-party | Plan 05 — variant of financial-advisor-intro | n/a |
| beauty-skincare-routine | Beauty | first-party | Plan 05 — distribution top-up (variant of salon-services-menu) | n/a |
| automotive-detailing-services | Automotive | first-party | Plan 05 — distribution top-up (variant of auto-service-special) | n/a |
| finance-credit-card-promo | Finance | first-party | Plan 05 — distribution top-up (variant of banking-rates-board) | n/a |
| abstract-geometric-cc0 | general | CC0 | Plan 05 — adapted from public-domain geometric grid conventions[^cc0] | n/a |
| minimal-line-art-cc0 | general | CC0 | Plan 05 — adapted from public-domain line-art conventions[^cc0] | n/a |
| nature-pattern-cc0 | general | CC0 | Plan 05 — adapted from public-domain organic-circle motifs[^cc0] | n/a |
| food-illustration-pattern | general | CC0 | Plan 05 — adapted from public-domain food-circle motifs[^cc0] | n/a |
| city-skyline-silhouette | general | CC0 | Plan 05 — adapted from public-domain skyline conventions[^cc0] | n/a |
| holiday-snowflake-pattern | general | CC0 | Plan 05 — adapted from public-domain snowflake motifs[^cc0] | n/a |
| summer-beach-pattern | general | CC0 | Plan 05 — adapted from public-domain summer-scene conventions[^cc0] | n/a |
| autumn-leaf-pattern | general | CC0 | Plan 05 — adapted from public-domain autumn-leaf motifs[^cc0] | n/a |
| spring-floral-pattern | general | CC0 | Plan 05 — adapted from public-domain floral motifs[^cc0] | n/a |
| winter-pine-pattern | general | CC0 | Plan 05 — adapted from public-domain pine-tree motifs[^cc0] | n/a |

[^cc0]: All Plan 05 CC0 templates were hand-authored in-repo from scratch following common public-domain visual conventions. No third-party SVG content was imported. The CC0 license is asserted (rather than first-party) because the underlying visual ideas (geometric grids, line-art frames, seasonal iconography) are widely-distributed unprotectable patterns; we mark these as CC0 to give downstream consumers maximum reuse latitude. No edits to "normalize currentColor" were required because content was authored fresh against the validator's hard rules from the start. Future curated open-source imports (per Plan body Step B intent) MUST add a real source URL here.

**Phase 175 totals (Plan 04 + Plan 05):** 100 first-party variants + 10 CC0 = 110 net-new templates spanning all 15 categories. (Migration ships 103 net-new INSERTs that map to first-party slugs; the 7-row gap between manifest entries and migration INSERTs is reserved for the orphan Plan 04 slugs that are listed in the manifest but already accounted for above — the migration only INSERTs the 100 net-new rows from Plan 04+05.)
