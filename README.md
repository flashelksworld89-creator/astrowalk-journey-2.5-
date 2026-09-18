# AstroWalk Journey 2.5

This build extends 2.4 with a geographic-scale zodiac compass for walking and driving.

## New in 2.5
- Adjustable wheel radius in feet, yards, miles, meters, or kilometers.
- Quick presets: 250 ft, 500 ft, 1/4 mi, 1/2 mi, 1 mi, 5 mi.
- Map zoom follows the selected geographic radius while astronomical calculations remain unchanged.
- Zodiac wheel is centered over the user/map center and rendered more transparently so streets remain readable.
- All 27 nakshatra divisions remain visible on the map wheel.
- Planet glyphs are plotted by exact sidereal longitude, which places them in their calculated transiting nakshatra positions.
- Sidereal conjunction, sextile, square, trine, quincunx, and opposition lines are drawn inside the wheel.
- Cardinal N/E/S/W markers are included, with ASC anchored to East/right.
- Private terminology/prediction layer from 2.4 remains intact.

## Important separation
The geographic radius only controls how much real-world map area is shown. It never changes the Lahiri sidereal planets, houses, ASC/DSC, nakshatras, or aspects.

# AstroWalk Journey 2.4 — Private Interpretation Layer

This build continues from AstroWalk Journey 2.3 and keeps the Swiss Ephemeris / Lahiri sidereal calculation engine intact.

## What changed in 2.4

- Added sidereal aspect detection (conjunction, sextile, square, trine, quincunx, opposition).
- Added a server-only private planetary terminology layer through `/api/interpret`.
- Private terms are combined with the calculated planet, sidereal sign, nakshatra/pada, house, condition and aspects.
- The browser receives only the selected interpretation themes, not the complete private terminology bank.
- Outcome feedback already stores the themes selected for each reading, which can later be used to compare Yes / No / Unsure results.
- Repaired the Google map component so this version builds cleanly before the adjustable map-wheel scale work is added.

## Astronomy remains separate from interpretation

Swiss Ephemeris determines the chart. The private terminology does not move a planet, change a house, change a nakshatra, or alter ASC/DSC. It only influences the text interpretation after the astronomical facts have been calculated.

## Entering your private vocabulary in bulk

The easiest format is CSV. Open:

`scripts/planet-vocab-template.csv`

Columns:

- `planet`: sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto, rahu, ketu
- `category`: people, events, qualities, places, objects
- `term`: your private word or phrase
- `weight`: 0.00 through 1.00

Example:

```csv
planet,category,term,weight
mars,events,machinery activity,0.90
mars,events,competition,0.80
mars,objects,tools,0.75
mars,qualities,urgency,0.85
```

You may add hundreds or thousands of rows.

### Convert the CSV to JSON

Run:

```bash
npm run vocab:convert
```

This creates:

`scripts/planet-vocab-output.json`

That output file is ignored by Git so it is less likely to be committed accidentally.

## Put the vocabulary into Vercel privately

1. Open your Vercel project.
2. Go to **Settings → Environment Variables**.
3. Add `PLANET_VOCAB_JSON`.
4. Open `scripts/planet-vocab-output.json` on your computer.
5. Copy the entire JSON contents into the value field.
6. Save and redeploy.

Do **not** prefix this variable with `VITE_`. Vite-prefixed environment variables can be compiled into browser-side code.

The repository includes generic fallback vocabulary so the app still runs before you add your own terminology. Your custom vocabulary should be kept in the Vercel server environment rather than committed to the public repository.

## Google Maps

Set this Vercel environment variable:

`VITE_GOOGLE_MAPS_API_KEY`

Enable the Maps JavaScript API and Geocoding API in Google Cloud and restrict the key to your AstroWalk domain.

## Next visual upgrade

The next layer is the adjustable geographic wheel radius discussed for the map overlay: feet, yards, miles, meters and kilometers. That scale will affect only how much real-world map area the wheel covers. It will not change the sidereal chart or the aspect calculations.
