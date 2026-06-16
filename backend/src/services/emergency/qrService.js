// Produces a JSON payload that will later be encoded into a QR image.
// Kept separate so the payload format can evolve independently of the image renderer.
export const generateQRPayload = (emergencyId, token) => {
  return JSON.stringify({ emergency_id: emergencyId, token });
};
