const ORCID = '0000-0001-9391-7069';
const API = 'https://pub.orcid.org/v3.0/' + ORCID + '/works';

export function selectArticles(data) {
  if (!Array.isArray(data?.group)) throw new Error('Invalid ORCID response');
  const works = [];
  const seen = new Set();
  for (const group of data.group) {
    const summaries = (group['work-summary'] || []).filter(w => w.type === 'journal-article' && w.visibility === 'public');
    summaries.sort((a, b) => Number(b['display-index'] || 0) - Number(a['display-index'] || 0) || dateKey(b) - dateKey(a));
    const work = summaries[0];
    if (!work) continue;
    const title = work.title?.title?.value?.trim();
    const year = work['publication-date']?.year?.value;
    if (!title || !/^\d{4}$/.test(String(year || ''))) continue;
    const ids = [...(work['external-ids']?.['external-id'] || []), ...(group['external-ids']?.['external-id'] || [])];
    const doiId = ids.find(id => id['external-id-type'] === 'doi' && id['external-id-relationship'] === 'self');
    const doi = String(doiId?.['external-id-value'] || '').replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').trim();
    const key = doi ? doi.toLowerCase() : title.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    const rawUrl = work.url?.value;
    const url = doi ? 'https://doi.org/' + doi : (/^https?:\/\//i.test(rawUrl || '') ? rawUrl : 'https://orcid.org/' + ORCID);
    works.push({ title, year: String(year), journal: work['journal-title']?.value || '', doi, url, putCodes: summaries.map(w => w['put-code']).filter(Number.isInteger), date: Math.max(...summaries.map(dateKey)) });
  }
  return works.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title)).slice(0, 10);
}
function dateKey(work) {
  const date = work['publication-date'];
  return Number(date?.year?.value || 0) * 10000 + Number(date?.month?.value || 0) * 100 + Number(date?.day?.value || 0);
}

export function attachAuthors(articles, data) {
  const works = new Map((data?.bulk || []).filter(b => b.work).map(b => [b.work['put-code'], b.work]));
  return articles.map(article => {
    const options = (article.putCodes || []).map(code => {
      const entries = works.get(code)?.contributors?.contributor || [];
      return entries.filter(c => !c['contributor-attributes']?.['contributor-role'] || c['contributor-attributes']['contributor-role'] === 'author')
        .map(c => {
          const name = c['credit-name']?.value?.trim();
          const normalized = (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const owner = c['contributor-orcid']?.path === ORCID || (/svantner/.test(normalized) && /\bm(?:ichal)?\b/.test(normalized));
          return {name, owner};
        }).filter(a => a.name);
    });
    const authors = options.sort((a,b) => b.length - a.length)[0] || [];
    return {...article, authors: authors.length ? authors : (article.authors || [])};
  });
}
function escape(value) {
  return String(value || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
function authorNames(authors) {
  return authors.map(a => a.owner ? '<strong>' + escape(a.name) + '</strong>' : escape(a.name)).join(', ');
}
export function articlesMarkup(articles) {
  return articles.map(article => {
    const authors = article.authors || [];
    const authorHtml = authors.length > 3
      ? '<details class="publication-authors"><summary><span class="authors-preview">' + authorNames(authors.slice(0,3)) + ', et al.</span><span class="authors-expand">Show all authors (' + authors.length + ')</span><span class="authors-collapse">Hide authors</span></summary><p>' + authorNames(authors) + '</p></details>'
      : '<p class="publication-authors">' + (authors.length ? authorNames(authors) : 'Author details unavailable in ORCID.') + '</p>';
    const url = /^https?:\/\//i.test(article.url || '') ? article.url : 'https://orcid.org/' + ORCID;
    const doi = article.doi ? ' · <a href="' + escape(url) + '" target="_blank" rel="noopener noreferrer" aria-label="DOI: ' + escape(article.doi) + '" title="' + escape(article.doi) + '">DOI ↗</a>' : '';
    return '<li class="publication-item"><article><h3><a href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + escape(article.title) + '</a></h3>' + authorHtml + '<p class="publication-meta"><i>' + escape(article.journal) + '</i>' + (article.journal ? ' · ' : '') + escape(article.year) + doi + '</p></article></li>';
  }).join('\n');
}
async function refreshArticles() {
  const container = document.getElementById('publication-list');
  const status = document.getElementById('publication-status');
  if (!container || !status) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(API, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error('ORCID unavailable');
    let articles = selectArticles(await response.json());
    if (!articles.length) throw new Error('No public journal articles');
    let saved = [];
    try { saved = JSON.parse(document.getElementById('publication-snapshot')?.textContent || '[]'); } catch {}
    articles = articles.map(a => ({...a, authors: saved.find(s => (a.doi && s.doi?.toLowerCase() === a.doi.toLowerCase()) || s.title === a.title)?.authors || []}));
    let authorsRefreshed = false;
    try {
      const codes = [...new Set(articles.flatMap(a => a.putCodes))].slice(0,100);
      if (codes.length) {
        const details = await fetch(API + '/' + codes.join(','), {headers: {Accept: 'application/json'}, signal: controller.signal});
        if (!details.ok) throw new Error('Author details unavailable');
        articles = attachAuthors(articles, await details.json());
        authorsRefreshed = true;
      }
    } catch { /* Retain saved author details when the detail endpoint is unavailable. */ }
    container.innerHTML = articlesMarkup(articles);
    status.textContent = 'Source: ORCID · ' + articles.length + ' latest public journal articles · Checked ' + new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date()) + '.' + (authorsRefreshed ? '' : ' Some author details could not be refreshed.');
  } catch {
    status.textContent += ' Live refresh is currently unavailable; the saved list is shown.';
  } finally { clearTimeout(timer); }
}
if (typeof document !== 'undefined') refreshArticles();
