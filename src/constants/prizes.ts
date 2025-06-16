export interface Prize {
  id: number;
  name: string;
  displayText: string;
  weight: number;
  color: string;
  textColor: string;
  stock?: number;
  wheelPosition?: number;
  isOutOfStock?: boolean;
}

export const PRIZES: Prize[] = [
  {
    id: 1,
    name: 'Biome Brigade T-Shirt',
    displayText: 'T-Shirt',
    weight: 100,
    color: '#9cf7f7', // Light Teal
    textColor: '#000000'
  },
  {
    id: 6,
    name: 'Biome Brigade Hat',
    displayText: 'Hat',
    weight: 100,
    color: '#03273b', // Dark Blue
    textColor: '#FFFFFF'
  },
  {
    id: 3,
    name: 'Biome Brigade ItchGuard Daily Supplements',
    displayText: 'ItchGuard',
    weight: 100,
    color: '#ffe600', // Yellow
    textColor: '#000000'
  },
  {
    id: 4,
    name: 'Biome Brigade Gut Health Test',
    displayText: 'Gut Test',
    weight: 100,
    color: '#0971b9', // Blue (same as 1003)
    textColor: '#FFFFFF'
  },
  {
    id: 2,
    name: 'Eli Cole Dog Toy',
    displayText: 'Eli Toy',
    weight: 100,
    color: '#2bca25', // Green
    textColor: '#000000'
  },
  {
    id: 7,
    name: 'Flaky Jake Dog Toy',
    displayText: 'Flaky Toy',
    weight: 100,
    color: '#e9f6ff', // Light Blue
    textColor: '#000000'
  },
  {
    id: 8,
    name: 'Claus Stridium Dog Toy',
    displayText: 'Claus Toy',
    weight: 100,
    color: '#f78615', // Orange
    textColor: '#000000'
  },
  {
    id: 9,
    name: 'Biome Brigade Poster',
    displayText: 'Poster',
    weight: 100,
    color: '#c90e07', // Red
    textColor: '#FFFFFF'
  }
];