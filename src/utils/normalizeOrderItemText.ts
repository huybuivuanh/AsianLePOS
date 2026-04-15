function upperTrim(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function normalizeOrderItemTextForDb(item: OrderItem): OrderItem {
  const instructions = item.instructions ? upperTrim(item.instructions) : "";
  const extras = (item.extras ?? []).map((e) => ({
    ...e,
    description: upperTrim(e.description),
  }));
  const changes = (item.changes ?? []).map((c) => ({
    ...c,
    from: upperTrim(c.from),
    to: upperTrim(c.to),
  }));

  const out: OrderItem = {
    ...item,
    extras,
    changes,
  };

  if (instructions) out.instructions = instructions;
  else delete (out as Partial<OrderItem>).instructions;

  return out;
}

