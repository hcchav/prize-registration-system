import { supabase } from './supabase';

export interface Prize {
  id: string;
  name: string;
  weight: number;
  stock: number;
  [key: string]: any; // For any additional fields
}

// Type guard to check if an object is a Prize
function isPrize(obj: any): obj is Prize {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'weight' in obj &&
    'stock' in obj
  );
}

export async function getAvailablePrize(): Promise<Prize | null> {
  try {
    // Get all available prizes from the database
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .gt('stock', 0) // Only include prizes with stock > 0
      .returns<Prize[]>();
      
    const prizes = data || [];

    if (error) {
      console.error('Error fetching prizes:', error);
      return null;
    }

    if (!prizes || prizes.length === 0) {
      return null; // No prizes available
    }

    // Calculate total weight for probability distribution
    const totalWeight = prizes.reduce<number>((sum, prize) => {
      const weight = isPrize(prize) ? prize.weight : 0;
      return sum + (weight || 1);
    }, 0);
    
    let random = Math.random() * totalWeight;
    
    // Select a prize based on weight
    let selectedPrize: Prize | null = null;
    for (const prize of prizes) {
      if (!isPrize(prize)) continue;
      const weight = prize.weight || 1;
      random -= weight;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Fallback to first prize if selection failed
    if (!selectedPrize) {
      selectedPrize = prizes[0];
    }

    if (!selectedPrize) {
      throw new Error('No prize selected');
    }

    // Decrement the stock
    const newStock = (selectedPrize.stock as number) - 1;
    const { error: updateError } = await supabase
      .from('prizes')
      .update({ stock: newStock })
      .eq('id', selectedPrize.id);

    if (updateError) {
      console.error('Error updating prize stock:', updateError);
      return null;
    }

    return selectedPrize;
  } catch (err) {
    console.error('Error in getAvailablePrize:', err);
    return null;
  }
}