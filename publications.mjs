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
    works.push({ title, year: String(year), journal: work['journal-title']?.value || '', doi, url, date: Math.max(...summaries.map(dateKey)) });
  }
  return works.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title)).slice(0, 10);
}
function dateKey(work) {
  const date = work['publication-date'];
  return Number(date?.year?.value || 0) * 10000 + Number(date?.month?.value || 0) * 100 + Number(date?.day?.value || 0);
}
function renderArticles(articles, container) {
  const fragment = document.createDocumentFragment();
  for (const article of articles) {
    const row = document.createElement('article');
    row.className = 'entry publication-entry';
    const content = document.createElement('div');
    const meta = document.createElement('p');
    meta.className = 'publication-meta';
    meta.textContent = [article.year, article.journal].filter(Boolean).join(' · ');
    const heading = document.createElement('h3');
    const link = document.createElement('a');
    link.href = article.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = article.title;
    heading.append(link);
    content.append(meta, heading);
    if (article.doi) {
      const doi = document.createElement('p');
      doi.className = 'muted publication-doi';
      doi.textContent = 'DOI: ' + article.doi;
      content.append(doi);
    }
    row.append(content);
    fragment.append(row);
  }
  container.replaceChildren(fragment);
}
async function refreshArticles() {
  const container = document.getElementById('publication-list');
  const status = document.getElementById('publication-status');
  if (!container || !status) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(API, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error('ORCID unavailable');
    const articles = selectArticles(await response.json());
    if (!articles.length) throw new Error('No public journal articles');
    renderArticles(articles, container);
    status.textContent = 'Source: ORCID · ' + articles.length + ' latest public journal articles · Checked ' + new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date()) + '.';
  } catch {
    status.textContent += ' Live refresh is currently unavailable; the saved list is shown.';
  } finally {
    clearTimeout(timer);
  }
}
if (typeof document !== 'undefined') refreshArticles();
