'use strict';

const STORAGE_KEY = 'postmark-collection-v1';
const samples = [
  { id: 'sample-japan', name: 'Mount Fuji', country: 'Japan', year: '1962', price: 18, sample: 'japan' },
  { id: 'sample-france', name: 'Fleurs de France', country: 'France', year: '1959', price: 24, sample: 'france' },
  { id: 'sample-italy', name: 'The Italian Coast', country: 'Italy', year: '1973', price: 32, sample: 'italy' },
  { id: 'sample-britain', name: 'Garden Birds', country: 'United Kingdom', year: '1966', price: 15, sample: 'britain' },
  { id: 'sample-usa', name: 'Desert Blooms', country: 'United States', year: '1981', price: 12, sample: 'usa' },
  { id: 'sample-switzerland', name: 'Alpine Wanderings', country: 'Switzerland', year: '1967', price: 45, sample: 'switzerland' }
];
const sampleDesigns = {
  japan: ['#d7e4dc', '#718f83', 'JAPAN · NIPPON', '☀', '80'],
  france: ['#e7d6cf', '#b57c6b', 'RÉPUBLIQUE FRANÇAISE', '✿', '20'],
  italy: ['#d8e6e1', '#759d9d', 'ITALIA', '≈', '70'],
  britain: ['#e5e0cc', '#849178', 'GREAT BRITAIN', '❧', '12'],
  usa: ['#ecdcc7', '#c18e72', 'UNITED STATES', '✾', '15'],
  switzerland: ['#dbe2d2', '#8e9f83', 'HELVETIA', '▲', '40']
};
const $ = id => document.getElementById(id);
let stamps;
let selectedStamp;
let toastTimer;

function sampleImage(key) {
  const [background, ink, title, symbol, value] = sampleDesigns[key];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="270" viewBox="0 0 220 270"><rect x="4" y="4" width="212" height="262" fill="#faf8ef" stroke="#faf8ef" stroke-width="8" stroke-dasharray="4 5"/><rect x="17" y="17" width="186" height="236" fill="${background}" stroke="${ink}"/><rect x="24" y="24" width="172" height="222" fill="none" stroke="${ink}" opacity=".5"/><text x="110" y="48" text-anchor="middle" fill="${ink}" font-family="serif" font-size="12" letter-spacing="2">${title}</text><circle cx="110" cy="130" r="63" fill="${ink}" opacity=".12"/><text x="110" y="161" text-anchor="middle" fill="${ink}" font-family="serif" font-size="100">${symbol}</text><path d="M37 200 Q75 177 110 200 T183 200" fill="none" stroke="${ink}" opacity=".6"/><text x="110" y="232" text-anchor="middle" fill="${ink}" font-family="serif" font-size="18" letter-spacing="4">${value} POSTAGE</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function notify(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500);
}

function validStamp(item) {
  return item && typeof item.id === 'string' && item.id.length <= 100 &&
    typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 80 &&
    typeof item.country === 'string' && item.country.trim().length > 0 && item.country.length <= 80 &&
    typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 && item.price <= 1000000 &&
    typeof item.year === 'string' && (item.year === '' || /^(18[4-9]\d|19\d\d|20\d\d|2100)$/.test(item.year)) &&
    (item.sample
      ? typeof item.sample === 'string' && Object.hasOwn(sampleDesigns, item.sample)
      : typeof item.image === 'string' && item.image.length <= 2000000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(item.image));
}

function loadCollection() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return samples.map(item => ({ ...item }));
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(validStamp)) return parsed;
  } catch (error) {
    console.error('Unable to load collection', error);
  }
  notify('Could not load the saved collection. Your saved data has not been changed.');
  return [];
}

