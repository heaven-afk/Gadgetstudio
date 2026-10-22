class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const fail = (status, message) => {
  throw new ApiError(status, message);
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

async function limitedBody(request, max) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      fail(413, 'The request is too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

async function body(request, max = 80000) {
  if (!request.headers.get('content-type')?.includes('application/json'))
    fail(415, 'Use JSON for this request.');
  try {
    const value = JSON.parse(
      new TextDecoder().decode(await limitedBody(request, max)),
    );
    if (!value || typeof value !== 'object' || Array.isArray(value))
      fail(400, 'Submit an object with the required fields.');
    return value;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    fail(400, 'Invalid request data.');
  }
}

async function form(request) {
  const bytes = await limitedBody(request, 3.5 * 1024 * 1024);
  try {
    return await new Response(bytes, {
      headers: { 'content-type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    fail(400, 'Invalid upload.');
  }
}

export { ApiError, fail, json, limitedBody, body, form };
