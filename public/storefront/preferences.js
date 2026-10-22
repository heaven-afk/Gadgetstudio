// Preferences are convenience data, never an authority for stock or prices.
export function readPreferences(read) {
  try {
    const value = JSON.parse(read());
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
}

export function restoreStorePreferences(store, preferences) {
  const saved = preferences[store.id];
  store.cart = Array.isArray(saved?.cart)
    ? saved.cart.filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.productId === 'string' &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0 &&
          item.quantity <= 100 &&
          store.products.some(
            (product) =>
              product.id === item.productId &&
              product.colors.includes(item.color),
          ),
      )
    : [];
  store.saved = Array.isArray(saved?.saved)
    ? saved.saved.filter(
        (id) =>
          typeof id === 'string' &&
          store.products.some((product) => product.id === id),
      )
    : [];
  return store;
}
