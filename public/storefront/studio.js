import { filterRequests } from './request-filters.js';
import { $, $$, esc, money } from './dom.js';
import { icon } from './icons.js';
export function createStudio({ store, getAccount, getManagedStores, getTab }) {
  const requestFilters = { kind: 'all', status: 'open', search: '' };
  function updateRequestFilters(values) {
    Object.assign(requestFilters, values);
    renderRequestList();
  }
  function renderStudio() {
    const account = getAccount(),
      managedStores = getManagedStores(),
      studioTab = getTab();
    $('#store-select').innerHTML =
      '<option value="">Choose your store</option>' +
      managedStores
        .map(
          (s) =>
            `<option value="${esc(s.id)}" ${s.id === store().id ? 'selected' : ''}>${esc(s.name)}</option>`,
        )
        .join('');
    $$('.studio-tabs button').forEach((b) =>
      b.classList.toggle('active', b.dataset.studio === studioTab),
    );
    $('#studio-notice').innerHTML =
      icon('shield') +
      ' <span>' +
      (account
        ? 'Signed in as ' +
          esc(account.displayName) +
          '. Your store data is protected and shared across your devices.'
        : 'Sign in to create and manage your own gadget store. Customers can browse and submit requests through your public store link.') +
      '</span>';
    if (!account) {
      $('#studio-content').innerHTML =
        `<div class="studio-welcome"><span class="eyebrow">YOUR BUSINESS. YOUR OWN SPACE.</span><h2>Give your gadgets<br>a place to <span class="serif">shine.</span></h2><p>Create your storefront, manage your stock, and review orders and swaps in one place.</p><a class="button primary" href="/sign-in?next=/dashboard" target="_top">Sign in to your store ${icon('arrow')}</a></div>`;
      return;
    }
    if (!store().canManage) {
      $('#studio-content').innerHTML =
        `<div class="studio-welcome"><span class="eyebrow">A LITTLE TECH. YOUR OWN BUSINESS.</span><h2>Welcome to your<br>seller <span class="serif">studio.</span></h2><p>${managedStores.length ? 'Choose one of your stores above or create another.' : 'Create your first store to start managing your catalogue, inventory, orders and swaps.'}</p><button class="button primary" data-action="create-store">Create your store ${icon('arrow')}</button></div>`;
      return;
    }
    if (studioTab === 'settings') {
      renderSettings();
      return;
    }
    if (studioTab === 'requests') {
      renderRequests();
      return;
    }
    if (studioTab === 'archived') {
      const products = store().archivedProducts || [];
      $('#studio-content').innerHTML =
        studioLinks() +
        `<div class="studio-content-header"><div><h2>Archived listings<span class="orange">.</span></h2><p>Review prices and stock before restoring a listing to your public storefront.</p></div></div>${products.length ? `<div class="inventory-table-wrap"><table class="inventory-table"><thead><tr><th>PRODUCT / CONFIGURATION</th><th>PRICE</th><th>STOCK</th><th>ACTIONS</th></tr></thead><tbody>${products.map((p) => `<tr><td><strong>${esc(p.name)}</strong><br>${esc(p.storage)} · ${esc(p.condition)}</td><td>${money(p.price)}</td><td>${p.stock}</td><td><button class="table-action" data-restore="${esc(p.id)}">Restore listing</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><h3>No archived listings.</h3><p>Listings you archive will appear here.</p></div>'}`;
      return;
    }
    if (studioTab === 'activity') {
      renderActivity();
      return;
    }
    const ps = store().products;
    $('#studio-content').innerHTML =
      studioLinks() +
      `<div class="studio-content-header"><div><h2>Your collection<span class="orange">.</span></h2><p>Products and prices are shared across your storefront and seller studio.</p></div><button class="button dark small" data-action="add-product">+ Add product</button></div><div class="stats-grid"><div class="stat"><span>PRODUCT LISTINGS</span><strong>${ps.length}</strong></div><div class="stat"><span>UNITS IN STOCK</span><strong>${ps.reduce((s, p) => s + p.stock, 0)}</strong></div><div class="stat"><span>LOW STOCK / ≤ 2</span><strong>${ps.filter((p) => p.stock <= 2).length}</strong></div></div>${ps.length ? `<div class="inventory-table-wrap"><table class="inventory-table"><thead><tr><th>PRODUCT / CONFIGURATION</th><th>CONDITION</th><th>PRICE</th><th>STOCK</th><th>ACTIONS</th></tr></thead><tbody>${ps.map((p) => `<tr><td><div class="table-product"><img src="${esc(p.image)}" alt=""><div><strong>${esc(p.name)}</strong><small>${esc(p.storage)} · ${esc(p.colors.join(', '))}</small></div></div></td><td>${esc(p.condition)}</td><td>${money(p.price)}</td><td class="${p.stock <= 2 ? 'low-stock' : ''}">${p.stock}</td><td><button class="table-action" data-edit="${esc(p.id)}">Edit</button><button class="table-action" data-sale="${esc(p.id)}" ${p.stock === 0 ? 'disabled' : ''}>Record sale</button><button class="table-action" data-delete="${esc(p.id)}">Archive</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><h3>Your collection starts here.</h3><p>Add your first gadget and share your store link.</p></div>'}`;
  }
  function studioLinks() {
    return `<div class="studio-links"><span>/s/${esc(store().slug)}</span><button data-action="copy-store-link">Copy store link ↗</button><button data-action="refresh-store">Refresh data ↻</button><button data-action="signout">Sign out</button></div>`;
  }
  function renderSettings() {
    const s = store();
    $('#studio-content').innerHTML =
      studioLinks() +
      `<div class="studio-content-header"><div><h2>Make it your store<span class="orange">.</span></h2><p>Customers see these settings on your storefront.</p></div></div><form class="settings-form" id="settings-form"><label class="form-label">Business name<input name="name" required maxlength="70" value="${esc(s.name)}"></label><label class="form-label">Short display name<input name="displayName" required maxlength="22" value="${esc(s.displayName)}"></label><label class="form-label full">WhatsApp business number<input name="phone" type="tel" placeholder="e.g. +234 803 123 4567" value="${esc(s.phone)}" maxlength="25"><small>Use the full international number. Leave blank to keep ordering disabled.</small></label><label class="form-label full">Pickup / store address<textarea name="address" maxlength="500">${esc(s.address)}</textarea></label><label class="checkbox-label full"><input type="checkbox" name="pickup" ${s.pickup ? 'checked' : ''}> Offer physical store pickup</label><label class="checkbox-label full"><input type="checkbox" name="sampleCatalogue" ${s.sampleCatalogue ? 'checked' : ''}> Show sample catalogue notice (turn off after verifying your listings)</label><label class="checkbox-label full"><input type="checkbox" name="acceptsSwaps" ${s.acceptsSwaps ? 'checked' : ''}> Accept device swap requests</label><label class="form-label full">Swap policy<textarea name="swapPolicy" maxlength="1000">${esc(s.swapPolicy || '')}</textarea><small>Explain eligible devices and inspection requirements. Quotes are set by you after assessment.</small></label><div class="full"><button class="button primary" type="submit">Save store settings ${icon('check-circle')}</button></div></form>`;
  }
  function renderRequests() {
    $('#studio-content').innerHTML =
      studioLinks() +
      '<div class="studio-content-header"><div><h2>Conversations to <span class="serif">conversions.</span></h2><p>Website requests are saved here. WhatsApp sending, payment and delivery are not tracked automatically. Showing the latest 200 requests.</p></div></div>' +
      '<div class="request-tools"><label>Search requests<input type="search" id="request-search" maxlength="150" placeholder="Customer, phone, reference or device"></label><label>Request status<select id="request-status"><option value="open">Open requests</option><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="quoted">Quoted</option><option value="completed">Completed</option><option value="declined">Declined</option></select></label></div>' +
      '<div class="request-filters"><button data-request-filter="all">All requests</button><button data-request-filter="order">Orders</button><button data-request-filter="swap">Swaps</button></div><p id="request-count" role="status" aria-live="polite"></p><div id="request-list"></div>';
    $('#request-search').value = requestFilters.search;
    $('#request-status').value = requestFilters.status;
    renderRequestList();
  }
  function renderRequestList() {
    const requests = store().requests || [];
    const matches = filterRequests(requests, requestFilters);
    $$('[data-request-filter]').forEach((button) => {
      const active = button.dataset.requestFilter === requestFilters.kind;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#request-count').textContent =
      matches.length + ' of ' + requests.length + ' loaded requests';
    $('#request-list').innerHTML = matches.length
      ? matches.map(requestCard).join('')
      : '<div class="empty-state"><h3>No matching requests.</h3><p>Try another search or choose a different status.</p></div>';
  }
  function requestCard(r) {
    const isSwap = r.kind === 'swap',
      terminal = ['completed', 'declined'].includes(r.status);
    return `<article class="order-card request-card" data-request-kind="${r.kind}"><div class="order-card-header"><div><span class="eyebrow">${isSwap ? 'DEVICE SWAP' : 'ORDER REQUEST'} / #${esc(r.id.slice(0, 8).toUpperCase())}</span><h3>${esc(r.customer)}</h3><p>${new Date(r.created).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} · ${esc(r.phone)}</p></div><span class="order-status status-${r.status}">${esc(r.status)}</span></div>${isSwap ? `<div class="swap-comparison"><div><span>THEIR DEVICE</span><h4>${esc(r.device.model)}</h4><p>${esc(r.device.storage)} · ${esc(r.device.color)} · ${esc(r.device.condition)}</p><p>Battery: ${esc(r.device.battery || 'Not known')}</p><p>Repairs: ${esc(r.device.repairs)}</p><p>Faults / damage: ${esc(r.device.faults)}</p><p>Accessories: ${esc(r.device.accessories)}</p><p>Activation lock: ${esc(r.device.lockStatus)}</p></div><div><span>REQUESTED UPGRADE</span><h4>${esc(r.target.name)}</h4><p>${esc(r.target.storage)} · ${esc(r.target.color)} · ${esc(r.target.condition)}</p><p>Price at request: ${money(r.total)}</p></div></div><div class="swap-photos">${r.photoKeys.map((k) => `<a href="/api/stores/${store().id}/swap-images/${esc(k)}" target="_blank" rel="noopener"><img src="/api/stores/${store().id}/swap-images/${esc(k)}" alt="Customer device photo" loading="lazy"></a>`).join('')}</div>${r.credit !== null ? `<div class="quote-summary"><span>Quote price <strong>${money(r.quotePrice)}</strong></span><span>Trade-in credit <strong>${money(r.credit)}</strong></span><span>Customer top-up <strong>${money(r.topUp)}</strong></span></div>` : ''}` : r.items.map((i) => `<p>${esc(i.name)} / ${esc(i.storage)} / ${esc(i.color)} / ${esc(i.condition)} × ${i.quantity} — ${money(i.price * i.quantity)}</p>`).join('') + `<p><strong>Product total: ${money(r.total)}</strong></p><p>${esc(r.fulfillment)}: ${esc(r.address)}</p>`}${r.notes ? `<p>Customer note: ${esc(r.notes)}</p>` : ''}${r.sellerNote ? `<p>Seller assessment: ${esc(r.sellerNote)}</p>` : ''}<div class="request-actions">${!terminal ? `${r.status === 'submitted' ? `<button class="button small" data-review-request="${r.id}">Start review</button>` : ''}${isSwap ? `<button class="button small dark" data-quote-request="${r.id}">${r.status === 'quoted' ? 'Update quote' : 'Assess & quote'}</button>` : ''}${!isSwap || r.status === 'quoted' ? `<button class="button small dark" data-complete-request="${r.id}">Complete ${isSwap ? 'swap' : 'sale'}</button>` : ''}<button class="table-action" data-decline-request="${r.id}">Decline</button>` : ''}${store().phone ? `<button class="table-action" data-share-request="${r.id}">Copy ${isSwap && r.credit !== null ? 'quote' : 'request'} summary</button>` : ''}</div>${isSwap ? '<p class="request-disclaimer">Inspect the physical device, verify ownership and agree payment before completing. The received device must be added as its own inventory listing after inspection.</p>' : ''}</article>`;
  }
  function renderActivity() {
    const events = store().events || [];
    $('#studio-content').innerHTML =
      studioLinks() +
      `<div class="studio-content-header"><div><h2>Every unit. <span class="serif">Accounted for.</span></h2><p>The latest 100 stock changes, including physical sales and completed requests.</p></div></div><div class="inventory-table-wrap"><table class="inventory-table"><thead><tr><th>WHEN</th><th>DEVICE</th><th>CHANGE</th><th>BALANCE</th><th>REASON</th></tr></thead><tbody>${events.map((e) => `<tr><td>${new Date(e.created).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}</td><td>${esc(e.name)}</td><td>${e.delta > 0 ? '+' : ''}${e.delta}</td><td>${e.balance}</td><td>${esc(e.reason)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  return { renderStudio, updateRequestFilters };
}
