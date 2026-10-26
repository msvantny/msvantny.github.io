const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = url => /^https?:\/\//i.test(String(url)) ? String(url) : '';
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
function dateOrder(event) {
  const text = String(event.dates || '').toLowerCase();
  const month = months.reduce((last,m,i) => text.includes(m) ? i : last,-1);
  const day = Number(text.match(/^\d{1,2}(?!\d)/)?.[0] || 0);
  return Number(event.year) * 10000 + (month + 1) * 100 + day;
}
export function groupEvents(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid conference feed');
  const groups = new Map();
  for (const row of rows) {
    if (!row.event || !Number.isInteger(Number(row.year))) continue;
    const key = [row.event.trim().toLowerCase(),row.year,String(row.location || '').trim().toLowerCase()].join('|');
    let event = groups.get(key);
    if (!event) { event = {...row, contributions:[], photos:[], description:row.description || ''}; groups.set(key,event); }
    if (!event.dates && row.dates) event.dates = row.dates;
    for (const photo of row.photos || []) if (photo?.src && !event.photos.some(p => p.src === photo.src)) event.photos.push(photo);
    if (row.title) event.contributions.push({title:row.title,authors:row.authors || '',role:row.role || '',attendance:row.attendance || '',url:external(row.url)});
  }
  return [...groups.values()].sort((a,b) => dateOrder(b)-dateOrder(a) || a.event.localeCompare(b.event));
}
function imageUrl(url) {
  return /^assets\/conferences\/[a-z0-9-]+\.webp$/.test(url) || /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(url) ? url : '';
}
function authorMarkup(authors) {
  if (!authors) return '';
  return `<details class="conference-authors"><summary>Authors</summary><p>${esc(authors)}</p></details>`;
}
export function eventMarkup(event) {
  const title = !event.contributions.length && external(event.url) ? `<a href="${esc(external(event.url))}" target="_blank" rel="noopener noreferrer">${esc(event.event)} ↗</a>` : esc(event.event);
  const photos = event.photos.filter(p => imageUrl(p.src)).slice(0,4);
  const gallery = photos.length ? `<div class="conference-photos">${photos.map((p,i) => `<a href="${esc(external(p.url) || imageUrl(p.src))}" target="_blank" rel="noopener noreferrer" aria-label="Open photo ${i+1}: ${esc(event.event)}"><img src="${esc(imageUrl(p.src))}" alt="${esc(event.event)} — photo ${i+1}" width="144" height="96" loading="lazy"></a>`).join('')}</div>` : '';
  return `<li class="conference-event"><article><h3>${title}</h3><p class="conference-meta">${[event.dates || event.year,event.location].filter(Boolean).map(esc).join(' · ')}</p>${event.description ? `<p class="conference-description">${esc(event.description)}</p>` : ''}${!event.contributions.length && event.role ? `<p class="conference-meta">${esc(event.role)}</p>` : ''}${event.contributions.length ? `<ul class="conference-contributions">${event.contributions.map(c => `<li><p class="conference-contribution-title">${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.title)} ↗</a>` : esc(c.title)}</p><p class="conference-meta">${esc(c.role)}${c.attendance === 'Yes' ? ' · Attended in person' : c.attendance === 'No' ? ' · Co-authored contribution; did not attend' : ''}</p>${authorMarkup(c.authors)}</li>`).join('')}</ul>` : ''}${gallery}</article></li>`;
}
export function sectionMarkup(rows, label) {
  const events = groupEvents(rows);
  const recent = events.slice(0,5), older = events.slice(5);
  return `${recent.length ? `<ul class="conference-events">${recent.map(eventMarkup).join('')}</ul>` : '<p class="source-empty">No events selected yet.</p>'}${older.length ? `<details class="conference-archive"><summary><span>${esc(label)} archive <small>${older.length} earlier events</small></span><span class="details-toggle" aria-hidden="true">+</span></summary><ul class="conference-events">${older.map(eventMarkup).join('')}</ul></details>` : ''}`;
}
export function validateFeed(feed) {
  if (!feed || !Array.isArray(feed.organized) || !Array.isArray(feed.participation)) throw new Error('Invalid feed');
  return feed;
}
export function renderFeed(feed) {
  validateFeed(feed);
  document.getElementById('organized-events').innerHTML = sectionMarkup(feed.organized,'Organised events');
  document.getElementById('participation-events').innerHTML = sectionMarkup(feed.participation,'Conference contributions');
}
if (typeof document !== 'undefined') {
  const config = document.querySelector('meta[name="conference-feed"]')?.content;
  if (config && /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config)) {
    // Read-only JSONP endpoint returns explicitly selected public fields only.
    const callback = 'conferenceFeed_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const status = document.getElementById('conference-status');
    const finish = () => { clearTimeout(timer); script.remove(); delete window[callback]; };
    const timer = setTimeout(() => { status.textContent = 'Saved selection shown; live update unavailable.'; finish(); },20000);
    window[callback] = feed => { try { renderFeed(feed); status.textContent = 'Source: personal conference records · Updated from Google Sheets.'; } catch { status.textContent = 'Saved selection shown; live update unavailable.'; } finally { finish(); } };
    script.onerror = () => { status.textContent = 'Saved selection shown; live update unavailable.'; finish(); };
    script.src = config + '?callback=' + callback;
    document.head.appendChild(script);
  }
}
