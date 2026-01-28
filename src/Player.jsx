// src/Player.jsx - Player Entry Point (Routing Only)
// All page components extracted to player/pages/ and player/components/

/**
 * Main Player component with routing
 *
 * Routes:
 * - /player -> PairPage (OTP pairing)
 * - /player/view -> ViewPage (content playback)
 * - /player/* -> Redirect to /player
 */
export default function Player() {
  return (
    <Routes>
      <Route path="/" element={<PairPage />} />
      <Route path="/view" element={<ViewPage />} />
      <Route path="*" element={<Navigate to="/player" replace />} />
    </Routes>
  );
}
