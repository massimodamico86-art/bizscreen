/**
 * scripts/seedTopics.js — Phase 178 Plan 07 (D-13, D-14, D-15).
 *
 * Curated topic records driving the Phase 178 vertical-content seeding waves.
 * The file is the repo-reviewed source of truth for "what does a good
 * <vertical> <template_type> look like?" — every record carries the full
 * D-15 11-field shape so the seed script (scripts/seed-vertical-templates.cjs)
 * can drive the EF action=generate handler with a concrete style brief per
 * topic (Pitfall 2 mitigation — anti-aesthetic-convergence diversity).
 *
 * D-04 over-generation buffer: target ≥120 records per vertical (1.5× the ≥80
 * SC floor) so the post-cull harvest still clears the SC bar.
 * D-13: vertical assignment is fixed at the topic level (NOT cross-vertical).
 * D-14: each row carries explicit palette / vibe / layout signals to drop the
 *       LLM into a different stylistic neighborhood per attempt.
 * D-15: schema shape is locked verbatim — slug, name, description, tags[],
 *       topic, palette, vibe, layout, vertical, template_type, orientation.
 *
 * Diversity guidelines (per (vertical, template_type) cell):
 *   ≥4 distinct palettes, ≥3 distinct vibes, ≥3 distinct layouts
 * Hero-type both-orientation coverage (TCAT-02): each hero cell ships ≥4
 * landscape AND ≥4 portrait records.
 *
 * Slug naming convention drops Pitfall-3 (slug collision with existing
 * svg_templates.slug) risk to nearly zero by always suffixing the orientation:
 *   `<short-vertical-prefix>-<cell-keyword>-<style-keyword>-<idx>-<orient>`
 *
 * Authoring strategy: programmatic factories assemble each cell's records
 * from per-cell palette/vibe/layout pools. The result is reviewable-as-data
 * (a single JS array of plain objects) AND scalable to ~360+ records without
 * 5000-line hand-typing.
 *
 * Validation: load-time invariants are asserted at module load (see assert
 * block at the bottom). The seed script ALSO re-validates at file-load time
 * before invoking the EF (defense-in-depth).
 *
 * Schema test: tests/integration/seedTopics.schema.test.js (Plan 01 RED →
 * GREEN once this file ships).
 */

// ESM module (package.json `type: "module"`). The schema test uses
// `createRequire(import.meta.url)` then `req('scripts/seedTopics.js')`; under
// Node 22+ this returns the ESM module namespace, with `default` and named
// exports available. The test reads `mod.seedTopics || mod.default || mod`,
// so we expose all three shapes.

// ----- D-15 schema invariants (mirrored in test file) -----
const VERTICALS = ['restaurants', 'retail', 'healthcare'];
const ORIENTATIONS = ['landscape', 'portrait'];
const REQUIRED_KEYS = [
  'slug',
  'name',
  'description',
  'tags',
  'topic',
  'palette',
  'vibe',
  'layout',
  'vertical',
  'template_type',
  'orientation',
];

// templateTypesPerVertical — duplicated locally so this file is self-contained
// at module load. Plan 04's promptLibrary export is the source of truth; this
// copy MUST track it and any divergence is a bug. Tests/integration cross-check.
const TEMPLATE_TYPES_PER_VERTICAL = {
  restaurants: [
    'menu', 'daypart_menu', 'daily_special', 'announcement', 'social_proof',
    'queue_status', 'seasonal_campaign', 'hours_loyalty_drive_thru',
    'drive_thru', 'promo', 'reminder', 'wayfinding',
  ],
  retail: [
    'flash_sale', 'new_arrivals', 'product_spotlight', 'seasonal_campaign',
    'social_proof_ugc', 'loyalty_rewards', 'wayfinding', 'hours_window',
    'promo', 'announcement', 'reminder',
  ],
  healthcare: [
    'waiting_room_ambient', 'queue_status', 'health_tip', 'reminder',
    'provider_directory', 'vaccination_reminder', 'emergency_alert',
    'clinic_hours_pharmacy', 'announcement', 'wayfinding',
  ],
};

// ----- Palette pools (per vertical) -----
// Each pool has ≥6 entries to guarantee ≥4 distinct palettes per cell.
const PALETTES = {
  restaurants: [
    'warm-amber', 'sunset-coral', 'deep-burgundy', 'forest-sage',
    'rustic-terracotta', 'midnight-indigo', 'cream-and-gold', 'olive-and-cream',
    'charcoal-and-amber', 'paprika-red',
  ],
  retail: [
    'midnight-black', 'electric-coral', 'pastel-mint', 'bold-magenta',
    'warm-cream', 'cobalt-blue', 'soft-lavender', 'sunshine-yellow',
    'forest-and-rose', 'monochrome-noir',
  ],
  healthcare: [
    'soft-sage', 'dusty-blue', 'warm-cream', 'muted-lavender',
    'pale-sky', 'sand-and-mint', 'gentle-rose', 'deep-teal',
    'amber-and-cream', 'safety-amber-red', // amber-red ONLY for emergency_alert
  ],
};

// ----- Vibe pools -----
const VIBES = {
  restaurants: [
    'casual-bistro', 'fine-dining', 'family-friendly', 'craft-tavern',
    'street-food', 'farmhouse-cozy', 'beachfront-relaxed', 'urban-bustle',
  ],
  retail: [
    'boutique-elegant', 'flash-urgent', 'lifestyle-aspirational', 'streetwear-bold',
    'minimalist-clean', 'home-comfort', 'tech-modern', 'family-friendly',
  ],
  healthcare: [
    'calm-reassuring', 'clinical-trust', 'family-warm', 'modern-clean',
    'community-care', 'pediatric-bright', 'senior-friendly', 'urgent-clear',
  ],
};

// ----- Layout pools -----
const LAYOUTS = [
  'left-aligned-with-divider', 'centered-hero-stack', 'three-column-grid',
  'right-anchored-callout', 'top-banner-with-rows', 'split-half-canvas',
  'asymmetric-hero', 'tile-grid-2x2', 'tile-grid-3x3', 'header-strip-rows',
  'side-by-side-cards', 'minimal-floating', 'vertical-stack', 'left-arrow-cell',
];

// ----- Helpers -----
function pick(arr, i) {
  return arr[i % arr.length];
}

function tagify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function slugFor(verticalPrefix, cellKeyword, styleKeyword, idx, orient) {
  return [
    verticalPrefix,
    tagify(cellKeyword),
    tagify(styleKeyword),
    String(idx).padStart(2, '0'),
    orient,
  ].join('-');
}

const VERTICAL_PREFIX = {
  restaurants: 'rest',
  retail: 'retl',
  healthcare: 'hlth',
};

/**
 * cellFactory — assemble `count` records for a (vertical, template_type) cell.
 *
 * @param {string} vertical             one of VERTICALS
 * @param {string} template_type        per-vertical allowed type
 * @param {number} count                target row count for this cell
 * @param {number} portraitCount        how many of `count` should be portrait (rest landscape)
 * @param {Array<{name, description, topic, tags?: string[]}>} seeds  per-row seed prompts
 * @returns {Array<Object>} D-15 records
 */
