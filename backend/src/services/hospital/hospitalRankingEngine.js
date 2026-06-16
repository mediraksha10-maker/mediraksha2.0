// ── Hospital Ranking Engine V1 ─────────────────────────────────────────────────
//
// Scoring formula (V1):
//   total = (distance × 0.70) + (rating × 0.30)
//
// The weights object is the extension point: future versions add non-zero weight
// dimensions (bed_availability, facility_match, specialist, real_time_load) here
// without touching any caller code.
//
// All score values are normalised to [0, 1].

// ── Weight profile ────────────────────────────────────────────────────────────

export const DEFAULT_WEIGHTS = Object.freeze({
  distance:         0.70,
  rating:           0.30,
  // Planned — zero-weighted until data source is available
  bed_availability: 0.00,
  facility_match:   0.00,
  specialist:       0.00,
  real_time_load:   0.00,
});

// Weights for trauma / cardiac emergencies (future use)
export const EMERGENCY_WEIGHTS = Object.freeze({
  distance:         0.60,
  rating:           0.20,
  facility_match:   0.20,
  bed_availability: 0.00,
  specialist:       0.00,
  real_time_load:   0.00,
});

// ── Score functions per dimension ─────────────────────────────────────────────

const SCORE_FNS = {
  // Closer hospital → higher score; 0 at edge of radius, 1 at location
  distance: (h, ctx) => {
    if (!ctx.radius_km || h.distance_km == null) return 0;
    return Math.max(0, 1 - parseFloat(h.distance_km) / ctx.radius_km);
  },

  // rating is 0–5; normalise to 0–1
  rating: (h) => {
    const r = parseFloat(h.rating) || 0;
    return Math.min(1, r / 5.0);
  },

  // ── Future stubs — return 0 until data is available ──────────────────────
  bed_availability: () => 0,  // TODO: integrate live bed availability feed
  facility_match:   () => 0,  // TODO: match against emergency_type requirements
  specialist:       () => 0,  // TODO: check on-shift specialist availability
  real_time_load:   () => 0,  // TODO: integrate real-time occupancy metrics
};

// ── Core computation ──────────────────────────────────────────────────────────

export const computeHospitalScore = (hospital, context, weights = DEFAULT_WEIGHTS) => {
  const breakdown = {};
  let total = 0;

  for (const [dim, weight] of Object.entries(weights)) {
    if (weight === 0) { breakdown[dim] = 0; continue; }
    const fn  = SCORE_FNS[dim];
    const val = fn ? fn(hospital, context) : 0;
    const clamped = Math.min(1, Math.max(0, val));
    breakdown[dim] = parseFloat(clamped.toFixed(6));
    total += clamped * weight;
  }

  return { ...breakdown, total_score: parseFloat(total.toFixed(6)) };
};

// ── Batch ranking ─────────────────────────────────────────────────────────────

export const rankHospitals = (hospitals, context, weights = DEFAULT_WEIGHTS) => {
  return hospitals
    .map(h => ({ ...h, scores: computeHospitalScore(h, context, weights) }))
    .sort((a, b) => b.scores.total_score - a.scores.total_score)
    .map((h, idx) => ({ ...h, rank_position: idx + 1 }));
};
