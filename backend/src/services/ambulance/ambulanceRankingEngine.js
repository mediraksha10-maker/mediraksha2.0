// ── Ambulance type capability tiers ──────────────────────────────────────────
//
// ICU > CARDIAC > ALS > BLS — higher tier can handle lower-tier emergencies.
// Used by the type scoring function to reward capability match or excess.

export const TYPE_PRIORITY = Object.freeze({
  ICU:     4,
  CARDIAC: 3,
  ALS:     2,
  BLS:     1,
});

// ── Weight presets ────────────────────────────────────────────────────────────
//
// DEFAULT_WEIGHTS: general dispatch — proximity is king.
// CRITICAL_WEIGHTS: when a specific ambulance type is required (cardiac arrest,
//   ICU transfer) — type match gets a larger share so we don't send a BLS unit
//   to a cardiac emergency just because it's 200m closer.
//
// Zero-weighted factors are stubs — the SCORE_FNS entry exists, the formula is
// wired in, but the data source isn't live yet. To activate: set weight > 0.

export const DEFAULT_WEIGHTS = Object.freeze({
  distance:      0.80,
  ambulance_type: 0.20,
  driver_rating:  0.00,  // future: driver_ratings table
  response_time:  0.00,  // future: historical_response_times
  reliability:    0.00,  // future: maintenance + incident records
  traffic:        0.00,  // future: traffic API
});

export const CRITICAL_WEIGHTS = Object.freeze({
  distance:       0.65,
  ambulance_type: 0.35,
  driver_rating:  0.00,
  response_time:  0.00,
  reliability:    0.00,
  traffic:        0.00,
});

// ── Scoring functions — one per factor ───────────────────────────────────────
//
// Each fn(ambulance, context) → [0, 1].
// context: { radiusKm, requiredType }

const SCORE_FNS = {
  distance: (ambulance, { radiusKm }) => {
    const dist = parseFloat(ambulance.distance_km) || 0;
    return radiusKm > 0 ? Math.max(0, 1 - dist / radiusKm) : 0;
  },

  ambulance_type: (ambulance, { requiredType }) => {
    const ambPriority = TYPE_PRIORITY[ambulance.ambulance_type] || 1;
    if (!requiredType) {
      // No specific type required: reward higher capability tiers proportionally
      return ambPriority / 4;
    }
    // Score = min(1, ambulanceTier / requiredTier)
    // Sending an ICU unit for ALS emergency is acceptable (score = 1)
    // Sending BLS for ICU emergency is penalised (score = 0.25)
    const reqPriority = TYPE_PRIORITY[requiredType] || 1;
    return Math.min(1.0, ambPriority / reqPriority);
  },

  driver_rating:  () => 0,
  response_time:  () => 0,
  reliability:    () => 0,
  traffic:        () => 0,
};

// ── Score computation ─────────────────────────────────────────────────────────

export const computeAmbulanceScore = (ambulance, context, weights = DEFAULT_WEIGHTS) => {
  let total = 0;
  for (const [factor, weight] of Object.entries(weights)) {
    if (weight === 0) continue;
    const fn = SCORE_FNS[factor];
    if (!fn) continue;
    total += fn(ambulance, context) * weight;
  }
  return Math.round(total * 10_000) / 10_000; // 4 decimal places
};

// ── Rank list ─────────────────────────────────────────────────────────────────

export const rankAmbulances = (ambulances, context, weights = DEFAULT_WEIGHTS) =>
  ambulances
    .map(amb => ({ ...amb, score: computeAmbulanceScore(amb, context, weights) }))
    .sort((a, b) => b.score - a.score)
    .map((amb, idx) => ({ ...amb, rank_position: idx + 1 }));