function saveCollection(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    stamps = next;
    render();
    return true;
  } catch (error) {
    console.error('Unable to save collection', error);
    notify('Could not save your collection. Your browser storage may be full or unavailable.');
    return false;
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function card(stamp, index) {
  const article = element('article', 'stamp-card');
  const image = element('div', 'stamp-image');
  const number = element('span', 'number', `NO. ${String(index + 1).padStart(2, '0')}`);
  const img = document.createElement('img');
  img.src = stamp.sample ? sampleImage(stamp.sample) : stamp.image;
  img.alt = `Stamp: ${stamp.name}`;
  image.append(number, img);
  const details = element('div', 'stamp-details');
  const meta = element('div', 'stamp-meta');
  meta.append(element('span', '', stamp.country), element('span', '', stamp.sample ? `EXAMPLE${stamp.year ? ` · ${stamp.year}` : ''}` : stamp.year));
  const title = element('h3', '', stamp.name);
  const bottom = element('div', 'stamp-bottom');
  const actions = element('div', 'card-actions');
  const order = element('button', '', 'Request physical ↗');
  order.type = 'button';
  order.setAttribute('aria-label', `Request a physical ${stamp.name} stamp`);
  order.addEventListener('click', () => {
    selectedStamp = stamp;
    $('order-stamp').textContent = stamp.name;
    $('order-form').reset();
    $('order-dialog').showModal();
  });
  const remove = element('button', 'delete', '×');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Remove ${stamp.name}`);
  remove.addEventListener('click', () => {
    if (confirm(`Remove "${stamp.name}" from your collection?`)) {
      if (saveCollection(stamps.filter(item => item.id !== stamp.id))) notify('Stamp removed from your collection.');
    }
  });
  actions.append(order, remove);
  bottom.append(element('span', 'stamp-price', money(stamp.price)), actions);
  details.append(meta, title, bottom);
  article.append(image, details);
  return article;
}

function render() {
  $('stamp-count').textContent = stamps.length;
  $('country-count').textContent = new Set(stamps.map(stamp => stamp.country.trim().toLocaleLowerCase())).size;
  $('total-value').textContent = money(stamps.reduce((sum, stamp) => sum + stamp.price, 0));
  const query = $('search').value.trim().toLocaleLowerCase();
  const visible = stamps.filter(stamp => `${stamp.name} ${stamp.country} ${stamp.year}`.toLocaleLowerCase().includes(query));
  $('results-label').textContent = `${visible.length} ${visible.length === 1 ? 'STAMP' : 'STAMPS'}${query ? ' FOUND' : ' IN YOUR COLLECTION'}`;
  $('empty-state').hidden = visible.length > 0;
  const list = $('stamp-list');
  list.replaceChildren();
  const grouping = $('group-by').value;
  const groups = new Map();
  visible.forEach(stamp => {
    let group = '';
    if (grouping === 'country') group = stamp.country.trim();
    if (grouping === 'price') group = stamp.price < 25 ? 'Under $25' : stamp.price < 100 ? '$25 to $99.99' : '$100 and above';
    const key = grouping === 'country' ? group.toLocaleLowerCase() : group;
    if (!groups.has(key)) groups.set(key, { name: group, stamps: [] });
    groups.get(key).stamps.push(stamp);
  });
  let index = 0;
  for (const group of groups.values()) {
    if (group.name) list.append(element('h3', 'group-title', group.name));
    const grid = element('div', 'stamp-grid');
    group.stamps.forEach(stamp => grid.append(card(stamp, index++)));
    list.append(grid);
  }
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      reject(new Error('Choose a JPG, PNG or WebP image smaller than 10 MB.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be opened. Please choose another photo.'));
    };
    image.src = url;
  });
}

function openStampDialog() {
  $('stamp-form').reset();
  $('stamp-error').textContent = '';
  $('photo-label').textContent = 'Upload or take a photo';
  $('stamp-dialog').showModal();
}

['add-button', 'intro-add', 'empty-add'].forEach(id => $(id).addEventListener('click', openStampDialog));
['share-button', 'sidebar-share'].forEach(id => $(id).addEventListener('click', () => $('share-dialog').showModal()));
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
$('search').addEventListener('input', render);
$('group-by').addEventListener('change', render);
$('photo').addEventListener('change', () => $('photo-label').textContent = $('photo').files[0]?.name || 'Upload or take a photo');

$('stamp-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  $('stamp-error').textContent = '';
  try {
    const image = await readImage($('photo').files[0]);
    const stamp = {
      id: crypto.randomUUID(),
      name: $('name').value.trim(),
      country: $('country').value.trim(),
      year: $('year').value,
      price: Number($('price').value),
      image
    };
    if (!validStamp(stamp)) throw new Error('Please check your stamp details and try again.');
    if (saveCollection([stamp, ...stamps])) {
      $('stamp-dialog').close();
      notify('Your stamp has been added.');
    }
  } catch (error) {
    $('stamp-error').textContent = error.message || 'Could not add this stamp.';
  } finally {
    button.disabled = false;
  }
});

$('export-button').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ format: 'postmark-collection', version: 1, stamps }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'postmark-collection.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('share-dialog').close();
  notify('Collection downloaded and ready to share.');
});

$('import-button').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 20 * 1024 * 1024) throw new Error('This collection file is too large.');
    const data = JSON.parse(await file.text());
    if (data.format !== 'postmark-collection' || data.version !== 1 || !Array.isArray(data.stamps) ||
        !data.stamps.every(validStamp) || new Set(data.stamps.map(stamp => stamp.id)).size !== data.stamps.length) {
      throw new Error('This is not a valid Postmark collection.');
    }
    if (confirm('Replace your current collection with this imported collection? This cannot be undone.')) {
      if (saveCollection(data.stamps)) notify('Collection imported.');
    }
  } catch (error) {
    notify(error instanceof SyntaxError ? 'This is not a valid collection file.' : error.message);
  } finally {
    event.target.value = '';
  }
});

$('order-form').addEventListener('submit', event => {
  event.preventDefault();
  const subject = `Physical stamp enquiry: ${selectedStamp.name}`;
  const body = `Hello,\n\nI would like to enquire about purchasing a physical ${selectedStamp.name} stamp from ${selectedStamp.country}.\n\nMy delivery details:\n${$('delivery').value.trim()}\n\nPlease let me know the availability, price, and shipping options. Thank you.`;
  window.location.href = `mailto:${encodeURIComponent($('seller-email').value.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $('order-dialog').close();
});

stamps = loadCollection();
render();
