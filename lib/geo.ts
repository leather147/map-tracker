import type { Direction, LatLng } from "./types"

// Saint Petersburg center
export const SPB_CENTER: LatLng = [59.9386, 30.3141]

const DIRECTION_BEARING: Record<Direction, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
}

const EARTH_RADIUS = 6378137 // meters

// Move a lat/lng point by `distance` meters along a `bearing` (degrees)
export function moveByDistance(
  [lat, lng]: LatLng,
  distanceMeters: number,
  bearingDeg: number,
): LatLng {
  const bearing = (bearingDeg * Math.PI) / 180
  const latRad = (lat * Math.PI) / 180
  const lngRad = (lng * Math.PI) / 180
  const angular = distanceMeters / EARTH_RADIUS

  const newLat = Math.asin(
    Math.sin(latRad) * Math.cos(angular) +
      Math.cos(latRad) * Math.sin(angular) * Math.cos(bearing),
  )
  const newLng =
    lngRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(latRad),
      Math.cos(angular) - Math.sin(latRad) * Math.sin(newLat),
    )

  return [(newLat * 180) / Math.PI, (newLng * 180) / Math.PI]
}

export function bearingFromDirection(d: Direction): number {
  return DIRECTION_BEARING[d]
}

export function distanceMeters([lat1, lng1]: LatLng, [lat2, lng2]: LatLng): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Meters-per-pixel at a given latitude and Yandex/Web-Mercator zoom level
export function metersPerPixel(lat: number, zoom: number): number {
  return (
    (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * EARTH_RADIUS) /
    (256 * Math.pow(2, zoom))
  )
}

// ─── Street graph for Saint Petersburg central district ───────────────────────
// Each node is a junction (intersection). Each edge connects two nodes.
// The beacon walks along edges and at each node picks the next edge whose
// bearing does NOT reverse the current direction (no 180° turns, always
// forward / left / right).

export interface StreetNode {
  id: string
  pos: LatLng
  /** ids of adjacent nodes */
  adj: string[]
}

