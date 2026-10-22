import { publicRoutes } from './public-routes.mjs';
import { storeRoutes } from './store-routes.mjs';
import { inventoryRoutes } from './inventory-routes.mjs';
import { requestRoutes } from './request-routes.mjs';
import { checkoutRoutes } from './checkout-routes.mjs';
import { ApiError, fail, json } from './http.mjs';

export async function handleApi(request, db, bucket, user) {
  try {
    const url = new URL(request.url),
      path = url.pathname.split('/').filter(Boolean).slice(1),
      method = request.method;
    if (!db)
      fail(
        503,
        'The store database is not available. Please try again shortly.',
      );
    if (method !== 'GET' && request.headers.get('origin') !== url.origin)
      fail(403, 'This action must be submitted from this website.');

    const context = { request, db, bucket, user, path, method, id: path[1] };
    const publicResponse = await publicRoutes(context);
    if (publicResponse) return publicResponse;
    if (path[0] !== 'stores' || (path.length > 1 && !path[1]))
      fail(404, 'Endpoint not found.');
    for (const handler of [
      storeRoutes,
      inventoryRoutes,
      requestRoutes,
      checkoutRoutes,
    ]) {
      const response = await handler(context);
      if (response) return response;
    }
    fail(404, 'Endpoint not found.');
  } catch (error) {
    if (error instanceof ApiError)
      return json({ error: error.message }, error.status);
    const message = String(error?.message || '');
    if (/stock|invalid_order_transition|swap_needs_valid_quote/i.test(message))
      return json(
        {
          error:
            'Stock or price changed, or this request needs a valid quote. Refresh before completing it.',
        },
        409,
      );
    if (error?.code === '23505' || /UNIQUE constraint/i.test(message))
      return json(
        {
          error:
            'This reference or store link is already in use. Refresh and try again.',
        },
        409,
      );
    console.error('Store API failure', error?.name, message.slice(0, 300));
    return json(
      { error: 'The request could not be completed. Please try again.' },
      500,
    );
  }
}