function cellFactory({ vertical, template_type, count, portraitCount, seeds }) {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new Error(`cellFactory: seeds required for ${vertical}/${template_type}`);
  }
  if (portraitCount > count) {
    throw new Error(`cellFactory: portraitCount > count for ${vertical}/${template_type}`);
  }
  const rows = [];
  const palettePool = PALETTES[vertical];
  const vibePool = VIBES[vertical];
  for (let i = 0; i < count; i++) {
    const seed = seeds[i % seeds.length];
    const palette = pick(palettePool, i);
    const vibe = pick(vibePool, i);
    const layout = pick(LAYOUTS, i + (template_type.length % LAYOUTS.length));
    const orientation = i < portraitCount ? 'portrait' : 'landscape';
    const styleKeyword = palette.split('-')[0];
    const slug = slugFor(
      VERTICAL_PREFIX[vertical],
      `${template_type}-${tagify(seed.name).slice(0, 24)}`,
      styleKeyword,
      i + 1,
      orientation,
    );
    rows.push({
      slug,
      name: seed.name,
      description: seed.description,
      tags: seed.tags && seed.tags.length > 0
        ? seed.tags
        : [vertical, template_type, palette, vibe.split('-')[0], orientation],
      topic: seed.topic,
      palette,
      vibe,
      layout,
      vertical,
      template_type,
      orientation,
    });
  }
  return rows;
}

// ============================================================================
// RESTAURANTS (target 124 — ≥120 per D-04)
// Hero types (TCAT-02): menu, daypart_menu, promo, drive_thru, seasonal_campaign
// — each ≥4 LANDSCAPE AND ≥4 PORTRAIT.
// ============================================================================

