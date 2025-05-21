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
    color: "#002639", // brand-navy-500
    textColor: "#FFFFFF"
  },
  {
    id: 'flaky-jake-toy',
    name: 'Flaky Jake Dog Toy',
    displayText: 'Jake Toy',
    weight: 50,
    color: "#abcae9", // brand-lightblue-200
    textColor: "#FFFFFF"
  },
  {
    id: 'gut-shield',
    name: 'Biome Brigade GutShield Daily Supplements',
    displayText: 'GutShield',
    weight: 100,
    color: "#18b318", // brand-green-500
    textColor: "#FFFFFF"
  },

  {
    id: 'hat',
    name: 'Biome Brigade Hat',
    displayText: 'Hat',
    weight: 250,
    color: "#438ee1", // brand-green-500
    textColor: "#FFFFFF"
  },


  {
    id: 'itch-guard',
    name: 'Biome Brigade ItchGuard Daily Supplements',
    displayText: 'ItchGuard',
    weight: 100,
    color: "#ffe600", // brand-orange-500
    textColor: "#000000"
  },
  {
    id: 'claus-stridium-toy',
    name: 'Claus Stridium Dog Toy',
    displayText: 'Claus Toy',
    weight: 50,
    color: "#002639", // brand-green-300
    textColor: "#FFFFFF"
  },
  {
    id: 'gut-test',
    name: 'Biome Brigade Gut Health Test',
    displayText: 'Gut Test',
    weight: 25,
    color: "#e6f7e6", // brand-green-500
    textColor: "#18b318"
  },
  

  {
    id: 'poster',
    name: 'Biome Brigade Poster',
    displayText: 'Poster',
    weight: 350,
    color: "#18b318", // brand-navy-900
    textColor: "#FFFFFF"
  },
  {
    id: 'eli-cole-toy',
    name: 'Eli Cole Dog Toy',
    displayText: 'Eli Toy',
    weight: 50,
    color: "#438ee1", // brand-red-300
    textColor: "#FFFFFF"
  }
  
];