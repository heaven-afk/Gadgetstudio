import { fail } from './http.mjs';
async function imageFile(file) {
  if (
    !file ||
    typeof file === 'string' ||
    !file.size ||
    file.size > 2 * 1024 * 1024
  )
    fail(400, 'Each photo must be a JPEG, PNG or WebP under 2 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' &&
    new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (!png && !jpg && !webp) fail(400, 'Upload a JPEG, PNG or WebP image.');
  return { bytes, type: png ? 'image/png' : jpg ? 'image/jpeg' : 'image/webp' };
}

export { imageFile };