const restaurantsRecords = [
  // ---- menu (count=18; portrait=9, landscape=9) — HERO ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'menu', count: 18, portraitCount: 9,
    seeds: [
      { name: 'Sunset Bistro Daily Menu', description: 'Warm-amber bistro menu with chef-recommendation accent stripe.', topic: 'Promote a Sunday evening bistro menu featuring grilled salmon, seasonal sides, and a chef-pick dessert.' },
      { name: 'Coastal Brunch Board', description: 'Beachfront brunch menu with frittatas, mimosas, and parfaits.', topic: 'Beachfront bistro Sunday brunch menu with mimosas, frittatas, and fresh berry parfaits.' },
      { name: 'Farmhouse Supper Menu', description: 'Rustic farmhouse supper with seasonal harvest plates.', topic: 'Farmhouse-style supper menu with roasted root vegetables, braised short rib, and apple-galette dessert.' },
      { name: 'Trattoria Pasta Selection', description: 'Hand-rolled pasta with tomato-and-basil accents.', topic: 'Italian trattoria pasta menu featuring fresh tagliatelle, ricotta-stuffed ravioli, and limoncello dessert.' },
      { name: 'Late-Night Diner Classics', description: 'Diner staples for the after-hours crowd.', topic: 'Late-night diner menu featuring stacked burgers, milkshakes, and breakfast-anytime plates.' },
      { name: 'Tapas Bar Small-Plate Board', description: 'Tapas-style sharing board with rotating chef picks.', topic: 'Tapas-style menu with rotating chef-picked small plates, sangria pairings, and shareable boards.' },
      { name: 'Sushi Counter Omakase', description: 'Eight-course omakase with seasonal nigiri.', topic: 'Sushi omakase menu featuring seasonal nigiri, miso, and yuzu-citrus dessert.' },
      { name: 'BBQ Pit Smoked Selections', description: 'Pit-smoked meats with house sauces.', topic: 'BBQ pit menu featuring smoked brisket, pulled pork, ribs, and house-made sauces.' },
      { name: 'Vegan Bowl Bar Menu', description: 'Plant-based bowls with grain + protein customization.', topic: 'Vegan bowl bar menu with grain bases, plant-based proteins, and seasonal produce toppings.' },
    ],
  }),

  // ---- daypart_menu (count=10; portrait=5, landscape=5) — HERO ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'daypart_menu', count: 10, portraitCount: 5,
    seeds: [
      { name: 'All-Day Three-Daypart Board', description: 'Breakfast / lunch / dinner panels with active-daypart highlight.', topic: 'Three-section daypart board: breakfast 6-10am, lunch 11am-2pm, dinner 5-9pm with current-daypart highlighted.' },
      { name: 'Cafe Morning-Through-Evening', description: 'Cafe daypart menu spanning morning through cocktail hour.', topic: 'Cafe daypart menu: morning pastries, midday salads and sandwiches, evening small plates and wine.' },
      { name: 'Brewery Lunch-Dinner Split', description: 'Two-section brewery menu with lunch lighter fare and dinner full plates.', topic: 'Brewery daypart menu split between lunch sandwiches and salads, and dinner entrees with beer pairings.' },
      { name: 'Patio Dayparts Brunch-Sunset', description: 'Three-panel patio menu: brunch, afternoon snacks, sunset cocktails.', topic: 'Patio daypart menu: brunch (10am-2pm), afternoon snacks (2-5pm), sunset cocktails and shared boards (5-9pm).' },
      { name: 'Quick-Service Three-Shift Menu', description: 'Three-shift quick-service menu for breakfast, lunch, and late night.', topic: 'Quick-service daypart menu with breakfast burritos, lunch combos, and late-night snack wraps.' },
    ],
  }),

  // ---- daily_special (count=12; portrait=6, landscape=6) ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'daily_special', count: 12, portraitCount: 6,
    seeds: [
      { name: 'Pan-Seared Halibut Special', description: 'Today\'s special: pan-seared halibut with seasonal vegetables.', topic: "Today's special: pan-seared halibut with seasonal vegetables, served until 9pm." },
      { name: 'Wagyu Steak Frites Feature', description: 'House-cut Wagyu steak frites with chef\'s peppercorn sauce.', topic: 'Daily special: house-cut Wagyu steak frites paired with peppercorn sauce and pommes frites.' },
      { name: 'Wild-Mushroom Risotto Pick', description: 'Hand-stirred wild-mushroom risotto with truffle oil drizzle.', topic: "Chef's daily pick: hand-stirred wild-mushroom risotto with truffle oil drizzle and shaved parmesan." },
      { name: 'Bistro Coq au Vin Tonight', description: 'Slow-braised coq au vin with crusty bread.', topic: 'Tonight only: slow-braised coq au vin with crusty bread and seasonal greens.' },
      { name: 'Oyster-Trio Tasting Plate', description: 'Three-region oyster tasting with mignonette flights.', topic: 'Daily oyster trio: three-region tasting plate with mignonette and lemon flights, paired with crisp white wine.' },
      { name: 'Lobster-Roll Lunch Special', description: 'New England lobster roll with chips and slaw.', topic: 'Daily lunch special: New England lobster roll with house-made chips and citrus slaw.' },
    ],
  }),

  // ---- announcement (count=10; portrait=4, landscape=6) ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'announcement', count: 10, portraitCount: 4,
    seeds: [
      { name: 'Now Open Patio Season', description: 'Patio season open with seasonal cocktails and small plates.', topic: 'Now open: our seasonal patio menu featuring rotating cocktails and small plates.' },
      { name: 'New Chef Announcement', description: 'New executive chef joins the kitchen with fresh menu.', topic: 'Welcome our new executive chef Maria Rivera, debuting a refreshed seasonal menu next Monday.' },
      { name: 'Wine Dinner Series Launch', description: 'Monthly wine-pairing dinner series begins in two weeks.', topic: 'Announcing our monthly wine-pairing dinner series — six courses, six wines, the first Wednesday of every month.' },
      { name: 'Live Jazz Tuesday Nights', description: 'Live jazz trio performing Tuesday evenings starting next week.', topic: 'Now Tuesday nights: live jazz trio performing 7-10pm in the dining room — no cover charge.' },
      { name: 'New Tasting Room Opens', description: 'Private tasting room now open for reservations.', topic: 'Announcing our new private tasting room — six-seat counter with chef interaction, reservations open now.' },
    ],
  }),

  // ---- social_proof (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'social_proof', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Five-Star Review Showcase', description: 'Three diner quotes with attribution and 5-star icon row.', topic: '4.9-star average from 1,200+ diners — featuring three customer quotes about brunch, service, and ambience.' },
      { name: 'Local Magazine Feature', description: 'Best brunch in town pull-quote with publication credit.', topic: 'Featured in Local Eats Magazine — "Best brunch in town" with full pull-quote and publication credit.' },
      { name: 'Diner Testimonial Trio', description: 'Three-up customer quote grid with names and cities.', topic: 'Three customer testimonials about our farm-to-table dinner experience, displayed as a quote grid.' },
      { name: 'Chef-Award Recognition Card', description: 'James Beard semifinalist recognition with chef photo placeholder.', topic: 'Proudly recognized as a James Beard semifinalist — chef photo placeholder with award credentials.' },
    ],
  }),

  // ---- queue_status (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'queue_status', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Current Wait 25 Minutes', description: 'Current-wait hero figure with table-ready callout.', topic: 'Current wait: 25 minutes — table-ready callouts every 5 minutes, scan to join the waitlist remotely.' },
      { name: 'Live Wait-Time Display', description: 'Live updating wait counter with QR for self-service.', topic: 'Live wait time displayed in 144px hero text with QR code below for waitlist self-service.' },
      { name: 'Party-Ready Callout Strip', description: 'Names-ready strip for parties currently being seated.', topic: 'Live "Now Seating" callout strip with party-name placeholders for the next three groups.' },
      { name: 'Counter-Wait Quick-Service', description: 'Counter-wait minutes for fast-casual front-of-house.', topic: 'Quick-service counter wait time displayed in oversized minutes with order-ahead QR code.' },
    ],
  }),

  // ---- seasonal_campaign (count=10; portrait=5, landscape=5) — HERO ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'seasonal_campaign', count: 10, portraitCount: 5,
    seeds: [
      { name: 'Summer Patio Launch', description: 'Summer patio menu launch with seafoam-amber palette.', topic: 'Summer Patio Menu launch — running June 15 through Labor Day, featuring fresh seafood and rosé.' },
      { name: 'Fall Harvest Menu', description: 'Fall harvest menu featuring root vegetables and venison.', topic: 'Fall Harvest Menu launch — October through November, featuring root vegetables, venison, and apple desserts.' },
      { name: 'Holiday Tasting Menu', description: 'Holiday five-course tasting menu with festive accents.', topic: 'Holiday Tasting Menu — five courses with wine pairings, available December 1-23 by reservation.' },
      { name: 'Spring Farm Box Series', description: 'Spring farm-to-table box series with rotating producers.', topic: 'Spring Farm-to-Table Box Series — rotating local producer features every Tuesday in April and May.' },
      { name: 'Valentine Prix-Fixe Night', description: 'Valentine four-course prix-fixe with paired wines.', topic: "Valentine's Prix-Fixe Night — four-course menu with paired wines, available February 13-15." },
    ],
  }),

  // ---- hours_loyalty_drive_thru (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'hours_loyalty_drive_thru', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Daily Hours + Loyalty + Drive Thru', description: 'Three-column kiosk card with hours, loyalty CTA, drive-thru status.', topic: 'Open daily 6am-10pm — earn 1 point per $1 spent — drive-thru lane open until midnight.' },
      { name: 'Weekend Extended Hours Card', description: 'Weekend extended-hours card with loyalty-bonus callout.', topic: 'Weekend hours: Sat-Sun 7am-11pm — earn double points all weekend — drive-thru open until 1am Saturday.' },
      { name: 'Loyalty App QR Hub', description: 'Loyalty-rewards QR hub with hours and drive-thru accent.', topic: 'Scan our loyalty app QR — earn 2x points all month — drive-thru open daily 5am-midnight, hours table on left.' },
      { name: 'Holiday Hours Drive Thru', description: 'Holiday hours card with drive-thru-only schedule callout.', topic: 'Holiday hours: dine-in closed Dec 25, drive-thru open 8am-4pm — loyalty bonus 3x points on holiday orders.' },
    ],
  }),

  // ---- drive_thru (count=12; portrait=6, landscape=6) — HERO ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'drive_thru', count: 12, portraitCount: 6,
    seeds: [
      { name: 'Combo Meal Order Board', description: 'Five-combo drive-thru menu with oversized prices.', topic: 'Quick-service drive-thru menu: combo meals 1-5 with sides and drinks, prices in oversized type.' },
      { name: 'Breakfast Drive-Thru Menu', description: 'Breakfast-only drive-thru menu with combo and à la carte rows.', topic: 'Breakfast drive-thru menu: combo plates with eggs, hash browns, and coffee, plus à la carte breakfast sandwiches.' },
      { name: 'Family-Pack Combo Board', description: 'Family-pack drive-thru combos for multi-person orders.', topic: 'Family-pack drive-thru combos: 4-piece, 8-piece, and 12-piece meals with sides and drinks bundled.' },
      { name: 'Late-Night Drive Thru Menu', description: 'Late-night drive-thru menu with limited selection.', topic: 'Late-night drive-thru menu (10pm-2am): burgers, fries, milkshakes, and breakfast-anytime plates.' },
      { name: 'Coffee-Only Drive-Thru Board', description: 'Coffee-only drive-thru menu for espresso bar locations.', topic: 'Coffee drive-thru menu: espresso drinks, drip, cold brew, plus seasonal lattes — pricing in oversized type.' },
      { name: 'Combo + Sides Drive Thru', description: 'Combos plus à la carte sides for drive-thru efficiency.', topic: 'Drive-thru combos with à la carte sides: fries, onion rings, side salads, plus combo bundle pricing.' },
    ],
  }),

  // ---- promo (count=12; portrait=6, landscape=6) — HERO ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'promo', count: 12, portraitCount: 6,
    seeds: [
      { name: 'Limited-Time Burger Bundle', description: 'LTO burger bundle with 20% off through Sunday.', topic: 'Limited-time burger bundle — 20% off through Sunday only, includes burger, fries, and drink.' },
      { name: 'Two-for-Tuesday Pizza Promo', description: 'Tuesday-only two-for-one pizza promo.', topic: 'Two-for-Tuesday — buy one large pizza, get one free, every Tuesday in dine-in or takeout.' },
      { name: 'Happy-Hour Cocktail Special', description: 'Happy-hour cocktail half-price special weekdays 4-6pm.', topic: 'Happy hour cocktails half price — Monday through Friday, 4-6pm, signature drinks at 50% off.' },
      { name: 'Weekend Brunch Bottomless Mimosa', description: 'Bottomless mimosa promo for weekend brunch.', topic: 'Weekend brunch promo — bottomless mimosas $20 add-on with any brunch entrée, Sat-Sun 10am-2pm.' },
      { name: 'Loyalty Member Free Dessert', description: 'Loyalty members get free dessert with entrée.', topic: 'Loyalty members: free dessert with any entrée this week — show your member QR at checkout.' },
      { name: 'Anniversary Promo Three-Course', description: 'Restaurant anniversary three-course menu at half price.', topic: 'Restaurant anniversary special — three-course menu at half price, available all week.' },
    ],
  }),

  // ---- reminder (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'reminder', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Reservation Confirmation Card', description: 'Reservation reminder with date, time, and party size.', topic: 'Reservation reminder: party of 4 on Friday at 7:30pm — see you soon, please arrive 5 minutes early.' },
      { name: 'Loyalty Points Expiration', description: 'Loyalty points balance with expiration warning.', topic: 'You have 350 loyalty points expiring March 31 — redeem on your next visit before they expire.' },
      { name: 'Birthday Dessert Reminder', description: 'Birthday-month complimentary dessert reminder.', topic: 'Happy birthday month — your complimentary dessert is waiting on your next visit, valid all month.' },
      { name: 'Wine Club Pickup Reminder', description: 'Wine-club monthly pickup reminder with date and tier.', topic: 'Wine club monthly pickup reminder — your three-bottle Premium tier is ready Friday after 4pm.' },
    ],
  }),

  // ---- wayfinding (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'restaurants', template_type: 'wayfinding', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Order Pickup Restrooms Wayfinding', description: 'Three-cell directional sign for restaurant entry.', topic: 'Order here ← / Pick-up ↑ / Restrooms → — clear directional signage at the entry.' },
      { name: 'Patio Indoor Restroom Cells', description: 'Patio / indoor / restroom three-cell directional sign.', topic: 'Wayfinding: patio dining → / indoor seating ↑ / restrooms ← — layout for entry hallway.' },
      { name: 'Bar Dining Pickup Wayfinding', description: 'Bar / dining / pickup three-cell wayfinding card.', topic: 'Wayfinding: bar ← / dining room → / takeout pickup ↑ — entry-area kiosk display.' },
      { name: 'Private-Room Hallway Sign', description: 'Hallway directional sign for private dining rooms.', topic: 'Private dining: Garden Room ← / Library Room ↑ / Cellar Room → — hallway directional sign.' },
    ],
  }),
];

