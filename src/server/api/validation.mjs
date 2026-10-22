import { fail } from './http.mjs';
const text = (value, max = 500, required = false) => {
  if (
    typeof value !== 'string' ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    fail(400, 'Check the required text fields and their lengths.');
  return value.trim();
};

const integer = (value, min = 0, max = 1e9) => {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail(400, 'Enter a valid whole-number amount or quantity.');
  return value;
};

const safeImage = (value) =>
  typeof value === 'string' &&
  (/^\/assets\/[a-zA-Z0-9._-]+$/.test(value) ||
    /^\/api\/product-images\/[a-zA-Z0-9-]+$/.test(value) ||
    /^https:\/\//.test(value));

function settings(v) {
  const phone = text(v.phone ?? '', 25).replace(/[+\s()-]/g, '');
  if (phone && !/^[1-9]\d{7,14}$/.test(phone))
    fail(
      400,
      'Use the full international WhatsApp number, without a leading zero.',
    );
  const address = text(v.address ?? '', 500);
  if (v.pickup && !address)
    fail(400, 'Add a physical address to offer pickup.');
  return {
    displayName: text(v.displayName, 22, true),
    phone,
    address,
    pickup: !!v.pickup,
    acceptsSwaps: v.acceptsSwaps !== false,
    sampleCatalogue: !!v.sampleCatalogue,
    swapPolicy: text(
      v.swapPolicy ??
        'All swaps are subject to device inspection, ownership checks and an agreed top-up.',
      1000,
    ),
  };
}

function product(v) {
  const colors = Array.isArray(v.colors)
    ? v.colors.map((c) => text(c, 60, true))
    : [];
  if (!colors.length || colors.length > 12)
    fail(400, 'Add between 1 and 12 colours.');
  if (
    !['Phones', 'Laptops', 'Audio', 'Wearables', 'Accessories'].includes(
      v.category,
    ) ||
    !['Brand new', 'Used', 'Refurbished'].includes(v.condition)
  )
    fail(400, 'Select a valid category and condition.');
  if (!safeImage(v.image))
    fail(400, 'Use an HTTPS product photo or an uploaded product image.');
  return {
    name: text(v.name, 100, true),
    brand: text(v.brand, 60, true),
    category: v.category,
    condition: v.condition,
    storage: text(v.storage, 100, true),
    colors,
    image: text(v.image, 2000, true),
    description: text(v.description, 1200, true),
    battery: text(v.battery ?? '', 100),
    accessories: text(v.accessories ?? '', 150),
    warranty: text(v.warranty ?? '', 150),
    repairs: text(v.repairs ?? '', 200),
    notes: text(v.notes ?? '', 1000),
  };
}

function contact(value) {
  const phone = text(value, 25, true),
    digits = phone.replace(/[^0-9]/g, '');
  if (!/^\+?[0-9 ()-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
    fail(400, 'Enter a valid contact phone number.');
  return phone;
}

function customer(v, s) {
  const fulfillment = v.fulfillment === 'pickup' ? 'pickup' : 'delivery';
  if (fulfillment === 'pickup' && !s.pickup)
    fail(400, 'Pickup is not available at this store.');
  return {
    customer: text(v.name, 100, true),
    phone: contact(v.phone),
    fulfillment,
    address: fulfillment === 'pickup' ? s.address : text(v.address, 500, true),
    notes: text(v.notes ?? '', 1000),
  };
}

function retryKey(v) {
  if (typeof v !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(v))
    fail(400, 'Invalid request reference. Refresh and try again.');
  return v;
}

export {
  text,
  integer,
  safeImage,
  settings,
  product,
  contact,
  customer,
  retryKey,
};
