/**
 * Geofence hook — checks if current GPS is within radius of allowed area coords.
 * Usage: const { checkLocation, loading, error } = useGeofence();
 * Returns: { allowed: bool, distance: number (meters), coords: {lat, lng} }
 */
import { useState, useCallback } from 'react';

const DEFAULT_RADIUS = 300; // meters

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeofence() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkLocation = useCallback(async (area) => {
    // If area has no coords configured → skip validation (allow)
    if (!area?.latitude || !area?.longitude) {
      return { allowed: true, skipped: true };
    }

    setLoading(true);
    setError(null);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('GPS tidak tersedia di perangkat ini');
        setLoading(false);
        resolve({ allowed: false, error: 'GPS tidak tersedia' });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: userLat, longitude: userLng } = pos.coords;
          const distance = haversineDistance(userLat, userLng, area.latitude, area.longitude);
          const radius = area.geofence_radius || DEFAULT_RADIUS;
          setLoading(false);
          resolve({
            allowed: distance <= radius,
            distance: Math.round(distance),
            radius,
            coords: { lat: userLat, lng: userLng }
          });
        },
        (err) => {
          setError('Tidak bisa mendapatkan lokasi GPS');
          setLoading(false);
          resolve({ allowed: false, error: err.message });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  return { checkLocation, loading, error };
}