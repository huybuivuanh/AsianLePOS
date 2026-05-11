const OPTION_NAMES = {
  EGG_ROLL: "Egg Roll",
  SPRING_ROLL: "Spring Roll",
  RICE: "Rice",
  NOODLES: "Noodles",
};

function preprocessOrderItem(item: OrderItem): OrderItem {
  const processed = { ...item };
  if (!Array.isArray(processed.options) || processed.options.length === 0) return processed;

  if (processed.name === "#3") {
    const mainOption = processed.options.find(
      (opt) => opt.name !== OPTION_NAMES.EGG_ROLL && opt.name !== OPTION_NAMES.SPRING_ROLL,
    );
    if (mainOption) {
      processed.name = `${processed.name}/${mainOption.name}`;
      processed.options = processed.options.filter((opt) => opt !== mainOption);
    }
  }

  const eggOption = processed.options.find((opt) => opt.name === OPTION_NAMES.EGG_ROLL);
  const springOption = processed.options.find((opt) => opt.name === OPTION_NAMES.SPRING_ROLL);
  if ((eggOption || springOption) && !(eggOption && springOption)) {
    processed.name = `${processed.name}/${eggOption ? "ER" : "SP"}`;
    processed.options = processed.options.filter((opt) => opt !== eggOption && opt !== springOption);
  }

  const riceNoodleOption = processed.options.find(
    (opt) => opt.name === OPTION_NAMES.RICE || opt.name === OPTION_NAMES.NOODLES,
  );
  if (riceNoodleOption) {
    processed.name = `${processed.name}/${riceNoodleOption.name === OPTION_NAMES.RICE ? "Rice" : "ND"}`;
    processed.options = processed.options.filter((opt) => opt !== riceNoodleOption);
  }

  return processed;
}

export function preprocessOrderItems(orderItems: OrderItem[]): OrderItem[] {
  if (!Array.isArray(orderItems)) return [];
  return orderItems.map(preprocessOrderItem);
}

function upperTrim(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function normalizeOrderItemTextForDb(item: OrderItem): OrderItem {
  const instructions = item.instructions ? upperTrim(item.instructions) : "";
  const extras = (item.extras ?? []).map((e) => ({ ...e, description: upperTrim(e.description) }));
  const changes = (item.changes ?? []).map((c) => ({ ...c, from: upperTrim(c.from), to: upperTrim(c.to) }));
  const out: OrderItem = { ...item, extras, changes };
  if (instructions) out.instructions = instructions;
  else delete (out as Partial<OrderItem>).instructions;
  return out;
}
