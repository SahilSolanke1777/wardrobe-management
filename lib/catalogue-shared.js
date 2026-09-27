// Client-safe catalogue helpers (no fs). The dataset lives in public/clothing (see cloths/README.md).

// dataset category → the app's category + a readable label for names
export const DATASET = {
  tshirt: { group: 'Tops', label: 'T-shirt' },
  shirt: { group: 'Tops', label: 'Shirt' },
  top: { group: 'Tops', label: 'Top' },
  sweater: { group: 'Tops', label: 'Knit sweater' },
  hoodie: { group: 'Tops', label: 'Hoodie' },
  jacket: { group: 'Outerwear', label: 'Jacket' },
  coat: { group: 'Outerwear', label: 'Coat' },
  jeans: { group: 'Bottoms', label: 'Jeans' },
  trousers: { group: 'Bottoms', label: 'Trousers' },
  shorts: { group: 'Bottoms', label: 'Shorts' },
  skirt: { group: 'Bottoms', label: 'Skirt' },
  dress: { group: 'Dresses', label: 'Dress' },
  sneakers: { group: 'Shoes', label: 'Sneakers' },
  boots: { group: 'Shoes', label: 'Boots' },
  loafers: { group: 'Shoes', label: 'Loafers' },
  watch: { group: 'Accessories', label: 'Watch' },
  bag: { group: 'Accessories', label: 'Bag' },
  cap: { group: 'Accessories', label: 'Cap' },
  sunglasses: { group: 'Accessories', label: 'Sunglasses' },
};

// colour names written by fetch_pexels.py → hex used across the app
export const COLOUR_HEX = {
  white: '#F7F5F0', ivory: '#F4F0E6', cream: '#F0E6CD', beige: '#D6C4A4', tan: '#C8AA82', camel: '#B08A5B',
  brown: '#6E4628', black: '#1E1D1B', charcoal: '#3B3A38', grey: '#9A9A96', gray: '#9A9A96', silver: '#BEC0C4',
  navy: '#2E3A57', blue: '#3C64AA', 'light blue': '#9DB7D5', denim: '#4B6584', teal: '#287878',
  green: '#3C8246', olive: '#6B7248', khaki: '#AAA06E', red: '#A81E24', burgundy: '#6B1F2A', pink: '#E1A0AF',
  orange: '#DC7828', rust: '#A2482A', yellow: '#E1C332', mustard: '#C9A227', gold: '#C8A546', purple: '#6E3C8C', lilac: '#B7A6C9',
};

export function isCataloguePath(p) {
  return typeof p === 'string' && /^\/clothing\/[a-z]+\/[a-z]+_\d{3}\.(jpg|png)$/.test(p);
}

export function photoSrc(photo) {
  if (!photo) return null;
  return photo.startsWith('/') ? photo : `/api/uploads/${photo}`;
}

export const PEXELS_URL = 'https://www.pexels.com';
