import { supabase } from './supabase';

export async function getAvailablePrize(): Promise<string | null> {
  const { data: prizes, error } = await supabase
    .from('prizes')
    .select('*');

  if (error || !prizes) return null;

  const available = prizes.filter(p => p.claimed < p.stock);
  if (available.length === 0) return null;

  const pool = available.flatMap(prize =>
    Array(prize.stock - prize.claimed).fill(prize)
  );

  const selected = pool[Math.floor(Math.random() * pool.length)];

  await supabase
    .from('prizes')
    .update({ claimed: selected.claimed + 1 })
    .eq('id', selected.id);

  return selected.name;
}