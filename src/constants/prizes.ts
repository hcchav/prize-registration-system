export interface Prize {
  id: string;
  name: string;
  weight: number;
  color: string;
  textColor: string;
  displayText: string;
}

export const PRIZES: Prize[] = [
  {
    id: 'tshirt',
    name: 'Biome Brigade T-Shirt',
    displayText: 'T-Shirt',
    weight: 250,
    color: "#4285F4", // Google Blue
    textColor: "#FFFFFF"
  },
  {
    id: 'hat',
    name: 'Biome Brigade Hat',
    displayText: 'Hat',
    weight: 250,
    color: "#FBBC05", // Google Yellow
    textColor: "#000000"
  },
  {
    id: 'gut-shield',
    name: 'Biome Brigade GutShield Daily Supplements',
    displayText: 'GutShield',
    weight: 100,
    color: "#34A853", // Google Green
    textColor: "#FFFFFF"
  },
  {
    id: 'itch-guard',
    name: 'Biome Brigade ItchGuard Daily Supplements',
    displayText: 'ItchGuard',
    weight: 100,
    color: "#F29900", // Google Orange
    textColor: "#000000"
  },
  {
    id: 'gut-test',
    name: 'Biome Brigade Gut Health Test',
    displayText: 'Gut Test',
    weight: 25,
    color: "#9C27B0", // Purple
    textColor: "#FFFFFF"
  },
  {
    id: 'eli-cole-toy',
    name: 'Eli Cole Dog Toy',
    displayText: 'Eli Toy',
    weight: 50,
    color: "#E91E63", // Pink
    textColor: "#FFFFFF"
  },
  {
    id: 'flaky-jake-toy',
    name: 'Flaky Jake Dog Toy',
    displayText: 'Jake Toy',
    weight: 50,
    color: "#00BCD4", // Cyan
    textColor: "#000000"
  },
  {
    id: 'claus-stridium-toy',
    name: 'Claus Stridium Dog Toy',
    displayText: 'Claus Toy',
    weight: 50,
    color: "#18b318", // Light Green
    textColor: "#000000"
  },
  {
    id: 'poster',
    name: 'Biome Brigade Poster',
    displayText: 'Poster',
    weight: 350,
    color: "#001f2f", // Brown
    textColor: "#FFFFFF"
  }
];