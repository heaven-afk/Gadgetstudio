export async function api(path, data, method = 'POST') {
  const response = await fetch('/api/' + path, {
    method: data === undefined ? 'GET' : method,
    headers:
      data instanceof FormData
        ? {}
        : data === undefined
          ? {}
          : { 'Content-Type': 'application/json' },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
    credentials: 'same-origin',
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      'The server did not return a valid response. Please try again.',
    );
  }
  if (!response.ok)
    throw new Error(result.error || 'This action could not be completed.');
  return result;
}
