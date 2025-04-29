export async function assignPrize() {
    const { data: prizes } = await supabase.from('prizes').select('*');
    const available = prizes.filter((p: any) => p.quantity > 0);
    if (!available.length) return null;
    const chosen = available[Math.floor(Math.random() * available.length)];
    await supabase.from('prizes').update({ quantity: chosen.quantity - 1 }).eq('id', chosen.id);
    return chosen;
  }