// lib/prize-logic.ts

import { supabase } from './supabase';

interface Prize {
  id: number;
  name: string;
  quantity: number;
}

export async function assignPrize(): Promise<Prize | null> {
  const { data: prizes } = await supabase.from('prizes').select('*');

  if (!prizes) return null;

  const available = (prizes as Prize[]).filter((p) => p.quantity > 0);
  if (!available.length) return null;

  const chosen = available[Math.floor(Math.random() * available.length)];

  await supabase
    .from('prizes')
    .update({ quantity: chosen.quantity - 1 })
    .eq('id', chosen.id);

  return chosen;
}
