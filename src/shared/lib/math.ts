import Decimal from "decimal.js";

Decimal.set({ precision: 20 });

export { Decimal };

type DecimalValue = number | string | Decimal | undefined | null;

export const round = (value: DecimalValue, decimals = 2): number => {
  return new Decimal(value ?? 0).toDecimalPlaces(decimals).toNumber();
};

export const safeAdd = (...args: DecimalValue[]): number => {
  return args
    .reduce<Decimal>(
      (acc, val) => acc.plus(new Decimal(val ?? 0)),
      new Decimal(0),
    )
    .toDecimalPlaces(2)
    .toNumber();
};

export const safeMult = (...args: DecimalValue[]): number => {
  if (args.length === 0) return 1;
  return args
    .reduce<Decimal>(
      (acc, val) => acc.times(new Decimal(val ?? 0)),
      new Decimal(1),
    )
    .toDecimalPlaces(2)
    .toNumber();
};

export const safeSub = (
  first: DecimalValue,
  ...args: DecimalValue[]
): number => {
  return args
    .reduce<Decimal>(
      (acc, val) => acc.minus(new Decimal(val ?? 0)),
      new Decimal(first ?? 0),
    )
    .toDecimalPlaces(2)
    .toNumber();
};

export const safeDiv = (
  a: DecimalValue,
  b: DecimalValue,
  decimals = 2,
): number => {
  const divisor = new Decimal(b ?? 0);
  if (divisor.isZero()) return 0;
  return new Decimal(a ?? 0)
    .dividedBy(divisor)
    .toDecimalPlaces(decimals)
    .toNumber();
};
