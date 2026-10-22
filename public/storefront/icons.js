const paths = {
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  box: '<path d="m12 2 9 5-9 5-9-5 9-5ZM3 7v10l9 5 9-5V7M12 12v10M7.5 4.5l9 5"/>',
  message:
    '<path d="M21 11.5a9 9 0 0 1-13.2 8L3 21l1.4-4.7A9 9 0 1 1 21 11.5Z"/><path d="M8 7.5c0 4 4 8 8 8l1-2-3-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-3-2.5.5Z"/>',
  sparkles:
    '<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3ZM20 2v4M18 4h4"/>',
  phone:
    '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>',
  laptop:
    '<rect x="4" y="3" width="16" height="13" rx="1"/><path d="m4 16-2 4h20l-2-4M9 20h6"/>',
  headphones:
    '<path d="M3 13v-2a9 9 0 0 1 18 0v2"/><rect x="2" y="11" width="5" height="10" rx="2"/><rect x="17" y="11" width="5" height="10" rx="2"/>',
  watch:
    '<rect x="5" y="6" width="14" height="12" rx="4"/><path d="m8 6 1-5h6l1 5M8 18l1 5h6l1-5M12 9v3l2 1"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z"/>',
  sliders:
    '<path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  swap: '<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
};
const icon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.box}</svg>`;

export { icon };
