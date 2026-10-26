const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = url => /^https?:\/\//i.test(String(url)) ? String(url) : '';
const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
function dateOrder(row) {
  const text = String(row.dates || '').toLowerCase();
  const month = months.reduce((last,m,i) => text.includes(m) ? i : last,-1);
  const day = Number(text.match(/^\d{1,2}(?!\d)/)?.[0] || 0);
  return Number(row.year) * 10000 + (month + 1) * 100 + day;
}
export function selectRows(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid conference feed');
  return rows.filter(row=> typeof row.event === 'string' && row.event.trim() && /^\d{4}$/.test(String(row.year))).slice().sort((a,b)=>dateOrder(b)-dateOrder(a)||a.event.localeCompare(b.event)||String(a.title||'').localeCompare(String(b.title||'')));
}
const metadata = (row,participation) => [row.dates || row.year,row.location,row.role,participation ? (row.attendance === 'Yes' ? 'Attended in person' : row.attendance === 'No' ? 'Did not attend' : '') : ''].filter(Boolean).map(esc).join(' · ');
function imageUrl(url) {
  return /^assets\/conferences\/[a-z0-9-]+\.webp$/.test(url) || /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(url) ? url : '';
}
export function eventMarkup(row,kind='participation',compact=false) {
  const participation = kind === 'participation';
  const link = external(row.url);
  const heading = !participation && link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(row.event)}&nbsp;↗</a>` : esc(row.event);
  const title = row.title ? (link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(row.title)}&nbsp;↗</a>` : esc(row.title)) : '';
  if (compact) return `<li><strong>${heading}</strong><span class="conference-meta"> · ${metadata(row,participation)}</span>${title ? `<p>${title}</p>` : row.description ? `<p>${esc(row.description)}</p>` : ''}</li>`;
  const photos = (Array.isArray(row.photos) ? row.photos : []).filter(p=>imageUrl(p.src)).slice(0,4);
  const gallery = photos.length ? `<div class="conference-photos">${photos.map((p,i)=>`<a href="${esc(external(p.url)||imageUrl(p.src))}" target="_blank" rel="noopener noreferrer" aria-label="Open photo ${i+1}: ${esc(row.event)}"><img src="${esc(imageUrl(p.src))}" alt="${esc(row.event)} — photo ${i+1}" width="144" height="96" loading="lazy"></a>`).join('')}</div>` : '';
  const authors = participation && row.authors ? `<details class="conference-authors"><summary>Authors</summary><p>${esc(row.authors)}</p></details>` : '';
  return `<li class="conference-event"><article><h3>${heading}</h3><p class="conference-meta">${metadata(row,participation)}</p>${row.description ? `<p class="conference-description${participation ? ' conference-full-name' : ''}">${esc(row.description)}</p>` : ''}${title ? `<p class="conference-contribution-title">${title}</p>` : ''}${authors}${gallery}</article></li>`;
}
export function sectionMarkup(rows,kind='participation',archive=false) {
  const selected = selectRows(rows);
  if (!selected.length) return '<p class="source-empty">No records selected yet.</p>';
  if (archive) return `<ul class="conference-compact">${selected.map(r=>eventMarkup(r,kind,true)).join('')}</ul>`;
  return `<ul class="conference-events">${selected.slice(0,5).map(r=>eventMarkup(r,kind)).join('')}</ul><p class="conference-archive-link"><a href="conferences-archive.html#${kind}" target="_blank" rel="noopener noreferrer">View full archive (${selected.length}) ↗</a></p>`;
}
export function validateFeed(feed) {
  if (!feed || !Array.isArray(feed.organized) || !Array.isArray(feed.participation)) throw new Error('Invalid feed');
  return feed;
}
export function renderFeed(feed) {
  validateFeed(feed);
  const archive = document.body.dataset.conferenceView === 'archive';
  const organized = sectionMarkup(feed.organized,'organized',archive);
  const participation = sectionMarkup(feed.participation,'participation',archive);
  document.getElementById('organized-events').innerHTML = organized;
  document.getElementById('participation-events').innerHTML = participation;
}

if (typeof document !== 'undefined') {
  // Browsers block top-level navigation to data URLs. Open a temporary Blob URL
  // for photos delivered by the private Drive feed.
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('.conference-photos a');
    const href = anchor?.getAttribute('href') || '';
    if (!/^data:image\/(?:jpeg|png|webp);base64,/.test(href)) return;
    event.preventDefault();
    const [header, encoded] = href.split(',');
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], {type:header.slice(5,header.indexOf(';'))}));
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url),60000);
  });
  const config = document.querySelector('meta[name="conference-feed"]')?.content;
  if (config && /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(config)) {
    // Read-only JSONP endpoint returns explicitly selected public fields only.
    const callback = 'conferenceFeed_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const status = document.getElementById('conference-status');
    const finish = () => { clearTimeout(timer); script.remove(); delete window[callback]; };
    const timer = setTimeout(() => { status.textContent = 'Saved selection shown; live update unavailable.'; finish(); },60000);
    window[callback] = feed => { try { renderFeed(feed); status.textContent = 'Source: personal conference records · Updated from Google Sheets.'; } catch { status.textContent = 'Saved selection shown; live update unavailable.'; } finally { finish(); } };
    script.onerror = () => { status.textContent = 'Saved selection shown; live update unavailable.'; finish(); };
    script.src = config + '?callback=' + callback;
    document.head.appendChild(script);
  }
}
