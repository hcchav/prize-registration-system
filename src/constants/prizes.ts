export interface Prize {
  id: number;
  name: string;
  displayText: string;
  weight: number;
  color: string;
  textColor: string;
}

export const PRIZES: Prize[] = [

  {
    id: 1,
    name: 'Biome Brigade T-Shirt',
    displayText: 'T-Shirt',
    weight: 250,
    color: '#4A90E2', // Blue
    textColor: '#FFFFFF'
  },
  {
    id: 6,
    name: 'Biome Brigade Hat',
    displayText: 'Hat',
    weight: 250,
    color: '#F7D046', // Yellow
    textColor: '#000000'
  },
  {
    id: 3,
    name: 'Biome Brigade ItchGuard Daily Supplements',
    displayText: 'ItchGuard',
    weight: 100,
    color: '#FF6B6B', // Red
    textColor: '#FFFFFF'
  },
  {
    id: 4,
    name: 'Biome Brigade Gut Health Test',
    displayText: 'Gut Test',
    weight: 25,
    color: '#6B7A8F', // Gray
    textColor: '#FFFFFF'
  },
  {
    id: 2,
    name: 'Eli Cole Dog Toy',
    displayText: 'Eli Toy',
    weight: 50,
    color: '#9B59B6', // Purple
    textColor: '#FFFFFF'
  },
  {
    id: 7,
    name: 'Flaky Jake Dog Toy',
    displayText: 'Flaky Toy',
    weight: 50,
    color: '#E74C3C', // Red-Orange
    textColor: '#FFFFFF'
  },
  {
    id: 8,
    name: 'Claus Stridium Dog Toy',
    displayText: 'Claus Toy',
    weight: 50,
    color: '#3498DB', // Light Blue
    textColor: '#FFFFFF'
  },
  {
    id: 9,
    name: 'Biome Brigade Poster',
    displayText: 'Poster',
    weight: 350,
    color: '#2C3E50', // Dark Blue
    textColor: '#FFFFFF'
  }
];