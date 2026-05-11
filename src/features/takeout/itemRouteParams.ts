export type BuiltItemScreenParams = {
  itemId: string;
  orderType: string;
  orderItemId?: string;
};

export function buildItemScreenParams(
  item: MenuItem,
  options: {
    orderType: string;
    orderItemId?: string;
  }
): BuiltItemScreenParams {
  const base: BuiltItemScreenParams = {
    itemId: item.id!,
    orderType: options.orderType,
  };
  if (options.orderItemId) {
    base.orderItemId = options.orderItemId;
  }
  return base;
}
