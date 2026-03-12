export function buildDisplayChainItems(result) {
  const chain = Array.isArray(result?.chain) ? result.chain : [];
  const items = [];

  for (const step of chain) {
    if (step?.nextUrl) {
      items.push(`${step.status} ${step.url} -> ${step.nextUrl}`);
      continue;
    }

    if (step?.status !== 200) {
      if (step?.finalUrl) {
        items.push(`${step.status} ${step.url} -> ${step.finalUrl}`);
      } else {
        items.push(`${step.status} ${step.url}`);
      }
    }
  }

  return items;
}