// Bearing from a to b in degrees [0, 360)
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const dLng  = ((b[1] - a[1]) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// Central SPb street graph — major intersections along key roads
// Nevsky, Liteiny, Sadovaya, Fontanka, Moika, Griboedov, Vladimirsky, etc.
const RAW_NODES: [string, number, number, string[]][] = [
  // id,          lat,       lng,       adjacent ids
  ["nev_pl",   59.9356,  30.3617, ["nev_gr", "nev_vost"]],               // Nevsky / Pl. Vosstaniya
  ["nev_gr",   59.9347,  30.3537, ["nev_pl", "nev_font", "gr_nev"]],     // Nevsky / Griboedov
  ["nev_font", 59.9340,  30.3451, ["nev_gr", "nev_sad", "font_nev"]],    // Nevsky / Fontanka
  ["nev_sad",  59.9337,  30.3368, ["nev_font", "nev_gost", "sad_nev"]],  // Nevsky / Sadovaya
  ["nev_gost", 59.9332,  30.3283, ["nev_sad", "nev_adm", "grib_nev"]],   // Nevsky / Griboed.-1
  ["nev_adm",  59.9363,  30.3182, ["nev_gost", "nev_dv", "lit_nev"]],    // Nevsky / Admiralt.
  ["nev_dv",   59.9388,  30.3145, ["nev_adm", "dv_pl"]],                 // Nevsky / Dvortsovaya
  ["dv_pl",    59.9424,  30.3149, ["nev_dv", "lit_dv", "moika_dv"]],     // Dvortsovaya pl.

  ["gr_nev",   59.9323,  30.3537, ["nev_gr", "gr_kaz", "font_gr"]],      // Griboedov south
  ["gr_kaz",   59.9340,  30.3420, ["gr_nev", "gr_sad"]],                 // Griboedov / Kazanskiy
  ["gr_sad",   59.9301,  30.3250, ["gr_kaz", "grib_nev"]],               // Griboedov / Sadovaya
  ["grib_nev", 59.9318,  30.3240, ["gr_sad", "nev_gost"]],               // Griboedov / Nevsky

  ["font_nev", 59.9310,  30.3451, ["nev_font", "font_zagor", "sad_font"]],
  ["font_zagor",59.9270, 30.3480, ["font_nev", "font_mos"]],
  ["font_mos", 59.9215,  30.3496, ["font_zagor", "mos_font"]],
  ["mos_font", 59.9200,  30.3450, ["font_mos", "mos_zagor"]],
  ["mos_zagor",59.9195,  30.3340, ["mos_font", "sad_mos"]],

  ["sad_nev",  59.9307,  30.3368, ["nev_sad", "sad_font", "sad_itd"]],
  ["sad_font", 59.9295,  30.3500, ["sad_nev", "font_nev"]],
  ["sad_itd",  59.9295,  30.3200, ["sad_nev", "sad_mos"]],
  ["sad_mos",  59.9290,  30.3100, ["sad_itd", "mos_zagor", "sad_sen"]],
  ["sad_sen",  59.9310,  30.2970, ["sad_mos", "sen_pl"]],
  ["sen_pl",   59.9353,  30.2924, ["sad_sen", "nev_adm"]],

  ["lit_nev",  59.9345,  30.3480, ["nev_adm", "lit_bel", "font_lit"]],
  ["lit_bel",  59.9400,  30.3480, ["lit_nev", "lit_dv", "moika_lit"]],
  ["lit_dv",   59.9455,  30.3250, ["lit_bel", "dv_pl", "moika_lit"]],

  ["moika_lit",59.9432,  30.3390, ["lit_bel", "moika_nev", "moika_dv"]],
  ["moika_nev",59.9406,  30.3300, ["moika_lit", "moika_dv", "nev_adm"]],
  ["moika_dv", 59.9437,  30.3170, ["moika_lit", "dv_pl"]],

  ["font_lit", 59.9275,  30.3480, ["lit_nev", "font_nev", "font_zagor"]],
  ["font_gr",  59.9295,  30.3550, ["gr_nev", "font_nev"]],

  ["vl_nev",   59.9314,  30.3560, ["nev_pl", "vl_zagor"]],              // Vladimirsky
  ["vl_zagor", 59.9255,  30.3540, ["vl_nev", "vl_mos"]],
  ["vl_mos",   59.9215,  30.3530, ["vl_zagor", "mos_font"]],

  ["nev_vost", 59.9358,  30.3670, ["nev_pl", "nev_ligov"]],             // Nevsky east
  ["nev_ligov",59.9361,  30.3720, ["nev_vost", "ligov_nev"]],
  ["ligov_nev",59.9285,  30.3700, ["nev_ligov", "ligov_obs"]],
  ["ligov_obs",59.9220,  30.3680, ["ligov_nev"]],
]

// Build the node map
const NODE_MAP = new Map<string, StreetNode>()
for (const [id, lat, lng, adj] of RAW_NODES) {
  NODE_MAP.set(id, { id, pos: [lat, lng], adj })
}
export const STREET_NODES = NODE_MAP

// Find the nearest graph node to a given position
export function nearestNode(pos: LatLng): StreetNode {
  let best: StreetNode | null = null
  let bestDist = Infinity
  for (const node of NODE_MAP.values()) {
    const d = distanceMeters(pos, node.pos)
    if (d < bestDist) { bestDist = d; best = node }
  }
  return best!
}

// Given the current node and the bearing we arrived with, pick the next node.
// Rules:
//  - Never turn back more than 135° (no near-180° reversal)
//  - Among valid candidates, weight toward "straight" (< 45° turn) vs
//    "side street" (45–135°) — 70 % straight, 30 % side — for realism.
export function pickNextNode(
  current: StreetNode,
  arrivalBearing: number,
): { node: StreetNode; exitBearing: number } {
  const reverseBearing = (arrivalBearing + 180) % 360

  const candidates = current.adj
    .map((id) => {
      const n = NODE_MAP.get(id)!
      const b = bearing(current.pos, n.pos)
      // angular difference from incoming direction (how much we turn)
      let diff = Math.abs(b - arrivalBearing)
      if (diff > 180) diff = 360 - diff
      return { node: n, exitBearing: b, diff }
    })
    .filter(({ exitBearing }) => {
      // reject near-reversal (> 135° turn)
      let diff = Math.abs(exitBearing - reverseBearing)
      if (diff > 180) diff = 360 - diff
      return diff > 45
    })

  if (candidates.length === 0) {
    // dead end — must reverse
    const id = current.adj[0]
    const n = NODE_MAP.get(id)!
    return { node: n, exitBearing: bearing(current.pos, n.pos) }
  }

  // Prefer candidates that go mostly forward (diff < 45°) with 70 % probability
  const straight = candidates.filter((c) => c.diff < 45)
  const side     = candidates.filter((c) => c.diff >= 45)

  let pool = candidates
  if (straight.length > 0 && side.length > 0) {
    pool = Math.random() < 0.7 ? straight : side
  } else if (straight.length > 0) {
    pool = straight
  }

  const choice = pool[Math.floor(Math.random() * pool.length)]
  return { node: choice.node, exitBearing: choice.exitBearing }
}

// ─── Legacy helpers kept for compatibility ────────────────────────────────────
export const SPB_ROUTE: LatLng[] = RAW_NODES.slice(0, 13).map(([, lat, lng]) => [lat, lng])

export function formatScale(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000
    return `${km % 1 === 0 ? km : km.toFixed(km < 10 ? 1 : 0)} км`
  }
  return `${Math.round(meters)} м`
}

export function niceScaleLength(mpp: number, targetPx = 80): { meters: number; px: number } {
  const targetMeters = mpp * targetPx
  const pow = Math.pow(10, Math.floor(Math.log10(targetMeters)))
  const candidates = [1, 2, 5, 10].map((m) => m * pow)
  let best = candidates[0]
  for (const c of candidates) {
    if (Math.abs(c - targetMeters) < Math.abs(best - targetMeters)) best = c
  }
  return { meters: best, px: best / mpp }
}
