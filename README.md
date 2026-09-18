# AstroWalk Journey 2.6.1 — Live Journey Tracking

This revision keeps the 2.6 natal + transit + route prediction engine and adds live movement behavior. Walking and driving modes follow continuous device GPS on the map while expensive astrology/prediction recalculation is throttled to meaningful movement (about 12 m walking or 50 m driving, with a timed fallback). Static mode keeps a manually chosen origin fixed. The blue map point is the live device position; the smaller gold point is the last position used for the astrology/prediction calculation.

# AstroWalk Journey 2.6 — Natal Transit Route Engine

This build combines four inputs for journey interpretation:
1. Birth chart (sidereal Lahiri)
2. Current/selected-time sidereal transits
3. Current geographic location
4. Destination geographic bearing/zone

## New in 2.6
- Refined translucent compass wheel with fine degree ticks, zodiac, all 27 nakshatras, houses, planet glyphs, aspect lines, N/E/S/W, ASC and destination-bearing marker.
- Planet glyphs and house sectors are clickable and open their own forecast panel.
- Transit-to-natal aspects and transit-to-natal-house-cusp aspects are calculated.
- Destination bearing maps to a real compass/house zone: East≈House 1, South≈House 4, West≈House 7, North≈House 10.
- Birth UTC offset is required for more reliable natal ASC/house timing.
- Private keyword layer remains server-side via PLANET_VOCAB_JSON.
- Private keyword preparation page: `https://YOUR-SITE.vercel.app/?admin=keywords` (there is no link to this page in the normal user UI).
- Geographic wheel radius remains adjustable independently from astrology calculations.

## Environment variables
`VITE_GOOGLE_MAPS_API_KEY` — browser Google Maps key; restrict it by HTTP referrer and API in Google Cloud.

`PLANET_VOCAB_JSON` — private server-side vocabulary JSON. Do NOT prefix this with VITE_.

## Private keyword workflow
Open `/?admin=keywords` on your deployed site. Upload/paste CSV using:
`planet,category,term,weight`

Supported categories: `people`, `events`, `qualities`, `places`, `objects`.
Click **Copy Vercel JSON**, then paste the result into the Vercel `PLANET_VOCAB_JSON` environment variable and redeploy.

## Prediction model
Predictions are generated from sidereal transit placement + current transit aspects + transit-to-natal-planet aspects + transit-to-natal-house-cusp aspects + natal house rulership + destination compass/house zone + private planet vocabulary. They are interpretive forecasts, not guaranteed events.
