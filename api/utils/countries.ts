// Country database with centroid coordinates
// Used as fallback when geocoding fails or for hash-based country assignment

export interface CountryData {
  name: string;
  code: string; // ISO 3166-1 alpha-2
  lat: number;
  lng: number;
}

export const COUNTRIES: CountryData[] = [
  { name: 'United States', code: 'US', lat: 39.8283, lng: -98.5795 },
  { name: 'United Kingdom', code: 'GB', lat: 55.3781, lng: -3.4360 },
  { name: 'Canada', code: 'CA', lat: 56.1304, lng: -106.3468 },
  { name: 'Australia', code: 'AU', lat: -25.2744, lng: 133.7751 },
  { name: 'Germany', code: 'DE', lat: 51.1657, lng: 10.4515 },
  { name: 'France', code: 'FR', lat: 46.2276, lng: 2.2137 },
  { name: 'Japan', code: 'JP', lat: 36.2048, lng: 138.2529 },
  { name: 'China', code: 'CN', lat: 35.8617, lng: 104.1954 },
  { name: 'India', code: 'IN', lat: 20.5937, lng: 78.9629 },
  { name: 'Brazil', code: 'BR', lat: -14.2350, lng: -51.9253 },
  { name: 'Russia', code: 'RU', lat: 61.5240, lng: 105.3188 },
  { name: 'South Korea', code: 'KR', lat: 35.9078, lng: 127.7669 },
  { name: 'Singapore', code: 'SG', lat: 1.3521, lng: 103.8198 },
  { name: 'Netherlands', code: 'NL', lat: 52.1326, lng: 5.2913 },
  { name: 'Switzerland', code: 'CH', lat: 46.8182, lng: 8.2275 },
  { name: 'Spain', code: 'ES', lat: 40.4637, lng: -3.7492 },
  { name: 'Italy', code: 'IT', lat: 41.8719, lng: 12.5674 },
  { name: 'Mexico', code: 'MX', lat: 23.6345, lng: -102.5528 },
  { name: 'Argentina', code: 'AR', lat: -38.4161, lng: -63.6167 },
  { name: 'South Africa', code: 'ZA', lat: -30.5595, lng: 22.9375 },
  { name: 'Turkey', code: 'TR', lat: 38.9637, lng: 35.2433 },
  { name: 'Indonesia', code: 'ID', lat: -0.7893, lng: 113.9213 },
  { name: 'Thailand', code: 'TH', lat: 15.8700, lng: 100.9925 },
  { name: 'Philippines', code: 'PH', lat: 12.8797, lng: 121.7740 },
  { name: 'Vietnam', code: 'VN', lat: 14.0583, lng: 108.2772 },
  { name: 'Malaysia', code: 'MY', lat: 4.2105, lng: 101.9758 },
  { name: 'Poland', code: 'PL', lat: 51.9194, lng: 19.1451 },
  { name: 'Sweden', code: 'SE', lat: 60.1282, lng: 18.6435 },
  { name: 'Norway', code: 'NO', lat: 60.4720, lng: 8.4689 },
  { name: 'Denmark', code: 'DK', lat: 56.2639, lng: 9.5018 },
  { name: 'Finland', code: 'FI', lat: 61.9241, lng: 25.7482 },
  { name: 'Belgium', code: 'BE', lat: 50.5039, lng: 4.4699 },
  { name: 'Austria', code: 'AT', lat: 47.5162, lng: 14.5501 },
  { name: 'Ireland', code: 'IE', lat: 53.4129, lng: -8.2439 },
  { name: 'Portugal', code: 'PT', lat: 39.3999, lng: -8.2245 },
  { name: 'Greece', code: 'GR', lat: 39.0742, lng: 21.8243 },
  { name: 'Israel', code: 'IL', lat: 31.0461, lng: 34.8516 },
  { name: 'United Arab Emirates', code: 'AE', lat: 23.4241, lng: 53.8478 },
  { name: 'Saudi Arabia', code: 'SA', lat: 23.8859, lng: 45.0792 },
  { name: 'New Zealand', code: 'NZ', lat: -40.9006, lng: 174.8860 },
  { name: 'Chile', code: 'CL', lat: -35.6751, lng: -71.5430 },
  { name: 'Colombia', code: 'CO', lat: 4.5709, lng: -74.2973 },
  { name: 'Peru', code: 'PE', lat: -9.1900, lng: -75.0152 },
  { name: 'Venezuela', code: 'VE', lat: 6.4238, lng: -66.5897 },
  { name: 'Nigeria', code: 'NG', lat: 9.0820, lng: 8.6753 },
  { name: 'Egypt', code: 'EG', lat: 26.0975, lng: 30.0444 },
  { name: 'Kenya', code: 'KE', lat: -0.0236, lng: 37.9062 },
  { name: 'Ukraine', code: 'UA', lat: 48.3794, lng: 31.1656 },
  { name: 'Czech Republic', code: 'CZ', lat: 49.8175, lng: 15.4730 },
  { name: 'Romania', code: 'RO', lat: 45.9432, lng: 24.9668 },
  { name: 'Hungary', code: 'HU', lat: 47.1625, lng: 19.5033 },
];

// Country name variations and aliases for parsing
export const COUNTRY_ALIASES: Record<string, string> = {
  'USA': 'United States',
  'US': 'United States',
  'United States of America': 'United States',
  'UK': 'United Kingdom',
  'UAE': 'United Arab Emirates',
  'Korea': 'South Korea',
  'South Korea': 'South Korea',
  'Czechia': 'Czech Republic',
};

/**
 * Get country data by name (with alias support)
 */
export function getCountryByName(name: string): CountryData | null {
  const normalized = name.trim();
  const alias = COUNTRY_ALIASES[normalized] || normalized;
  
  return COUNTRIES.find(
    c => c.name.toLowerCase() === alias.toLowerCase() || 
         c.code.toLowerCase() === normalized.toLowerCase()
  ) || null;
}

/**
 * Get country by hash (for fallback assignment)
 */
export function getCountryByHash(input: string): CountryData {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COUNTRIES.length;
  return COUNTRIES[index];
}



