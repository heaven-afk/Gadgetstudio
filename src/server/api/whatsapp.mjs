const naira = (n) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(n);

function orderMessage(s, r) {
  return `Hello ${s.name}, I’d like to order:\n\n${r.items.map((i) => `${i.name} — ${i.storage}, ${i.color}, ${i.condition}\nQty: ${i.quantity} × ${naira(i.price)} = ${naira(i.price * i.quantity)}`).join('\n\n')}\n\nProduct total: ${naira(r.total)}\nDelivery fee: please confirm\nName: ${r.customer}\nPhone: ${r.phone}\nReceive via: ${r.fulfillment}\nAddress: ${r.address}${r.notes ? '\nNotes: ' + r.notes : ''}\nReference: ${r.id}\n\nPlease confirm availability, payment and warranty terms.`;
}

function swapMessage(s, r) {
  return `Hello ${s.name}, I’d like to request a device swap.\n\nMy device: ${r.device.model}\nStorage: ${r.device.storage}\nColour: ${r.device.color}\nCondition: ${r.device.condition}\nBattery: ${r.device.battery || 'Not known'}\nRepair history: ${r.device.repairs}\nFaults / damage: ${r.device.faults}\nAccessories: ${r.device.accessories}\n\nDesired device: ${r.target.name} — ${r.target.storage}, ${r.target.color}, ${r.target.condition}\nListed price: ${naira(r.total)} (before assessment)\nPhotos attached to request: ${r.photoKeys.length}\n\nName: ${r.customer}\nPhone: ${r.phone}\n${r.notes ? 'Notes: ' + r.notes + '\n' : ''}Reference: ${r.id}\n\nPlease assess my device and confirm eligibility, trade-in credit and any top-up after inspection. I understand that this is a request, not an approved swap.`;
}

function responseFor(s, r) {
  return {
    request: r,
    whatsappUrl: `https://wa.me/${s.phone}?text=${encodeURIComponent(r.kind === 'swap' ? swapMessage(s, r) : orderMessage(s, r))}`,
  };
}

export { naira, orderMessage, swapMessage, responseFor };
