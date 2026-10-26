import { readPreferences, restoreStorePreferences } from './preferences.js';
import { createStudio } from './studio.js';
import { api } from './api.js';
import { $, $$, esc, money } from './dom.js';
import { icon } from './icons.js';
import { mountStandaloneIdleSession } from './session-idle.js';
function hydrateIcons(root = document) {
  $$('[data-icon]', root).forEach((e) => (e.innerHTML = icon(e.dataset.icon)));
}
const isStudioPage = location.pathname.startsWith('/dashboard');
if (isStudioPage) mountStandaloneIdleSession();
const STORAGE_KEY = 'heaven-shopping-v2';
const preferences = readPreferences(() => localStorage.getItem(STORAGE_KEY));
function defaultState() {
  if (!window.__INITIAL_STORE__)
    throw new Error('Storefront data is missing. Reload the page.');
  const s = restorePrefs(window.__INITIAL_STORE__);
  return { activeStore: s.id, stores: [s] };
}
let state = defaultState(),
  account = null,
  managedStores = [];
const store = () => state.stores.find((s) => s.id === state.activeStore);
let filters = {
  category: 'All',
  condition: 'All',
  search: '',
  sort: 'featured',
  saved: false,
};
let detail = { id: null, color: null, quantity: 1 },
  studioTab = 'inventory',
  toastTimer,
  lastDraft = null,
  swapRequestKey = crypto.randomUUID();
const { renderStudio, updateRequestFilters } = createStudio({
  store,
  getAccount: () => account,
  getManagedStores: () => managedStores,
  getTab: () => studioTab,
});
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4500);
}
function persist() {
  preferences[store().id] = { cart: store().cart, saved: store().saved };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    toast('Your browser could not save your bag for next time.');
  }
}
function showDialog(id) {
  const d = $('#' + id);
  if (!d.open) d.showModal();
}
function closeDialog(id) {
  $('#' + id).close();
}
function restorePrefs(store) {
  return restoreStorePreferences(store, preferences);
}
function applyBrand() {
  const s = store();
  $$('[data-store-name]').forEach(
    (e) => (e.innerHTML = `${esc(s.displayName)}<span class="orange">.</span>`),
  );
  $('#footer-store-name').textContent = s.name;
  document.title = `${s.name} — Your next upgrade starts here.`;
  $('#store-status').textContent =
    s.sample || s.sampleCatalogue
      ? 'Sample catalogue · confirm details before ordering'
      : s.name + ' · Order directly on WhatsApp';
  $('#swap-section').hidden = !s.acceptsSwaps;
  $$('.nav-swap').forEach((e) => (e.hidden = !s.acceptsSwaps));
  $('#swap-policy-copy').textContent =
    s.swapPolicy || 'All swaps are subject to inspection and seller approval.';
}
async function loadStore(slug, { manage = false, navigate = true } = {}) {
  const s = await api('store/' + encodeURIComponent(slug));
  let full = s;
  if (manage && s.canManage) full = await api(`stores/${s.id}/manage`);
  restorePrefs(full);
  state = { activeStore: full.id, stores: [full] };
  checkoutValues = {};
  lastDraft = null;
  if (navigate && !isStudioPage) history.replaceState(null, '', '/s/' + s.slug);
  clearFilters();
  refreshAll();
  return full;
}
async function refreshServer() {
  const current = store();
  if (current.sample) return;
  if (current.canManage) {
    const full = await api(`stores/${current.id}/manage`);
    Object.assign(current, full);
  } else {
    const full = await api('store/' + current.slug);
    Object.assign(current, full);
  }
  lastDraft = null;
  refreshAll();
}
async function initialise() {
  try {
    const me = await api('me');
    account = me.user;
    managedStores = me.stores;
    const slug = location.pathname.match(/^\/s\/([^/]+)/)?.[1];
    if (slug) await loadStore(decodeURIComponent(slug), { navigate: false });
    else if (isStudioPage && managedStores.length)
      await loadStore(managedStores[0].slug);
    if (location.hash === '#studio' || isStudioPage) await openStudio();
  } catch (error) {
    if (location.pathname.startsWith('/s/')) {
      store().products = [];
      renderProducts();
      $('#result-count').textContent = 'Store unavailable';
    }
    if (isStudioPage) {
      $('#studio-content').innerHTML =
        `<div class="empty-state"><h3>Couldn’t load your workspace.</h3><p>${esc(error.message)}</p><button class="button dark" data-action="dashboard">Try again</button></div>`;
    }
    toast(error.message);
  }
}

