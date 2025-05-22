export interface Prize {
  id: string;
  name: string;
  image: string;
  weight: number;
  color: string;
  textColor: string;
  stock?: number;
}

export const PRIZES: Prize[] = [
  {
    id: 'tshirt',
    name: 'T-Shirt',
    image: '/images/prizes/tshirt.png',
    weight: 50,
    color: "#4A90E2",
    textColor: "#FFFFFF"
  },
  {
    id: 'itch-guard',
    name: 'ItchGuard',
    image: '/images/prizes/itch-guard.png',
    weight: 16.66,
    color: "#F7D046",
    textColor: "#000000"
  },
  {
    id: 'dog-bowl',
    name: 'Dog Bowl',
    image: '/images/prizes/dog-bowl.png',
    weight: 50,
    color: "#6B7A8F",
    textColor: "#FFFFFF"
  },
  {
    id: 'gut-shield',
    name: 'GutShield',
    image: '/images/prizes/gut-shield.png',
    weight: 16.67,
    color: "#009245",
    textColor: "#FFFFFF"
  },
  {
    id: 'gut-test',
    name: 'Gut Test',
    image: '/images/prizes/gut-test.png',
    weight: 10,
    color: "#E6EEF4",
    textColor: "#009245"
  }
]; 