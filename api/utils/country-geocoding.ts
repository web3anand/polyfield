import axios from 'axios';
import { getCountryByName, getCountryByHash, COUNTRIES, CountryData } from './countries';

// Cache for geocoded countries to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lng: number; country: string }>();

// OpenStreetMap Nominatim API (free, no API key required)
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/search';

/**
 * Parse country name from X profile location string
 * Examples: "New York, USA" -> "United States"
 *           "London, UK" -> "United Kingdom"
 *           "Tokyo, Japan" -> "Japan"
 */
export function parseCountryFromLocation(location: string): string | null {
  if (!location || typeof location !== 'string') {
    return null;
  }

  const normalized = location.trim();
  if (normalized.length === 0) {
    return null;
  }

  // Try to extract country from common patterns
  // Pattern 1: "City, Country" or "City, State, Country"
  const parts = normalized.split(',').map(p => p.trim());
  
  // Last part is often the country
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    
    // Check if it's a known country
    const country = getCountryByName(lastPart);
    if (country) {
      return country.name;
    }
    
    // Check aliases
    if (lastPart === 'USA' || lastPart === 'US') {
      return 'United States';
    }
    if (lastPart === 'UK' || lastPart === 'United Kingdom') {
      return 'United Kingdom';
    }
    if (lastPart === 'UAE') {
      return 'United Arab Emirates';
    }
  }

  // Pattern 2: Check if entire string matches a country
  const directMatch = getCountryByName(normalized);
  if (directMatch) {
    return directMatch.name;
  }

  // Pattern 3: Try to find country name within the string
  for (const country of COUNTRIES) {
    if (normalized.toLowerCase().includes(country.name.toLowerCase())) {
      return country.name;
    }
    if (normalized.toLowerCase().includes(country.code.toLowerCase())) {
      return country.name;
    }
  }

  return null;
}

/**
 * Geocode country name to coordinates using OpenStreetMap Nominatim
 * Uses caching to avoid repeated API calls
 */
export async function getCountryCoordinates(
  country: string
): Promise<{ lat: number; lng: number; country: string }> {
  // Check cache first
  if (geocodeCache.has(country)) {
    return geocodeCache.get(country)!;
  }

  // Check if we have the country in our database
  const countryData = getCountryByName(country);
  if (countryData) {
    const result = {
      lat: countryData.lat,
      lng: countryData.lng,
      country: countryData.name,
    };
    geocodeCache.set(country, result);
    return result;
  }

  // Try geocoding via Nominatim API
  try {
    // Rate limiting: Nominatim requires max 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1100));

    const response = await axios.get(NOMINATIM_API, {
      params: {
        q: country,
        format: 'json',
        limit: 1,
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'PolyMarketDashboard/1.0', // Required by Nominatim
      },
      timeout: 5000,
    });

    if (response.data && response.data.length > 0) {
      const result = {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon),
        country: country,
      };
      geocodeCache.set(country, result);
      return result;
    }
  } catch (error) {
    console.warn(`Geocoding failed for ${country}:`, error);
  }

  // Fallback to hash-based country assignment
  const fallback = getCountryByHash(country);
  const result = {
    lat: fallback.lat,
    lng: fallback.lng,
    country: fallback.name,
  };
  geocodeCache.set(country, result);
  return result;
}

/**
 * Get country from X profile location
 * This is a simplified version - in production, you'd fetch the actual X profile
 * For now, we'll use a mock/placeholder that can be extended with real X API integration
 */
export async function getCountryFromXProfile(xUsername: string): Promise<string | null> {
  // TODO: Implement actual X API integration
  // For now, return null to trigger fallback behavior
  // This function can be extended with:
  // 1. X API v2 integration (requires credentials)
  // 2. Web scraping (fragile, rate-limited)
  // 3. Pre-populated database lookup
  
  return null;
}

/**
 * Process location string and return country coordinates
 * Combines parsing and geocoding
 */
export async function processLocationToCoordinates(
  location: string | null | undefined
): Promise<{ lat: number; lng: number; country: string } | null> {
  if (!location) {
    return null;
  }

  const country = parseCountryFromLocation(location);
  if (!country) {
    return null;
  }

  try {
    return await getCountryCoordinates(country);
  } catch (error) {
    console.error(`Failed to geocode country ${country}:`, error);
    return null;
  }
}