function countBag() {
  const count = store().cart.reduce((s, i) => s + i.quantity, 0);
  $$('.bag-count').forEach((e) => (e.textContent = count));
  $('.bag-button').setAttribute(
    'aria-label',
    `Open shopping bag, ${count} items`,
  );
}
function getProducts() {
  let products = store().products.filter(
    (p) =>
      (filters.category === 'All' || p.category === filters.category) &&
      (filters.condition === 'All' ||
        p.condition === filters.condition ||
        (filters.condition === 'Pre-loved' && p.condition !== 'Brand new')) &&
      (!filters.saved || store().saved.includes(p.id)) &&
      `${p.name} ${p.brand} ${p.storage} ${p.condition}`
        .toLowerCase()
        .includes(filters.search.toLowerCase()),
  );
  if (filters.sort === 'low') products.sort((a, b) => a.price - b.price);
  if (filters.sort === 'high') products.sort((a, b) => b.price - a.price);
  if (filters.sort === 'name')
    products.sort((a, b) => a.name.localeCompare(b.name));
  return products;
}
function renderProducts() {
  const products = getProducts();
  $('#result-count').textContent =
    `${products.length} ${products.length === 1 ? 'good find' : 'good finds'}${filters.category !== 'All' ? ' / ' + filters.category : ''}`;
  const activeCount =
    Number(filters.condition !== 'All') +
    Number(!!filters.search) +
    Number(filters.sort !== 'featured');
  $('#filter-count').textContent = activeCount ? ` (${activeCount})` : '';
  $$('.category-tabs [data-category]').forEach((e) => {
    e.classList.toggle('active', e.dataset.category === filters.category);
    e.setAttribute(
      'aria-pressed',
      String(e.dataset.category === filters.category),
    );
  });
  $('#products').innerHTML =
    (filters.saved
      ? '<div class="saved-mode-banner">Your saved finds <button data-action="exit-saved">Back to all gadgets</button></div>'
      : '') +
    (products.length
      ? products
          .map(
            (p) =>
              `<article class="product-card reveal"><div class="product-image-wrap"><button class="product-open" data-product="${esc(p.id)}" aria-label="View ${esc(p.name)}"><img src="${esc(p.image)}" alt="${esc(p.name)} — illustrative product photo" loading="lazy"></button><span class="condition-tag ${p.condition.toLowerCase().replaceAll(' ', '-')}">${esc(p.condition)}</span><button class="save-button ${store().saved.includes(p.id) ? 'saved' : ''}" data-save="${esc(p.id)}" aria-label="${store().saved.includes(p.id) ? 'Unsave' : 'Save'} ${esc(p.name)}" aria-pressed="${store().saved.includes(p.id)}">${icon('heart')}</button><button class="product-quick-add" data-product="${esc(p.id)}" aria-label="Choose options for ${esc(p.name)}">${icon('plus')}</button></div><div class="product-meta"><span>${esc(p.brand.toUpperCase())}</span><span>${p.stock > 0 ? '<i class="stock-dot"></i>IN STOCK' : 'SOLD OUT'}</span></div><h3><button data-product="${esc(p.id)}" style="padding:0;text-align:left">${esc(p.name)}</button></h3><p class="product-subtitle">${esc(p.storage)} · ${esc(p.colors[0] || 'Standard')}</p><div class="price-line">${money(p.price)}</div></article>`,
          )
          .join('')
      : `<div class="empty-state">${icon(filters.saved ? 'heart' : 'search')}<h3>${filters.saved ? 'Your favourites belong here.' : 'No gadgets found.'}</h3><p>${filters.saved ? 'Tap a heart on a gadget to save it for later.' : 'Try another category, condition or search.'}</p><button class="button dark" data-action="clear-filters">Explore all gadgets </button></div>`);
  observeReveals();
}
function setMenuOpen(open) {
  $('.header nav').classList.toggle('open', open);
  const button = $('[data-action="menu"]');
  button.setAttribute('aria-expanded', String(open));
  button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('.header nav').classList.contains('open')) {
    setMenuOpen(false);
    $('[data-action="menu"]').focus();
  }
});
matchMedia('(max-width: 850px)').addEventListener('change', () =>
  setMenuOpen(false),
);
function setCategory(category) {
  filters.category = category;
  filters.saved = false;
  renderProducts();
  setMenuOpen(false);
}
function clearFilters() {
  filters = {
    category: 'All',
    condition: 'All',
    search: '',
    sort: 'featured',
    saved: false,
  };
  $('#condition-filter').value = 'All';
  $('#sort-filter').value = 'featured';
  $('#product-search').value = '';
  renderProducts();
}
function openProduct(id) {
  const p = store().products.find((p) => p.id === id);
  if (!p) return;
  detail = { id, color: p.colors[0] || 'Standard', quantity: 1 };
  renderDetail();
  showDialog('product-dialog');
}
function renderDetail() {
  const p = store().products.find((p) => p.id === detail.id);
  if (!p) return;
  $('#product-detail').innerHTML =
    `<button class="icon-button modal-close" data-close="product-dialog" aria-label="Close product">${icon('close')}</button><div class="product-detail-grid"><div class="detail-image"><img src="${esc(p.image)}" alt="${esc(p.name)} — illustrative product photo"></div><div class="detail-info"><span class="eyebrow">${esc(p.brand.toUpperCase())} / ${esc(p.condition.toUpperCase())}</span><h2>${esc(p.name)}</h2><div class="price-line">${money(p.price)}</div><p>${esc(p.description)}</p><div class="option-group"><span>Configuration</span><div class="option-buttons"><button class="selected" type="button">${esc(p.storage)}</button></div></div><div class="option-group"><span>Colour</span><div class="option-buttons">${p.colors.map((c) => `<button data-color="${esc(c)}" class="${detail.color === c ? 'selected' : ''}" aria-pressed="${detail.color === c}">${esc(c)}</button>`).join('')}</div></div><div class="device-notes"><div>Availability<strong>${p.stock > 0 ? p.stock + ' available' : 'Sold out'}</strong></div><div>Battery<strong>${esc(p.battery || 'Confirm with seller')}</strong></div><div>Includes<strong>${esc(p.accessories || 'Confirm with seller')}</strong></div><div>Warranty<strong>${esc(p.warranty || 'Confirm with seller')}</strong></div>${p.condition !== 'Brand new' ? `<div>Repair history<strong>${esc(p.repairs || 'Confirm with seller')}</strong></div>` : ''}</div>${p.notes ? `<p>${esc(p.notes)}</p>` : ''}<div class="detail-add"><div class="quantity-control"><button data-detail-quantity="-1" aria-label="Decrease quantity" ${detail.quantity <= 1 ? 'disabled' : ''}>−</button><span>${detail.quantity}</span><button data-detail-quantity="1" aria-label="Increase quantity" ${detail.quantity >= p.stock ? 'disabled' : ''}>+</button></div><button class="button primary" data-action="add-to-bag" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock > 0 ? 'Add to bag' : 'Sold out'} ${icon('bag')}</button></div>${store().acceptsSwaps ? `<button class="product-swap-link" data-swap-product="${esc(p.id)}">Have a device to trade in? Explore a swap ${icon('swap')}</button>` : ''}<span class="small-note">${store().sample ? 'Demo imagery & prices. ' : ''}Confirm exact device details with your seller.</span></div></div>`;
}
function addToBag() {
  const p = store().products.find((p) => p.id === detail.id);
  if (!p) return;
  const existing = store().cart.find(
    (i) => i.productId === p.id && i.color === detail.color,
  );
  const totalForProduct = store()
    .cart.filter((i) => i.productId === p.id)
    .reduce((n, i) => n + i.quantity, 0);
  if (totalForProduct + detail.quantity > p.stock) {
    toast(`Only ${p.stock} available. Check the quantity already in your bag.`);
    return;
  }
  if (existing) existing.quantity += detail.quantity;
  else
    store().cart.push({
      id: crypto.randomUUID(),
      productId: p.id,
      color: detail.color,
      quantity: detail.quantity,
    });
  lastDraft = null;
  persist();
  countBag();
  closeDialog('product-dialog');
  toast(`${p.name} added to your bag.`);
}
function cartLines() {
  return store()
    .cart.map((i) => ({
      ...i,
      product: store().products.find((p) => p.id === i.productId),
    }))
    .filter((i) => i.product);
}
function cartTotal() {
  return cartLines().reduce((n, i) => n + i.product.price * i.quantity, 0);
}
function cartValid() {
  const lines = cartLines();
  return (
    lines.length > 0 &&
    lines.every(
      (i) =>
        lines
          .filter((j) => j.productId === i.productId)
          .reduce((n, j) => n + j.quantity, 0) <= i.product.stock,
    )
  );
}
let checkoutValues = {};
function saveCheckoutValues() {
  const f = $('#checkout-form');
  if (f) checkoutValues = Object.fromEntries(new FormData(f));
}
function renderCart() {
  const lines = cartLines();
  if (!lines.length) {
    $('#cart-content').innerHTML =
      `<div class="empty-state">${icon('bag')}<h3>Room for something good.</h3><p>Your next favourite gadget is waiting in the collection.</p><button class="button primary" data-action="continue-shopping">Find your upgrade </button></div>`;
    return;
  }
  $('#cart-content').innerHTML =
    lines
      .map(
        (i) =>
          `<article class="cart-item"><img src="${esc(i.product.image)}" alt="${esc(i.product.name)}"><div><div class="cart-item-top"><h3>${esc(i.product.name)}</h3><button data-remove="${esc(i.id)}" aria-label="Remove ${esc(i.product.name)}">${icon('close')}</button></div><p>${esc(i.product.storage)} · ${esc(i.color)} · ${esc(i.product.condition)}</p><div class="cart-item-price">${money(i.product.price * i.quantity)}</div><div class="cart-item-bottom"><div class="quantity-control"><button data-cart-quantity="${esc(i.id)}" data-delta="-1" aria-label="Decrease ${esc(i.product.name)} quantity" ${i.quantity <= 1 ? 'disabled' : ''}>−</button><span>${i.quantity}</span><button data-cart-quantity="${esc(i.id)}" data-delta="1" aria-label="Increase ${esc(i.product.name)} quantity">+</button></div><span class="small-note">${i.product.stock > 0 ? i.product.stock + ' available' : 'Currently sold out'}</span></div></div></article>`,
      )
      .join('') +
    `<div class="cart-summary"><div class="summary-line total"><span>Product total</span><span>${money(cartTotal())}</span></div><div class="summary-line"><span>Delivery</span><span>Confirmed by seller</span></div><p>Availability and final costs are confirmed on WhatsApp. Adding to your bag does not reserve stock.</p></div>${!cartValid() ? '<div class="config-notice">Some quantities exceed current stock. Update your bag before continuing.</div>' : ''}${!store().phone ? '<div class="config-notice">This store needs a seller’s WhatsApp number before checkout can open.<button data-action="configure-store">Set up store number</button></div>' : ''}<form class="checkout-form" id="checkout-form"><label class="form-label">Your name<input name="name" autocomplete="name" required maxlength="100" value="${esc(checkoutValues.name || '')}" placeholder="What should we call you?"></label><label class="form-label">Phone number<input name="phone" autocomplete="tel" type="tel" required maxlength="25" minlength="7" value="${esc(checkoutValues.phone || '')}" placeholder="Your contact number"></label><fieldset><legend>How would you like to receive it?</legend><label><input type="radio" name="fulfillment" value="delivery" ${checkoutValues.fulfillment !== 'pickup' || !store().pickup ? 'checked' : ''}>Delivery</label>${store().pickup ? `<label><input type="radio" name="fulfillment" value="pickup" ${checkoutValues.fulfillment === 'pickup' ? 'checked' : ''}>Store pickup</label>` : ''}</fieldset><label class="form-label" id="address-label">Delivery address<textarea name="address" autocomplete="street-address" maxlength="500" placeholder="Street address, city and state">${esc(checkoutValues.address || '')}</textarea></label><label class="form-label">Anything else? <span style="color:var(--muted);font-weight:400">Optional</span><textarea name="notes" maxlength="1000" placeholder="Questions or special requests…">${esc(checkoutValues.notes || '')}</textarea></label><button type="submit" class="button" ${!store().phone || !cartValid() ? 'disabled' : ''}>Continue to WhatsApp ${icon('message')}</button><p class="checkout-note">Your request is saved to the seller’s database. Next, open WhatsApp and tap Send. Your order is not confirmed until the seller agrees.</p></form>`;
  syncFulfillment();
}
function syncFulfillment() {
  const f = $('#checkout-form');
  if (!f) return;
  const pickup = f.elements.fulfillment.value === 'pickup';
  $('#address-label').hidden = pickup;
  f.elements.address.required = !pickup;
}
function whatsappURL(message) {
  return `https://wa.me/${store().phone}?text=${encodeURIComponent(message)}`;
}
async function submitCheckout(e) {
  e.preventDefault();
  if (store().sample || !store().phone || !cartValid()) return;
  saveCheckoutValues();
  const form = e.target,
    submit = form.querySelector('[type=submit]');
  submit.disabled = true;
  submit.textContent = 'Preparing your request…';
  try {
    const key = lastDraft || crypto.randomUUID();
    lastDraft = key;
    const result = await api(`stores/${store().id}/orders`, {
      ...checkoutValues,
      idempotencyKey: key,
      items: cartLines().map((i) => ({
        productId: i.productId,
        color: i.color,
        quantity: i.quantity,
        price: i.product.price,
      })),
    });
    lastDraft = key;
    closeDialog('cart-dialog');
    showRequestReady(result, 'order');
  } catch (error) {
    toast(error.message);
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Continue to WhatsApp ' + icon('message');
  }
}
function showRequestReady(result, kind) {
  showInfo(
    kind === 'swap'
      ? 'Your swap request<br>is ready.'
      : 'Your order request<br>is ready.',
    `<div class="request-success">${icon('check-circle')}<span>Saved securely to ${esc(store().name)}</span></div><p>Reference <strong>${esc(result.request.id.slice(0, 8).toUpperCase())}</strong>. Your seller can now review the ${kind === 'swap' ? 'device details and photos' : 'items you selected'}.</p><p>${kind === 'swap' ? 'Your device has not been valued yet. Eligibility and any top-up depend on the seller’s assessment and inspection.' : 'Stock is not reserved. Availability, delivery costs and payment are confirmed by the seller.'}</p><p>Open WhatsApp below, review the prepared message, then tap <strong>Send</strong>.</p>`,
    `<a class="button whatsapp-button" href="${esc(result.whatsappUrl)}" target="_blank" rel="noopener noreferrer">Open WhatsApp & review ${icon('message')}</a>`,
  );
}
async function openStudio(tab = 'inventory') {
  studioTab = tab;
  if (!isStudioPage) showDialog('dashboard-dialog');
  $('#studio-content').innerHTML =
    '<div class="empty-state"><h3>Opening your studio…</h3></div>';
  try {
    const me = await api('me');
    account = me.user;
    managedStores = me.stores;
    if (store().canManage)
      Object.assign(store(), await api(`stores/${store().id}/manage`));
    renderStudio();
  } catch (error) {
    $('#studio-content').innerHTML =
      `<div class="empty-state"><h3>Couldn’t open your studio.</h3><p>${esc(error.message)}</p><button class="button dark" data-action="dashboard">Try again</button></div>`;
  }
}
function safeImage(url) {
  return (
    /^\/assets\/[a-zA-Z0-9._-]+$/.test(url) ||
    /^\/api\/product-images\/[a-zA-Z0-9-]+$/.test(url) ||
    /^https:\/\//.test(url)
  );
}
function openEditor(id) {
  const p = store().products.find((p) => p.id === id) || {
    name: '',
    brand: '',
    category: 'Phones',
    condition: 'Brand new',
    price: '',
    stock: 1,
    storage: '',
    colors: [''],
    image: '/assets/phone.jpg',
    description: '',
    battery: '',
    accessories: '',
    warranty: '',
    repairs: '',
    notes: '',
  };
  $('#editor-title').textContent = id ? 'Edit product' : 'Add a good find';
  $('#product-form').dataset.editId = id || '';
  const input = (label, name, value, type = 'text', extra = '') =>
    `<label class="form-label">${label}<input name="${name}" value="${esc(value)}" type="${type}" ${extra}></label>`;
  $('#product-form').innerHTML =
    `${input('Product name', 'name', p.name, 'text', 'required maxlength="100"')}${input('Brand', 'brand', p.brand, 'text', 'required maxlength="60"')}<label class="form-label">Category<select name="category">${['Phones', 'Laptops', 'Audio', 'Wearables', 'Accessories'].map((v) => `<option ${p.category === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="form-label">Condition<select name="condition">${['Brand new', 'Used', 'Refurbished'].map((v) => `<option ${p.condition === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>${input('Price (₦)', 'price', p.price, 'number', 'required min="1" max="1000000000" step="1"')}${input('Stock quantity', 'stock', p.stock, 'number', 'required min="0" max="100000" step="1"')}${input('Storage / configuration', 'storage', p.storage, 'text', 'required maxlength="100"')}${input('Colours, separated by commas', 'colors', p.colors.join(', '), 'text', 'required maxlength="150"')}<label class="form-label full">Product photo URL<input name="image" value="${esc(p.image)}" required maxlength="2000" placeholder="https://…"><small>Use an HTTPS image URL or a bundled assets/ image.</small></label><label class="form-label full">Or upload a product photo<input name="productPhoto" type="file" accept="image/jpeg,image/png,image/webp"><small>JPEG, PNG or WebP, up to 2 MB.</small></label><label class="form-label full">Description<textarea name="description" required maxlength="1200">${esc(p.description)}</textarea></label>${input('Battery health / status', 'battery', p.battery || '', 'text', 'maxlength="100"')}${input('Accessories included', 'accessories', p.accessories || '', 'text', 'maxlength="150"')}${input('Warranty terms', 'warranty', p.warranty || '', 'text', 'maxlength="150"')}${input('Repair / refurbishment history', 'repairs', p.repairs || '', 'text', 'maxlength="200"')}<label class="form-label full">Condition notes<textarea name="notes" maxlength="1000">${esc(p.notes || '')}</textarea></label><div class="config-notice full">Each listing is one configuration at one price. Add a separate listing for another storage size or a used device with different condition details.</div><button class="button primary full" type="submit">Save product ${icon('check-circle')}</button>`;
  showDialog('editor-dialog');
}
function refreshAll() {
  lastDraft = null;
  applyBrand();
  countBag();
  renderProducts();
  if ($('#dashboard-dialog').open) renderStudio();
  if ($('#cart-dialog').open) renderCart();
}
function showInfo(title, text, button = '') {
  $('#info-content').innerHTML = `<h2>${title}</h2>${text}${button}`;
  showDialog('info-dialog');
}
function help() {
  if (store().phone) {
    showInfo(
      'A real person.<br>A better upgrade.',
      `<p>Ask ${esc(store().name)} about models, availability, condition or delivery.</p>`,
      `<a class="button dark" href="${whatsappURL(`Hello ${store().name}, I’d like some help choosing a gadget.`)}" target="_blank" rel="noopener noreferrer">Chat on WhatsApp ${icon('message')}</a>`,
    );
  } else {
    showInfo(
      'Your store.<br>Your conversations.',
      '<p>The seller’s WhatsApp number hasn’t been set. Add it in Seller studio → Store settings to connect the chat and checkout buttons.</p>',
      '<button class="button primary" data-action="configure-store">Open store settings ' +
        '</button>',
    );
  }
}
let swapPhotos = [];
function openSwap(productId) {
  if (!store().acceptsSwaps) {
    toast('This store is not accepting swaps.');
    return;
  }
  const eligible = store().products.filter((p) => p.stock > 0);
  if (!eligible.length) {
    toast('There are no available devices to swap for right now.');
    return;
  }
  swapRequestKey = crypto.randomUUID();
  const selected = eligible.find((p) => p.id === productId) || eligible[0];
  $('#swap-content').innerHTML =
    `${store().sample ? '<div class="config-notice">This is a demo. Create your own store in Seller studio to receive swap requests.</div>' : !store().phone ? '<div class="config-notice">This seller has not connected a WhatsApp number yet. Swap submissions are currently unavailable.</div>' : ''}<form id="swap-form"><section class="swap-form-step"><span class="eyebrow">01 / THE DEVICE YOU HAVE</span><div class="swap-fields"><label class="form-label">Device model<input name="model" required maxlength="100" placeholder="e.g. iPhone 13 Pro"></label><label class="form-label">Storage / configuration<input name="storage" required maxlength="80" placeholder="e.g. 256GB"></label><label class="form-label">Colour<input name="deviceColor" required maxlength="80" placeholder="e.g. Graphite"></label><label class="form-label">Condition<select name="condition" required><option value="">Select condition</option><option>Like new</option><option>Good — light signs of use</option><option>Fair — visible wear</option><option>Damaged / faulty</option></select></label><label class="form-label">Battery health / status<input name="battery" maxlength="100" placeholder="e.g. 87%, or not known"></label><label class="form-label">Activation / account lock<select name="lockStatus" required><option value="">Select status</option><option>Unlocked — accounts can be removed</option><option>Locked — seller assessment needed</option><option>Not sure</option></select></label><label class="form-label full">Repair history<textarea name="repairs" required maxlength="500" placeholder="Any screen, battery or other repairs? Write ‘None known’ if applicable."></textarea></label><label class="form-label full">Known faults or damage<textarea name="faults" required maxlength="500" placeholder="Describe cracks, scratches or faults. Write ‘None known’ if applicable."></textarea></label><label class="form-label full">Included accessories<input name="accessories" required maxlength="200" placeholder="Box, cable, charger, or device only"></label><label class="photo-upload full"><span>${icon('plus')} Add 1–4 clear device photos</span><small>Front, back, sides and battery health. JPEG, PNG or WebP; up to 2 MB each, 3 MB total. Photos are private to your seller.</small><input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple required aria-label="Device photos"></label><div class="swap-photo-previews full" id="swap-photo-previews"></div></div></section><section class="swap-form-step"><span class="eyebrow">02 / THE UPGRADE YOU WANT</span><div class="swap-fields"><label class="form-label">Desired device<select name="targetId" id="swap-target">${eligible.map((p) => `<option value="${esc(p.id)}" ${p.id === selected.id ? 'selected' : ''}>${esc(p.name)} · ${esc(p.storage)} · ${esc(p.condition)}</option>`).join('')}</select></label><label class="form-label">Colour<select name="color" id="swap-target-color"></select></label></div><div class="swap-price-preview" id="swap-price-preview"></div></section><section class="swap-form-step"><span class="eyebrow">03 / LET’S START THE CONVERSATION</span><div class="swap-fields"><label class="form-label">Your name<input name="name" autocomplete="name" required maxlength="100" placeholder="What should we call you?"></label><label class="form-label">Phone number<input name="phone" type="tel" autocomplete="tel" required minlength="7" maxlength="25" placeholder="Your contact number"></label><label class="form-label full">Anything else? <textarea name="notes" maxlength="1000" placeholder="Questions or details for the seller…"></textarea></label></div><label class="ownership-check"><input type="checkbox" name="ownership" required><span>I own this device and have the right to trade it in. I understand that the seller must inspect it and agree the trade-in value and any top-up before the swap is approved.</span></label></section><div class="swap-form-footer"><div>${icon('shield')} No automatic valuation. No stock reserved.</div><button type="submit" class="button primary" ${store().sample || !store().phone ? 'disabled' : ''}>Prepare swap request ${icon('swap')}</button><p>${esc(store().swapPolicy || 'All swaps are subject to inspection and seller approval.')}</p></div></form>`;
  syncSwapTarget();
  showDialog('swap-dialog');
}
function syncSwapTarget() {
  const p = store().products.find((p) => p.id === $('#swap-target').value);
  if (!p) return;
  $('#swap-target-color').innerHTML = p.colors
    .map((c) => `<option>${esc(c)}</option>`)
    .join('');
  $('#swap-price-preview').innerHTML =
    `<span>Listed device price <strong>${money(p.price)}</strong></span><small>Your trade-in credit and any top-up will be set by the seller after assessment.</small>`;
}
async function submitSwap(form) {
  const files = [...form.elements.photos.files];
  if (
    files.length < 1 ||
    files.length > 4 ||
    files.some((f) => f.size > 2 * 1024 * 1024) ||
    files.reduce((n, f) => n + f.size, 0) > 3 * 1024 * 1024
  ) {
    toast('Add 1–4 photos, up to 2 MB each and 3 MB total.');
    return;
  }
  const v = Object.fromEntries(new FormData(form)),
    p = store().products.find((p) => p.id === v.targetId);
  if (!p || store().sample) return;
  const data = new FormData();
  data.set(
    'details',
    JSON.stringify({
      name: v.name,
      phone: v.phone,
      notes: v.notes,
      targetId: p.id,
      color: v.color,
      price: p.price,
      ownership: v.ownership === 'on',
      idempotencyKey: swapRequestKey,
      device: {
        model: v.model,
        storage: v.storage,
        color: v.deviceColor,
        condition: v.condition,
        battery: v.battery,
        repairs: v.repairs,
        faults: v.faults,
        accessories: v.accessories,
        lockStatus: v.lockStatus,
      },
    }),
  );
  files.forEach((file) => data.append('photos', file));
  const button = form.querySelector('[type=submit]');
  button.disabled = true;
  button.textContent = 'Saving your swap request…';
  try {
    const result = await api(`stores/${store().id}/swaps`, data);
    closeDialog('swap-dialog');
    showRequestReady(result, 'swap');
  } finally {
    button.disabled = false;
    button.innerHTML = 'Prepare swap request ' + icon('swap');
  }
}
function createStorePrompt() {
  if (!account) {
    openStudio();
    return;
  }
  showInfo(
    'Your gadgets.<br>Your own store.',
    '<p>Choose a store name and a unique link. You can update your products and WhatsApp number after setup.</p><form id="create-store-form"><label class="form-label">Business name<input name="name" required maxlength="70" placeholder="e.g. Heaven Gadgets"></label><label class="form-label">Store link<input name="slug" required minlength="3" maxlength="50" pattern="[a-z][a-z0-9]*(-[a-z0-9]+)*" placeholder="e.g. heaven-gadgets"><small>/s/your-store-link</small></label><label class="checkbox-label"><input name="sampleProducts" type="checkbox"> Start with sample products (replace before selling)</label><button class="button primary" type="submit">Create store ' +
      '</button></form>',
  );
}
function quotePrompt(id) {
  const r = store().requests.find((r) => r.id === id),
    p = store().products.find((p) => p.id === r.target.id);
  if (!p || p.stock < 1) {
    toast('The requested device is not currently available.');
    return;
  }
  showInfo(
    'Assess. Agree.<br><span class="serif">Upgrade.</span>',
    `<p>Set your assessment for ${esc(r.customer)}’s ${esc(r.device.model)}. Target device: ${esc(p.name)} at ${money(p.price)}.</p><form id="quote-form" data-request-id="${r.id}"><label class="form-label">Trade-in credit (₦)<input name="credit" type="number" min="0" max="${p.price}" step="1" required value="${r.credit ?? ''}" placeholder="Your assessed device value"></label><div id="quote-live-total" class="quote-live-total">Customer top-up: —</div><label class="form-label">Assessment / quote terms<textarea name="sellerNote" maxlength="1000" placeholder="Inspection result, conditions and next steps…">${esc(r.sellerNote || '')}</textarea></label><p>This records your quote. Share the summary with the customer and agree the swap before completing it.</p><button class="button primary" type="submit">Save quote ${icon('check-circle')}</button></form>`,
  );
}
function completePrompt(id) {
  const r = store().requests.find((r) => r.id === id);
  showInfo(
    r.kind === 'swap' ? 'Complete this swap?' : 'Record the completed sale?',
    `<p>This deducts ${r.kind === 'swap' ? 'one target device' : 'the ordered quantities'} from stock. Complete it only after agreeing the transaction with the customer. Stock and current prices are checked again.</p><form id="complete-request-form" data-request-id="${r.id}"><label class="ownership-check"><input type="checkbox" required><span>${r.kind === 'swap' ? 'I inspected the device, verified ownership, agreed the trade-in credit and top-up, and completed the exchange.' : 'I confirmed this sale and completed the transaction with the customer.'}</span></label><button class="button dark" type="submit">Complete ${r.kind === 'swap' ? 'swap' : 'sale'} ${icon('check-circle')}</button></form>`,
  );
}
async function updateRequest(id, values) {
  const r = store().requests.find((r) => r.id === id);
  await api(
    `stores/${store().id}/requests/${id}`,
    { ...values, revision: r.revision },
    'PATCH',
  );
  await refreshServer();
}
async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast('Copied to clipboard.');
  } catch {
    showInfo(
      'Copy this text.',
      `<textarea readonly class="copy-text">${esc(value)}</textarea>`,
    );
  }
}
async function handleClick(e) {
  if (!e.target.closest('[data-action="menu"]')) setMenuOpen(false);
  const close = e.target.closest('[data-close]');
  if (close) {
    closeDialog(close.dataset.close);
    return;
  }
  const category = e.target.closest('[data-category]');
  if (category) {
    setCategory(category.dataset.category);
    return;
  }
  if (e.target.closest('[data-preloved]')) {
    filters.condition = 'Pre-loved';
    filters.category = 'All';
    filters.saved = false;
    $('#condition-filter').value = 'Pre-loved';
    $('#filter-panel').hidden = false;
    renderProducts();
    return;
  }
  const product = e.target.closest('[data-product]');
  if (product) {
    openProduct(product.dataset.product);
    return;
  }
  const swap = e.target.closest('[data-swap-product]');
  if (swap) {
    closeDialog('product-dialog');
    openSwap(swap.dataset.swapProduct);
    return;
  }
  const color = e.target.closest('[data-color]');
  if (color) {
    detail.color = color.dataset.color;
    renderDetail();
    return;
  }
  const dq = e.target.closest('[data-detail-quantity]');
  if (dq) {
    const p = store().products.find((p) => p.id === detail.id);
    detail.quantity = Math.max(
      1,
      Math.min(p.stock, detail.quantity + Number(dq.dataset.detailQuantity)),
    );
    renderDetail();
    return;
  }
  const saved = e.target.closest('[data-save]');
  if (saved) {
    const id = saved.dataset.save;
    store().saved = store().saved.includes(id)
      ? store().saved.filter((x) => x !== id)
      : [...store().saved, id];
    persist();
    renderProducts();
    return;
  }
  const remove = e.target.closest('[data-remove]');
  if (remove) {
    saveCheckoutValues();
    store().cart = store().cart.filter((i) => i.id !== remove.dataset.remove);
    lastDraft = null;
    persist();
    countBag();
    renderCart();
    return;
  }
  const qty = e.target.closest('[data-cart-quantity]');
  if (qty) {
    saveCheckoutValues();
    const i = store().cart.find((i) => i.id === qty.dataset.cartQuantity),
      p = store().products.find((p) => p.id === i.productId);
    const total = store()
      .cart.filter((i) => i.productId === p.id)
      .reduce((n, i) => n + i.quantity, 0);
    if (Number(qty.dataset.delta) > 0 && total >= p.stock) {
      toast(`Only ${p.stock} available.`);
      return;
    }
    i.quantity = Math.max(1, i.quantity + Number(qty.dataset.delta));
    lastDraft = null;
    persist();
    countBag();
    renderCart();
    return;
  }
  const tab = e.target.closest('[data-studio]');
  if (tab) {
    studioTab = tab.dataset.studio;
    renderStudio();
    return;
  }
  const edit = e.target.closest('[data-edit]');
  if (edit) {
    openEditor(edit.dataset.edit);
    return;
  }
  const sale = e.target.closest('[data-sale]');
  if (sale) {
    const p = store().products.find((p) => p.id === sale.dataset.sale);
    showInfo(
      'Record an in-store sale?',
      `<p>This reduces ${esc(p.name)} stock by one. Record only after completing the sale.</p><form id="record-sale-form" data-product-id="${p.id}" data-key="${crypto.randomUUID()}"><button class="button dark" type="submit">Record one unit sold ${icon('check-circle')}</button></form>`,
    );
    return;
  }
  const restore = e.target.closest('[data-restore]');
  if (restore) {
    const p = store().archivedProducts.find(
      (p) => p.id === restore.dataset.restore,
    );
    showInfo(
      'Restore this listing?',
      `<p>${esc(p.name)} will return to your public catalogue at ${money(p.price)} with ${p.stock} units in stock.</p><form id="restore-form" data-product-id="${esc(p.id)}"><button class="button dark" type="submit">Restore listing</button></form>`,
    );
    return;
  }
  const del = e.target.closest('[data-delete]');
  if (del) {
    const p = store().products.find((p) => p.id === del.dataset.delete);
    showInfo(
      'Archive this listing?',
      `<p>${esc(p.name)} will leave the catalogue. Existing requests and stock history keep their original details.</p><form id="archive-form" data-product-id="${p.id}"><button class="button dark" type="submit">Archive listing ${icon('box')}</button></form>`,
    );
    return;
  }
  const review = e.target.closest('[data-review-request]');
  if (review) {
    await updateRequest(review.dataset.reviewRequest, { status: 'reviewing' });
    toast('Request moved to review.');
    return;
  }
  const quote = e.target.closest('[data-quote-request]');
  if (quote) {
    quotePrompt(quote.dataset.quoteRequest);
    return;
  }
  const complete = e.target.closest('[data-complete-request]');
  if (complete) {
    completePrompt(complete.dataset.completeRequest);
    return;
  }
  const decline = e.target.closest('[data-decline-request]');
  if (decline) {
    showInfo(
      'Decline this request?',
      '<p>This closes the request without changing stock.</p>',
      `<form id="decline-form" data-request-id="${decline.dataset.declineRequest}"><button class="button dark" type="submit">Decline request</button></form>`,
    );
    return;
  }
  const share = e.target.closest('[data-share-request]');
  if (share) {
    const r = store().requests.find((r) => r.id === share.dataset.shareRequest);
    await copyText(
      `${store().name} — ${r.kind === 'swap' ? 'Swap' : 'Order'} #${r.id.slice(0, 8).toUpperCase()}\n${r.kind === 'swap' ? `Your device: ${r.device.model}\nUpgrade: ${r.target.name} / ${r.target.storage}\n${r.credit !== null ? `Quote price: ${money(r.quotePrice)}\nTrade-in credit: ${money(r.credit)}\nTop-up: ${money(r.topUp)}\nAssessment: ${r.sellerNote}\nSubject to agreed inspection and exchange terms.` : 'Assessment pending.'}` : `Product total: ${money(r.total)}\nDelivery and payment: please confirm.`}\nStatus: ${r.status}`,
    );
    return;
  }
  const rf = e.target.closest('[data-request-filter]');
  if (rf) {
    updateRequestFilters({ kind: rf.dataset.requestFilter });
    return;
  }
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'signout') {
    const result = await api('auth/signout', {});
    window.top.location.assign(result.redirect);
    return;
  }
  if (action === 'swap') openSwap();
  if (action === 'add-to-bag') addToBag();
  if (action === 'cart') {
    renderCart();
    showDialog('cart-dialog');
  }
  if (action === 'continue-shopping') {
    closeDialog('cart-dialog');
    $('#shop').scrollIntoView({ behavior: 'smooth' });
  }
  if (action === 'how') $('#how').scrollIntoView({ behavior: 'smooth' });
  if (action === 'filters')
    $('#filter-panel').hidden = !$('#filter-panel').hidden;
  if (action === 'clear-filters') clearFilters();
  if (action === 'search') {
    $('#filter-panel').hidden = false;
    $('#shop').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => $('#product-search').focus({ preventScroll: true }), 350);
  }
  if (action === 'saved') {
    filters.saved = true;
    filters.category = 'All';
    filters.condition = 'All';
    filters.search = '';
    $('#condition-filter').value = 'All';
    $('#product-search').value = '';
    renderProducts();
    $('#shop').scrollIntoView({ behavior: 'smooth' });
  }
  if (action === 'exit-saved') {
    filters.saved = false;
    renderProducts();
  }
  if (action === 'menu')
    setMenuOpen(!$('.header nav').classList.contains('open'));
  if (action === 'help') help();
  if (action === 'dashboard') await openStudio();
  if (action === 'configure-store') {
    closeDialog('info-dialog');
    closeDialog('cart-dialog');
    await openStudio('settings');
  }
  if (action === 'add-product') openEditor();
  if (action === 'create-store') createStorePrompt();
  if (action === 'refresh-store') {
    await refreshServer();
    toast('Store data refreshed.');
  }
  if (action === 'copy-store-link')
    await copyText(location.origin + '/s/' + store().slug);
}
async function handleSubmit(e) {
  const form = e.target;
  if (
    ![
      'checkout-form',
      'swap-form',
      'settings-form',
      'product-form',
      'create-store-form',
      'quote-form',
      'complete-request-form',
      'record-sale-form',
      'archive-form',
      'restore-form',
      'decline-form',
    ].includes(form.id)
  )
    return;
  e.preventDefault();
  if (form.dataset.busy) return;
  form.dataset.busy = 'true';
  const button = form.querySelector('[type=submit]');
  if (button) button.disabled = true;
  try {
    if (form.id === 'checkout-form') {
      await submitCheckout(e);
      return;
    }
    if (form.id === 'swap-form') {
      await submitSwap(form);
      return;
    }
    const v = Object.fromEntries(new FormData(form));
    if (form.id === 'settings-form') {
      await api(
        `stores/${store().id}`,
        {
          ...v,
          revision: store().revision,
          pickup: !!v.pickup,
          acceptsSwaps: !!v.acceptsSwaps,
          sampleCatalogue: !!v.sampleCatalogue,
        },
        'PATCH',
      );
      await refreshServer();
      toast('Store settings saved.');
    }
    if (form.id === 'product-form') {
      let image = v.image;
      const photo = form.elements.productPhoto?.files[0];
      if (photo) {
        const upload = new FormData();
        upload.set('photo', photo);
        image = (await api(`stores/${store().id}/product-photo`, upload)).image;
      }
      const id = form.dataset.editId,
        p = store().products.find((p) => p.id === id);
      await api(
        `stores/${store().id}/products${id ? '/' + id : ''}`,
        {
          ...v,
          image,
          price: Number(v.price),
          stock: Number(v.stock),
          colors: v.colors
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
          revision: p?.revision,
        },
        id ? 'PUT' : 'POST',
      );
      await refreshServer();
      closeDialog('editor-dialog');
      toast('Product saved to your store.');
    }
    if (form.id === 'create-store-form') {
      const s = await api('stores', {
        name: v.name,
        slug: v.slug,
        sampleProducts: !!v.sampleProducts,
      });
      managedStores.push(s);
      await loadStore(s.slug, { manage: true });
      closeDialog('info-dialog');
      studioTab = 'settings';
      renderStudio();
      toast(
        'Store created. Connect your WhatsApp number to start receiving requests.',
      );
    }
    if (form.id === 'quote-form') {
      await updateRequest(form.dataset.requestId, {
        status: 'quoted',
        credit: Number(v.credit),
        sellerNote: v.sellerNote,
      });
      closeDialog('info-dialog');
      toast('Quote saved. Copy the summary to share with your customer.');
    }
    if (form.id === 'complete-request-form') {
      await updateRequest(form.dataset.requestId, { status: 'completed' });
      closeDialog('info-dialog');
      toast('Transaction completed. Stock updated once.');
    }
    if (form.id === 'record-sale-form') {
      await api(`stores/${store().id}/sales`, {
        productId: form.dataset.productId,
        quantity: 1,
        idempotencyKey: form.dataset.key,
      });
      await refreshServer();
      closeDialog('info-dialog');
      toast('Physical sale recorded. Stock updated.');
    }
    if (form.id === 'restore-form') {
      const p = store().archivedProducts.find(
        (p) => p.id === form.dataset.productId,
      );
      await api(`stores/${store().id}/products/${p.id}/restore`, {
        revision: p.revision,
      });
      await refreshServer();
      closeDialog('info-dialog');
      toast('Listing restored to your catalogue.');
    }
    if (form.id === 'archive-form') {
      const p = store().products.find((p) => p.id === form.dataset.productId);
      await api(
        `stores/${store().id}/products/${p.id}`,
        { revision: p.revision },
        'DELETE',
      );
      store().cart = store().cart.filter((i) => i.productId !== p.id);
      persist();
      await refreshServer();
      closeDialog('info-dialog');
      toast('Listing archived.');
    }
    if (form.id === 'decline-form') {
      await updateRequest(form.dataset.requestId, { status: 'declined' });
      closeDialog('info-dialog');
      toast('Request declined. Stock is unchanged.');
    }
  } catch (error) {
    toast(error.message);
  } finally {
    delete form.dataset.busy;
    if (button) button.disabled = false;
  }
}
document.addEventListener('click', (e) => {
  handleClick(e).catch((error) => toast(error.message));
});
document.addEventListener('submit', (e) => {
  handleSubmit(e).catch((error) => toast(error.message));
});
document.addEventListener('input', (e) => {
  e.target.setCustomValidity?.('');
  if (e.target.id === 'request-search')
    updateRequestFilters({ search: e.target.value });
  if (e.target.id === 'product-search') {
    filters.search = e.target.value;
    renderProducts();
  }
  if (e.target.closest('#checkout-form')) lastDraft = null;
  if (e.target.closest('#swap-form')) swapRequestKey = crypto.randomUUID();
  if (e.target.closest('#quote-form') && e.target.name === 'credit') {
    const r = store().requests.find(
        (r) => r.id === $('#quote-form').dataset.requestId,
      ),
      p = store().products.find((p) => p.id === r.target.id);
    $('#quote-live-total').textContent =
      'Customer top-up: ' +
      money(Math.max(0, p.price - Number(e.target.value)));
  }
});
document.addEventListener('change', (e) => {
  if (e.target.id === 'request-status')
    updateRequestFilters({ status: e.target.value });
  if (e.target.id === 'condition-filter') {
    filters.condition = e.target.value;
    renderProducts();
  }
  if (e.target.id === 'sort-filter') {
    filters.sort = e.target.value;
    renderProducts();
  }
  if (e.target.name === 'fulfillment') syncFulfillment();
  if (e.target.id === 'swap-target') syncSwapTarget();
  if (e.target.name === 'photos' && e.target.closest('#swap-form')) {
    swapPhotos.forEach(URL.revokeObjectURL);
    swapPhotos = [...e.target.files]
      .slice(0, 4)
      .map((f) => URL.createObjectURL(f));
    $('#swap-photo-previews').innerHTML = swapPhotos
      .map((url) => `<img src="${url}" alt="Selected device photo">`)
      .join('');
  }
  if (e.target.id === 'store-select') {
    const s = managedStores.find((s) => s.id === e.target.value);
    if (s)
      loadStore(s.slug, { manage: true }).catch((error) =>
        toast(error.message),
      );
  }
});

