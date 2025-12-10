// Country code to flag emoji mapping
export function getCountryFlag(countryCode: string): string {
  const flags: { [key: string]: string } = {
    'FR': '🇫🇷',
    'IT': '🇮🇹',
    'ES': '🇪🇸',
    'CH': '🇨🇭',
    'NL': '🇳🇱',
    'DE': '🇩🇪',
    'GB': '🇬🇧',
    'US': '🇺🇸',
    'PT': '🇵🇹',
    'GR': '🇬🇷',
    'AT': '🇦🇹',
    'BE': '🇧🇪',
    'DK': '🇩🇰',
    'IE': '🇮🇪',
    'NO': '🇳🇴',
    'SE': '🇸🇪',
    'PL': '🇵🇱',
  }
  
  return flags[countryCode] || '🌍'
}




