// ============================================================================
// RETAIL (target 120 — ≥120 per D-04)
// Hero types (TCAT-02): flash_sale, seasonal_campaign, product_spotlight
// — each ≥4 LANDSCAPE AND ≥4 PORTRAIT.
// ============================================================================

const retailRecords = [
  // ---- flash_sale (count=18; portrait=9, landscape=9) — HERO ----
  ...cellFactory({
    vertical: 'retail', template_type: 'flash_sale', count: 18, portraitCount: 9,
    seeds: [
      { name: 'Forty-Off Outerwear Flash', description: 'Bold flash-sale banner with starburst and product grid.', topic: 'Flash sale: 40% off all winter outerwear, today only, ends at midnight.' },
      { name: 'Weekend Forty-Off Coats', description: 'Weekend flash sale on coats with bold magenta accent.', topic: 'Weekend flash sale - 30% off all winter coats. Saturday and Sunday only.' },
      { name: 'Twenty-Four Hour Tech Flash', description: '24-hour electronics flash sale with countdown timer.', topic: '24-hour flash sale: 25% off all electronics — countdown timer with shop-now CTA.' },
      { name: 'Black-Friday Doorbuster', description: 'Black-Friday doorbuster flash banner with deep discount.', topic: 'Black Friday doorbuster: 60% off select inventory, in-store only, while supplies last.' },
      { name: 'Spring Apparel Flash', description: 'Spring apparel flash sale with floral palette accent.', topic: 'Spring apparel flash sale — 35% off dresses, blouses, and skirts, this weekend only.' },
      { name: 'Summer Footwear Flash', description: 'Summer footwear flash with sandals and sneakers grid.', topic: 'Summer footwear flash — 40% off sandals and sneakers, online and in-store, ends Sunday.' },
      { name: 'Mid-Season Clearance Flash', description: 'Mid-season clearance flash banner with up-to-50% callout.', topic: 'Mid-season clearance flash — up to 50% off select styles, this week only, while inventory lasts.' },
      { name: 'Cyber-Monday Tech Flash', description: 'Cyber Monday electronics flash with premium-tech palette.', topic: 'Cyber Monday: 50% off select electronics, online exclusive, midnight to midnight.' },
      { name: 'Loyalty Member Flash', description: 'Loyalty-member-only flash with QR-locked discount.', topic: 'Loyalty members only: extra 25% off on flash-sale items, scan member QR at checkout.' },
    ],
  }),

  // ---- new_arrivals (count=12; portrait=4, landscape=8) ----
  ...cellFactory({
    vertical: 'retail', template_type: 'new_arrivals', count: 12, portraitCount: 4,
    seeds: [
      { name: 'Spring 2026 Collection Arrival', description: 'New spring 2026 collection announcement with single hero product.', topic: 'New arrivals: spring 2026 collection now in stores and online — explore the new lineup.' },
      { name: 'Fall Streetwear Drop', description: 'Fall streetwear drop with edgy bold-magenta accent.', topic: 'New arrivals: fall streetwear drop — limited-edition graphic tees and outerwear, in stores now.' },
      { name: 'Designer Capsule Collection', description: 'Designer capsule launch with minimalist clean palette.', topic: 'Designer capsule collection now in stores — limited run, online and flagship locations only.' },
      { name: 'Activewear Collection Launch', description: 'Activewear new-arrival hero with technical-fabric callouts.', topic: 'New activewear collection — moisture-wicking fabrics, sustainable materials, online and in-store now.' },
      { name: 'Holiday Gift Arrivals', description: 'Holiday gift assortment new arrivals with festive accent.', topic: 'New holiday gift arrivals — curated assortment of seasonal favorites, available in-store and online.' },
      { name: 'Sustainable Line Launch', description: 'Sustainable-line new arrivals with eco-cert callout.', topic: 'New sustainable line — certified organic cotton and recycled materials, full collection available now.' },
    ],
  }),

  // ---- product_spotlight (count=12; portrait=6, landscape=6) — HERO ----
  ...cellFactory({
    vertical: 'retail', template_type: 'product_spotlight', count: 12, portraitCount: 6,
    seeds: [
      { name: 'Ergonomic Office Chair Spotlight', description: 'Single-product spotlight with feature bullets and price.', topic: 'Featured product: ergonomic office chair with lumbar support — three colors, $349.' },
      { name: 'Wireless Headphone Hero', description: 'Wireless headphone spotlight with battery and noise-cancel callouts.', topic: 'Featured: wireless noise-cancelling headphones, 30-hour battery, three colorways, $279.' },
      { name: 'Cashmere Sweater Spotlight', description: 'Cashmere sweater spotlight with fabric-source bullets.', topic: 'Spotlight: 100% Mongolian cashmere sweater, ethically sourced, available in five neutral tones, $185.' },
      { name: 'Smart Watch Spotlight', description: 'Smart watch hero with health-tracking feature bullets.', topic: 'Featured: GPS smart watch with heart-rate, sleep, and stress tracking, three band options, $299.' },
      { name: 'Leather Tote Bag Spotlight', description: 'Leather tote bag spotlight with handcrafted-detail bullets.', topic: 'Spotlight: handcrafted Italian leather tote bag, padded laptop sleeve, four colors, $295.' },
      { name: 'Standing Desk Spotlight', description: 'Standing desk product spotlight with motorized-feature bullets.', topic: 'Featured: motorized standing desk, 30-50 inch height range, integrated cable management, $599.' },
    ],
  }),

  // ---- seasonal_campaign (count=10; portrait=5, landscape=5) — HERO ----
  ...cellFactory({
    vertical: 'retail', template_type: 'seasonal_campaign', count: 10, portraitCount: 5,
    seeds: [
      { name: 'Holiday Gift Guide Campaign', description: 'Holiday gift guide hero with festive red-gold accent.', topic: 'Holiday gift guide — 50+ ideas, in stores through December 24th.' },
      { name: 'Back-to-School Campaign', description: 'Back-to-school seasonal hero with apple-red accent.', topic: 'Back-to-school season — backpacks, notebooks, and lunch gear, all on sale through August.' },
      { name: 'Summer Vacation Edit', description: 'Summer vacation edit with coral-and-cream campaign.', topic: 'Summer vacation edit — swimwear, sunglasses, and travel accessories, in stores through August.' },
      { name: 'Spring Wedding Season Edit', description: 'Wedding-season edit with floral accents and pastel palette.', topic: 'Spring wedding-season edit — dresses, accessories, and gifts, online and in-flagship stores.' },
      { name: 'Mother\'s Day Gift Edit', description: 'Mother\'s Day curated gift edit with rose-and-cream palette.', topic: "Mother's Day gift edit — curated selection of gifts under $100, in stores and online through May 11." },
    ],
  }),

  // ---- social_proof_ugc (count=10; portrait=4, landscape=6) ----
  ...cellFactory({
    vertical: 'retail', template_type: 'social_proof_ugc', count: 10, portraitCount: 4,
    seeds: [
      { name: 'Cozy Sweater UGC Showcase', description: 'Customer-photo grid with review snippets for cozy sweater.', topic: 'Customers love the Cozy Sweater — over 2,000 5-star reviews and counting, with customer photos.' },
      { name: 'Activewear Customer Photos', description: 'Activewear UGC grid with @handle attribution per photo.', topic: 'Real customers in our activewear — four-up customer photo grid with @handle and short review per photo.' },
      { name: 'Wedding Look UGC Wall', description: 'Wedding-dress UGC photo wall with customer testimonials.', topic: 'Real brides in our wedding-look collection — three-up photo grid with quote and city per customer.' },
      { name: 'Home Decor Customer Setups', description: 'Home decor UGC with customer-room setup photos and quotes.', topic: 'Customer-styled rooms featuring our home decor — three customer-room photos with stylist tag and quote.' },
      { name: 'Activewear Star-Rating Strip', description: 'Five-star icon row with three-up activewear customer photos.', topic: 'Activewear five-star average — three-up customer photo grid with star icons and short pull-quotes.' },
    ],
  }),

  // ---- loyalty_rewards (count=10; portrait=4, landscape=6) ----
  ...cellFactory({
    vertical: 'retail', template_type: 'loyalty_rewards', count: 10, portraitCount: 4,
    seeds: [
      { name: 'Bronze-Silver-Gold Tier Card', description: 'Three-tier loyalty rewards card with benefit bullets per tier.', topic: 'Earn 2x points on every purchase this weekend — sign up to start, with bronze/silver/gold tier benefits.' },
      { name: 'Loyalty App Sign-Up CTA', description: 'Loyalty app sign-up CTA with QR and member-tier preview.', topic: 'Download our loyalty app — earn points on every purchase, redeem for in-store and online rewards, scan QR.' },
      { name: 'Birthday-Month Bonus Points', description: 'Birthday-month 3x points loyalty card with tier-aware copy.', topic: 'Loyalty members: 3x points all birthday month — automatically applied to all purchases in your birthday month.' },
      { name: 'Refer-a-Friend Reward', description: 'Refer-a-friend loyalty reward with bonus-points callout.', topic: 'Refer a friend — both you and your friend get 500 bonus points after their first purchase, no limit on referrals.' },
      { name: 'Anniversary Tier Upgrade', description: 'Anniversary-year tier upgrade with reward benefit recap.', topic: 'Loyalty member anniversary — automatic tier upgrade with reward recap and next-tier benefits preview.' },
    ],
  }),

  // ---- wayfinding (count=10; portrait=4, landscape=6) ----
  ...cellFactory({
    vertical: 'retail', template_type: 'wayfinding', count: 10, portraitCount: 4,
    seeds: [
      { name: 'Aisle Department Wayfinding', description: 'Aisle and department three-cell wayfinding card.', topic: 'Aisle 3: Home goods → / Aisle 5: Electronics ↑ / Fitting rooms ← — store entry wayfinding.' },
      { name: 'Floor Map Department Cells', description: 'Floor-map style department wayfinding with arrows.', topic: 'Floor map: Women\'s ↑ Floor 2 / Men\'s → Floor 1 / Home goods ← Floor 3 — directional cells.' },
      { name: 'Checkout Restroom Returns', description: 'Checkout / restroom / returns three-cell wayfinding.', topic: 'Wayfinding: Checkout → / Restrooms ← / Returns ↑ — front-of-store directional kiosk.' },
      { name: 'Fitting-Room Cellar Card', description: 'Fitting room and cellar two-cell wayfinding sign.', topic: 'Wayfinding: Fitting rooms → 30 ft / Storage cellar ← — back-of-store directional sign.' },
      { name: 'Customer Service Desk Sign', description: 'Customer service desk wayfinding with directional arrow.', topic: 'Customer service ↑ Floor 1, near elevators — single-arrow directional sign with distance callout.' },
    ],
  }),

  // ---- hours_window (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'retail', template_type: 'hours_window', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Daily Store Hours Display', description: 'Standard store-hours window display with today highlighted.', topic: 'Store hours: Mon-Sat 10-9, Sun 11-6 — open today until 9pm, weekday hours grouped at top.' },
      { name: 'Holiday Hours Window Card', description: 'Holiday-week hours window display with closed days noted.', topic: 'Holiday hours: closed Dec 25, regular hours all other days — window display with each day spelled out.' },
      { name: 'Weekend Extended Hours Sign', description: 'Weekend extended-hours window display with bold today callout.', topic: 'Weekend hours: Saturday 9-10, Sunday 10-8 — open today until 10pm, with weekday hours below.' },
      { name: 'Black-Friday Extended Hours', description: 'Black-Friday extended-hours window with bold open-now status.', topic: 'Black Friday hours: 6am-midnight — extended through the weekend, scan for online deal preview.' },
    ],
  }),

  // ---- promo (count=12; portrait=5, landscape=7) ----
  ...cellFactory({
    vertical: 'retail', template_type: 'promo', count: 12, portraitCount: 5,
    seeds: [
      { name: 'Buy-Two-Get-One Spring Tops', description: 'BOGO spring tops promo with offer headline and CTA.', topic: 'Buy 2 get 1 free on all spring tops — through April 30th.' },
      { name: 'Bundle Deal Activewear', description: 'Activewear bundle deal: three-piece bundle at fixed price.', topic: 'Activewear bundle deal — three pieces for $99, mix and match across leggings, tops, and tanks.' },
      { name: 'Twenty-Off Storewide Promo', description: '20% off storewide weekend promo with brand-color accent.', topic: 'Promo weekend: 20% off storewide — Saturday and Sunday only, in stores and online.' },
      { name: 'Free Tote With Purchase', description: 'Free-tote-with-purchase promo for $75+ orders.', topic: 'Free signature tote with any $75+ purchase — limited-time offer, in stores and online.' },
      { name: 'Loyalty Members Extra Off', description: 'Loyalty-member-only additional discount layered on sale.', topic: 'Loyalty members: extra 15% off on all sale items this week, scan member QR at checkout.' },
      { name: 'Two-for-Tuesday Accessories', description: 'Two-for-Tuesday accessories promo recurring weekly.', topic: 'Two-for-Tuesday accessories: buy any two accessories, get the second 50% off, every Tuesday.' },
    ],
  }),

  // ---- announcement (count=10; portrait=4, landscape=6) ----
  ...cellFactory({
    vertical: 'retail', template_type: 'announcement', count: 10, portraitCount: 4,
    seeds: [
      { name: 'Grand Opening New Flagship', description: 'Grand-opening announcement for new flagship store.', topic: 'Grand opening: our new flagship store — opens Saturday at 10am with giveaways and live DJ.' },
      { name: 'Brand Partnership Announcement', description: 'Brand partnership reveal with exclusive collaboration drop.', topic: 'Announcing our exclusive brand partnership with [Designer] — limited-edition collaboration drop in two weeks.' },
      { name: 'New Loyalty Program Launch', description: 'New loyalty program announcement with sign-up CTA.', topic: 'Announcing our refreshed loyalty program — new tiers, new rewards, sign up before launch day for bonus points.' },
      { name: 'Sustainable Materials Initiative', description: 'Sustainable-materials initiative announcement with eco accent.', topic: 'Announcing our new sustainable-materials initiative — 50% of inventory now uses certified materials by 2027.' },
      { name: 'Storewide Renovation Reopening', description: 'Storewide renovation reopening with refreshed-experience callout.', topic: 'Reopening announcement: our flagship store reopens after renovation on March 15 with refreshed experience.' },
    ],
  }),

  // ---- reminder (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'retail', template_type: 'reminder', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Loyalty Points Expiration Reminder', description: 'Loyalty balance reminder with March-31 expiration warning.', topic: 'You have 250 points expiring March 31 — redeem on your next purchase before they expire.' },
      { name: 'Wishlist Item Back In Stock', description: 'Wishlist back-in-stock reminder with shop-now CTA.', topic: 'Reminder: an item from your wishlist is back in stock — shop now before it sells out again.' },
      { name: 'Upcoming Sale Calendar Reminder', description: 'Upcoming-sale calendar reminder with dates and member preview.', topic: 'Reminder: our annual sale starts Friday — members get 24-hour early access starting Thursday at 8pm.' },
      { name: 'Birthday Reward Available', description: 'Birthday reward available reminder with redemption window.', topic: 'Birthday reward available: $20 off any purchase, valid through your birthday month, scan loyalty QR.' },
    ],
  }),
];

