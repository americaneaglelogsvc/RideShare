// Geocoding service using OpenStreetMap Nominatim (free, no API key)
// For production, switch to Google Maps Geocoding API or Mapbox

interface GeocodingResult {
  lat: number;
  lng: number;
  display_name: string;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * Geocode an address string to lat/lng coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
      countrycodes: 'us',
    });

    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        'User-Agent': 'UrWayDispatch/1.0',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch {
    return null;
  }
}

/**
 * Search for address suggestions (autocomplete)
 */
export async function searchAddresses(query: string): Promise<GeocodingResult[]> {
  if (!query || query.length < 3) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      countrycodes: 'us',
      addressdetails: '1',
    });

    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: {
        'User-Agent': 'UrWayDispatch/1.0',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data || []).map((r: any) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      display_name: r.display_name,
    }));
  } catch {
    return [];
  }
}

/**
 * Reverse geocode lat/lng to an address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
    });

    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: {
        'User-Agent': 'UrWayDispatch/1.0',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}