$$('dialog').forEach((d) =>
  d.addEventListener('click', (e) => {
    if (e.target === d) {
      const rect = d.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      )
        d.close();
    }
  }),
);
document.addEventListener(
  'error',
  (e) => {
    if (e.target.tagName === 'IMG' && !e.target.dataset.fallback) {
      e.target.dataset.fallback = 'true';
      e.target.src = '/assets/hero.png';
    }
  },
  true,
);
let revealObserver;
function observeReveals() {
  if (!revealObserver) return;
  $$('.reveal:not(.in-view)').forEach((e) => revealObserver.observe(e));
}
if (
  'IntersectionObserver' in window &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  document.body.classList.add('motion-ready');
  revealObserver = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      }),
    { threshold: 0.06 },
  );
}
if (
  matchMedia('(pointer:fine)').matches &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches
) {
  $('.hero-art').addEventListener('pointermove', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty(
      '--px',
      `${(e.clientX - r.left - r.width / 2) * 0.025}px`,
    );
    e.currentTarget.style.setProperty(
      '--py',
      `${(e.clientY - r.top - r.height / 2) * 0.025}px`,
    );
  });
  $('.hero-art').addEventListener('pointerleave', (e) => {
    e.currentTarget.style.setProperty('--px', '0px');
    e.currentTarget.style.setProperty('--py', '0px');
  });
}
$('#year').textContent = new Date().getFullYear();
hydrateIcons();
applyBrand();
countBag();
renderProducts();
observeReveals();

initialise();