// ============================================================================
// HEALTHCARE (target 120 — ≥120 per D-04)
// Hero types (TCAT-02): waiting_room_ambient, reminder, announcement
// — each ≥4 LANDSCAPE AND ≥4 PORTRAIT.
// ============================================================================

const healthcareRecords = [
  // ---- waiting_room_ambient (count=16; portrait=8, landscape=8) — HERO ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'waiting_room_ambient', count: 16, portraitCount: 8,
    seeds: [
      { name: 'Calm Sky Reassurance', description: 'Calm waiting-room ambient with soft sky gradient.', topic: 'Calm waiting-room ambient — soft gradient sky with a single reassuring fact about the clinic.' },
      { name: 'Sage Garden Ambient', description: 'Sage-green garden ambient with single calming line of copy.', topic: 'Sage-green garden ambient — single line of reassuring copy with subtle leaf motif placeholder.' },
      { name: 'Warm Sunset Waiting Room', description: 'Warm-tone sunset waiting-room ambient with horizon gradient.', topic: 'Warm-tone sunset ambient for waiting room — horizon gradient with a single short reassurance line.' },
      { name: 'Pediatric Gentle Animal Ambient', description: 'Pediatric ambient with gentle animal silhouette and soft copy.', topic: 'Pediatric waiting-room ambient — gentle animal silhouette with single line of family-friendly reassurance.' },
      { name: 'Senior-Friendly Calm Tone', description: 'Senior-friendly waiting-room ambient with high-readability copy.', topic: 'Senior-friendly ambient — high-readability soft tone with single reassuring fact about clinic services.' },
      { name: 'Modern Clinic Minimalist', description: 'Modern minimalist clinic ambient with single thoughtful line.', topic: 'Modern minimalist clinic ambient — generous whitespace with single thoughtful well-being line.' },
      { name: 'Lake Reflection Ambient', description: 'Lake-reflection waiting-room ambient with soft pastel sky.', topic: 'Lake-reflection ambient — soft pastel sky and water motif with single calm message of welcome.' },
    ],
  }),

  // ---- queue_status (count=10; portrait=4, landscape=6) ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'queue_status', count: 10, portraitCount: 4,
    seeds: [
      { name: 'Estimated Wait Eighteen Minutes', description: 'Estimated-wait hero figure with check-in CTA.', topic: 'Estimated wait: 18 minutes — check-in via the front desk, queue numbers displayed for next-up.' },
      { name: 'Next-Up Queue Number Display', description: 'Next-up queue number display with privacy-safe identifiers only.', topic: 'Next up: queue numbers displayed with no patient names — privacy-safe identifier-only display.' },
      { name: 'Pharmacy Wait Time Status', description: 'Pharmacy queue wait-time card with prescription-ready callout.', topic: 'Pharmacy wait: 12 minutes — prescription-ready callouts every 5 minutes via queue number.' },
      { name: 'Imaging Department Queue', description: 'Imaging-department queue status with privacy-safe display.', topic: 'Imaging department wait: 25 minutes — queue numbers shown for next-up, no patient names.' },
      { name: 'Lab Wait-Time Quiet Display', description: 'Lab wait-time display with calm sage-blue palette.', topic: 'Lab wait time: 15 minutes — calm sage-blue palette, queue-number display, no patient names.' },
    ],
  }),

  // ---- health_tip (count=16; portrait=5, landscape=11) ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'health_tip', count: 16, portraitCount: 5,
    seeds: [
      { name: 'Hand-Washing Twenty Seconds', description: 'Hand-washing twenty-second tip with three supporting bullets.', topic: 'Wash your hands for 20 seconds with warm water and soap — a simple way to prevent illness.' },
      { name: 'Annual Physical Reminder Tip', description: 'Annual physical reminder tip with CDC-style attribution.', topic: 'Schedule your annual physical — early detection saves lives, source: CDC guidelines for adults.' },
      { name: 'Hydration Eight Glasses Tip', description: 'Hydration tip card with daily-water-intake guidance.', topic: 'Stay hydrated — 8 glasses of water a day for healthy skin and energy, with three supporting bullets.' },
      { name: 'Sleep Hygiene Quality Tip', description: 'Sleep hygiene tip with three actionable bullets.', topic: 'Sleep hygiene tip: aim for 7-9 hours of quality sleep nightly, with three supporting bullets on routine.' },
      { name: 'Sun Protection SPF Tip', description: 'Sun protection SPF tip with daily-application guidance.', topic: 'Sun protection: apply SPF 30+ daily, reapply every 2 hours when outdoors, with three supporting bullets.' },
      { name: 'Heart-Health Daily Walk Tip', description: 'Heart-health daily walk tip with 30-min activity callout.', topic: 'Heart health: 30 minutes of daily walking lowers blood pressure, with three supporting bullets on intensity.' },
      { name: 'Mental Health Check-In Tip', description: 'Mental health check-in tip with helpline callout.', topic: 'Mental health check-in: notice your mood weekly, with three supporting bullets and helpline placeholder.' },
    ],
  }),

  // ---- reminder (count=16; portrait=8, landscape=8) — HERO ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'reminder', count: 16, portraitCount: 8,
    seeds: [
      { name: 'Annual Physical Appointment', description: 'Annual physical appointment reminder with arrival guidance.', topic: 'Reminder: your annual physical is March 15 at 2:30pm — please arrive 15 minutes early.' },
      { name: 'Lab Work Pre-Appointment', description: 'Lab-work fasting reminder with pre-appointment instructions.', topic: 'Reminder: lab work scheduled tomorrow at 8am — please fast for 12 hours prior, water is permitted.' },
      { name: 'Pediatric Vaccination Reminder', description: 'Pediatric vaccination reminder with parent-readable copy.', topic: 'Pediatric reminder: 5-year vaccinations due this month — schedule via the family-portal app or front desk.' },
      { name: 'Mammogram Annual Reminder', description: 'Annual mammogram reminder with scheduling QR.', topic: 'Mammogram annual reminder — recommended for ages 40+, schedule via the patient portal or call 555-CARE.' },
      { name: 'Dental Cleaning Reminder Card', description: 'Six-month dental cleaning reminder card with appointment slot.', topic: 'Dental cleaning reminder: your six-month appointment is due — schedule via the front desk.' },
      { name: 'Specialist Follow-Up Reminder', description: 'Specialist follow-up appointment reminder with prep guidance.', topic: 'Reminder: specialist follow-up scheduled — bring previous lab results, arrive 10 minutes early.' },
      { name: 'Senior Wellness Check Reminder', description: 'Senior wellness check reminder with screening recommendations.', topic: 'Senior wellness check reminder — annual recommendation for 65+, includes balance and cognition screening.' },
    ],
  }),

  // ---- provider_directory (count=10; portrait=4, landscape=6) ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'provider_directory', count: 10, portraitCount: 4,
    seeds: [
      { name: 'Cardiology Pediatrics Primary', description: 'Three-provider directory with photos and specialty rows.', topic: 'Directory: Dr. Lee (cardiology), Dr. Patel (pediatrics), Dr. Rivera (primary care).' },
      { name: 'Six-Provider Specialty Grid', description: 'Six-provider specialty grid with sage-blue palette.', topic: 'Specialty directory: six-provider grid covering cardiology, neurology, dermatology, OB-GYN, pediatrics, and family medicine.' },
      { name: 'Family Practice Provider Wall', description: 'Family practice provider wall with five providers.', topic: 'Family practice directory: five providers with photos, specialties, and accepting-new-patients status.' },
      { name: 'Urgent Care Today Directory', description: 'Urgent-care today-only provider directory.', topic: "Today's urgent care providers — three providers with photos, specialties, and current-shift schedule." },
      { name: 'Behavioral Health Directory', description: 'Behavioral health provider directory with calm palette.', topic: 'Behavioral health directory: four providers covering therapy, psychiatry, and counseling specialties.' },
    ],
  }),

  // ---- vaccination_reminder (count=10; portrait=4, landscape=6) ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'vaccination_reminder', count: 10, portraitCount: 4,
    seeds: [
      { name: 'Annual Flu Shot Reminder', description: 'Annual flu shot vaccination reminder with scheduling CTA.', topic: 'Annual flu shots now available — schedule at the front desk or via our patient portal.' },
      { name: 'Shingles Vaccine Recommendation', description: 'Shingles vaccine recommendation card with age-50+ guidance.', topic: 'Shingles vaccine recommended for ages 50+ — two-dose series, schedule at the front desk or via portal.' },
      { name: 'COVID Booster Available Reminder', description: 'COVID booster available reminder with current-strain note.', topic: 'COVID booster vaccines available — current-strain formulation, walk-ins welcome or schedule online.' },
      { name: 'Pediatric Vaccine Schedule Card', description: 'Pediatric vaccine schedule card for ages 2 and 5 milestones.', topic: 'Pediatric vaccine schedule: 2-year and 5-year milestones, with full schedule available via the family portal.' },
      { name: 'Travel Vaccine Reminder', description: 'Travel vaccine reminder with appointment scheduling QR.', topic: 'Travel vaccines available — schedule at least 4-6 weeks before departure, scan QR for travel-vaccine guide.' },
    ],
  }),

  // ---- emergency_alert (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'emergency_alert', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Fire Exit Stairwell Alert', description: 'Fire-exit emergency alert with numbered steps.', topic: 'Emergency: in case of fire, exit via stairwells A or B — do not use elevators, follow numbered steps.' },
      { name: 'Severe Weather Shelter Alert', description: 'Severe weather shelter alert with shelter-location callouts.', topic: 'Emergency: severe weather warning — proceed to interior hallways, away from windows, follow staff directions.' },
      { name: 'Active Shooter Run-Hide-Fight', description: 'Active shooter response alert with run-hide-fight steps.', topic: 'Emergency: active shooter — RUN if safe, HIDE if cornered, FIGHT only as last resort, dial 911 when safe.' },
      { name: 'Medical Code Blue Response', description: 'Medical code blue response alert with response-team callout.', topic: 'Emergency code blue — clear hallways, response team incoming, follow numbered steps for civilian response.' },
    ],
  }),

  // ---- clinic_hours_pharmacy (count=8; portrait=3, landscape=5) ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'clinic_hours_pharmacy', count: 8, portraitCount: 3,
    seeds: [
      { name: 'Clinic and Pharmacy Hours Card', description: 'Two-card clinic and pharmacy hours display.', topic: 'Clinic Mon-Fri 8-6 / Pharmacy Mon-Sat 9-9 — closed Sundays, today highlighted with accent strip.' },
      { name: 'Holiday Closure Hours Notice', description: 'Holiday clinic and pharmacy closure-hours notice.', topic: 'Holiday hours: clinic closed Dec 25, pharmacy 9-3 emergency only — full hours resume Dec 26.' },
      { name: 'Weekend Pharmacy Open Card', description: 'Weekend pharmacy-open card with clinic-closed callout.', topic: 'Weekend hours: clinic closed Sat-Sun, pharmacy Saturday 10-4 — Sunday closed, today highlighted.' },
      { name: 'Extended Evening Hours Notice', description: 'Extended evening hours notice for clinic and pharmacy.', topic: 'Extended hours: clinic Mon-Thu 8-8, pharmacy Mon-Sat 8-10 — current-day hours highlighted on each card.' },
    ],
  }),

  // ---- announcement (count=14; portrait=7, landscape=7) — HERO ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'announcement', count: 14, portraitCount: 7,
    seeds: [
      { name: 'Behavioral Health Service Launch', description: 'New behavioral health service announcement with portal CTA.', topic: 'New service: behavioral-health consultations now available — schedule via patient portal.' },
      { name: 'New Cardiology Provider Joins', description: 'New cardiology provider joins announcement with photo.', topic: 'Welcome our new cardiology provider Dr. Chen — accepting new patients starting next month.' },
      { name: 'Telemedicine Expansion Notice', description: 'Telemedicine expansion announcement for chronic care.', topic: 'Telemedicine now available for chronic-care follow-ups — schedule virtual visits via the patient portal.' },
      { name: 'Patient Portal Refresh Announce', description: 'Patient portal refresh announcement with new-feature callouts.', topic: 'Refreshed patient portal — schedule, message, and view records all in one place, log in to explore.' },
      { name: 'Walk-In Hours Now Daily', description: 'Walk-in hours now daily announcement with availability schedule.', topic: 'Walk-in hours now daily 8-11am — no appointment needed for routine and acute care visits.' },
      { name: 'New Imaging Suite Opens', description: 'New imaging suite opens announcement with appointment CTA.', topic: 'New imaging suite now open — MRI, CT, and ultrasound services on-site, schedule via the patient portal.' },
    ],
  }),

  // ---- wayfinding (count=12; portrait=4, landscape=8) ----
  ...cellFactory({
    vertical: 'healthcare', template_type: 'wayfinding', count: 12, portraitCount: 4,
    seeds: [
      { name: 'Cardiology Pharmacy Restrooms Sign', description: 'Multi-department wayfinding directional sign.', topic: 'Cardiology ↑ Floor 3 / Pharmacy → / Restrooms ← / Emergency Exit ↓.' },
      { name: 'Patient Registration Lab Sign', description: 'Patient registration and lab wayfinding directional sign.', topic: 'Wayfinding: Patient registration → / Lab ↑ / Imaging ← / Pharmacy ↓ — entry-area directional kiosk.' },
      { name: 'Emergency Department Wayfinding', description: 'Emergency department wayfinding sign with entry directions.', topic: 'Emergency Department → main floor / Outpatient ← Floor 2 / Specialty Clinics ↑ Floor 3.' },
      { name: 'Pediatric Clinic Family Sign', description: 'Pediatric clinic family-area wayfinding directional sign.', topic: 'Pediatric Clinic → / Family Waiting Area ← / Restrooms ↓ — color-friendly directional sign for families.' },
      { name: 'Lab Imaging Pharmacy Cluster', description: 'Lab / imaging / pharmacy three-cell wayfinding card.', topic: 'Wayfinding: Lab ↑ / Imaging ← / Pharmacy → — diagnostic-services cluster with sage-blue accent palette.' },
      { name: 'Floor Three Specialty Sign', description: 'Floor 3 specialty clinics directional wayfinding card.', topic: 'Floor 3 specialties: Cardiology ← Suite 301 / Neurology ↑ Suite 320 / Oncology → Suite 330.' },
    ],
  }),
];

