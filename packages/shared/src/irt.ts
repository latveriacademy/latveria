export type IrtParameter = { revisionId: string; a: number; b: number };
export type IrtEstimate = { theta: number; standardError: number; score: number };

/** 2PL EAP under a standard-normal prior; scale 500 + 100θ is our simulation scale. */
export function estimate2pl(items: { a: number; b: number; response: 0 | 1 }[]): IrtEstimate {
  if (
    !items.length ||
    items.some(
      (item) =>
        !Number.isFinite(item.a) ||
        item.a <= 0 ||
        !Number.isFinite(item.b) ||
        ![0, 1].includes(item.response),
    )
  )
    throw new RangeError("Parameter atau respons IRT tidak valid.");
  const softplus = (x: number) => Math.max(x, 0) + Math.log1p(Math.exp(-Math.abs(x)));
  const nodes = Array.from({ length: 241 }, (_, index) => {
    const theta = -6 + index * 0.05;
    const logWeight =
      (-theta * theta) / 2 -
      items.reduce((sum, item) => {
        const z = item.a * (theta - item.b);
        return sum + softplus(item.response ? -z : z);
      }, 0);
    return { theta, logWeight };
  });
  const maximum = Math.max(...nodes.map((node) => node.logWeight));
  const weights = nodes.map((node) => Math.exp(node.logWeight - maximum));
  const sum = weights.reduce((n, weight) => n + weight, 0);
  const theta = nodes.reduce((n, node, index) => n + node.theta * weights[index], 0) / sum;
  const variance =
    nodes.reduce((n, node, index) => n + (node.theta - theta) ** 2 * weights[index], 0) / sum;
  return {
    theta,
    standardError: Math.sqrt(variance),
    score: Math.max(0, Math.min(1000, Math.round(500 + 100 * theta))),
  };
}
