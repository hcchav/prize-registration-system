import { supabase } from './supabase';

export interface Prize {
  id: number;
  name: string;
  stock: number;
  claimed: number;
  created_at: string;
  weight?: number; // Make weight optional since it's not in the database
}
function isPrize(obj: any): obj is Prize {
  return (
    obj &&
    typeof obj === 'object' &&
    'id' in obj &&
    'name' in obj &&
    'stock' in obj &&
    'claimed' in obj
  );
}

export async function getAvailablePrize(): Promise<Prize | null> {
  try {
    console.log('Fetching available prizes...');
    const { data, error } = await supabase
      .from('prizes')
      .select('*')
      .gt('stock', 0) // Only include prizes with stock > 0
      .returns<Prize[]>();
      
    const prizes = data || [];
    console.log('Available prizes:', prizes);

    if (error) {
      console.error('Error fetching prizes:', error);
      return null;
    }

    if (!prizes || prizes.length === 0) {
      console.log('No prizes available');
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
      if (!isPrize(prize)) {
        console.warn('Invalid prize data:', prize);
        continue;
      }
      // When calculating weight, use a default value if weight is not set
      const weight = 'weight' in prize ? prize.weight : 1;
      random -= weight;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Fallback to first prize if selection failed
    if (!selectedPrize) {
      console.log('Using fallback prize selection');
      selectedPrize = prizes[0];
    }

    if (!selectedPrize) {
      console.error('No prize selected after all checks');
      throw new Error('No prize selected');
    }

    console.log('Selected prize:', selectedPrize);

    // Decrement the stock
    const newStock = (selectedPrize.stock as number) - 1;
    console.log(`Updating stock for prize ${selectedPrize.id} (${selectedPrize.name}) to ${newStock}`);
    
    const { error: updateError } = await supabase
      .from('prizes')
      .update({ stock: newStock })
      .eq('id', selectedPrize.id);

    if (updateError) {
      console.error('Error updating prize stock:', updateError);
      throw updateError;
    }

    return selectedPrize;
  } catch (err) {
    console.error('Error in getAvailablePrize:', err);
    return null;
  }
}