// ============================================================================
// FINAL TOPICS ARRAY
// ============================================================================

const seedTopics = [
  ...restaurantsRecords,
  ...retailRecords,
  ...healthcareRecords,
];

// ----- Load-time validation (D-15 invariants) -----
(function assertSchema() {
  if (!Array.isArray(seedTopics) || seedTopics.length === 0) {
    throw new Error('seedTopics must be a non-empty array');
  }
  const slugSet = new Set();
  for (const t of seedTopics) {
    for (const k of REQUIRED_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(t, k)) {
        throw new Error(`seedTopics: missing key "${k}" on ${t.slug || '<no-slug>'}`);
      }
    }
    if (!Array.isArray(t.tags) || t.tags.length === 0) {
      throw new Error(`seedTopics: tags must be non-empty array on ${t.slug}`);
    }
    if (!VERTICALS.includes(t.vertical)) {
      throw new Error(`seedTopics: bad vertical=${t.vertical} on ${t.slug}`);
    }
    if (!ORIENTATIONS.includes(t.orientation)) {
      throw new Error(`seedTopics: bad orientation=${t.orientation} on ${t.slug}`);
    }
    const allowedTypes = TEMPLATE_TYPES_PER_VERTICAL[t.vertical];
    if (!allowedTypes.includes(t.template_type)) {
      throw new Error(
        `seedTopics: template_type=${t.template_type} not allowed for vertical=${t.vertical} on ${t.slug}`,
      );
    }
    if (slugSet.has(t.slug)) {
      throw new Error(`seedTopics: duplicate slug ${t.slug}`);
    }
    slugSet.add(t.slug);
  }
})();

// ----- ESM exports (named + default; test reads `mod.seedTopics || mod.default || mod`) -----
export { seedTopics, TEMPLATE_TYPES_PER_VERTICAL };
export default seedTopics;
