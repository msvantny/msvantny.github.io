const ORCID = '0000-0001-9391-7069';
export const FUNDINGS_API = 'https://pub.orcid.org/v3.0/' + ORCID + '/fundings';
export const REPOS_API = 'https://api.github.com/users/msvantny/repos?type=owner&sort=pushed&per_page=100';
const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const safeUrl = value => /^https?:\/\//i.test(value || '') ? value : null;
const dateKey = date => Number(date?.year?.value || 0)*10000 + Number(date?.month?.value || 0)*100 + Number(date?.day?.value || 0);
export function selectFundings(data) {
  if (!Array.isArray(data?.group)) throw new Error('Invalid ORCID funding response');
  const seen = new Set(), result = [];
  for (const group of data.group) {
    const versions = [...(group['funding-summary'] || [])].filter(w => !w.visibility || w.visibility === 'public');
    versions.sort((a,b) => Number(b['display-index'] || 0) - Number(a['display-index'] || 0));
    const f = versions[0];
    if (!f?.title?.title?.value?.trim()) continue;
    const title = f.title.title.value.trim();
    const sponsor = f.organization?.name || '';
    const ids = [...(f['external-ids']?.['external-id'] || []), ...(group['external-ids']?.['external-id'] || [])];
    const self = ids.filter(id => id['external-id-relationship'] === 'self');
    const identifier = self.find(id => id['external-id-type'] === 'grant-number') || self[0] || ids[0];
    const id = identifier?.['external-id-value'] || '';
    const key = (id ? sponsor + ':' + id : title).toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const start = f['start-date']?.year?.value || '';
    const end = f['end-date']?.year?.value || '';
    const years = start && end ? start + '–' + end : start ? start + ' · end year not listed' : end ? 'Ends ' + end : 'Dates not listed';
    const url = safeUrl(f.url?.value) || safeUrl(identifier?.['external-id-url']?.value) || 'https://orcid.org/' + ORCID + '#funding';
    result.push({title,sponsor,id,years,url,sort:dateKey(f['start-date'])});
  }
  return result.sort((a,b) => b.sort - a.sort || a.title.localeCompare(b.title)).slice(0,5);
}
export function selectRepositories(data) {
  if (!Array.isArray(data)) throw new Error('Invalid GitHub response');
  return data.filter(r => !r.private && !r.fork && !r.archived && r.owner?.login?.toLowerCase() === 'msvantny')
    .sort((a,b) => (b.pushed_at || b.updated_at || '').localeCompare(a.pushed_at || a.updated_at || '') || a.name.localeCompare(b.name))
    .slice(0,5).map(r=>({name:r.name,description:r.description || '',url:safeUrl(r.html_url) || 'https://github.com/msvantny',updated:(r.pushed_at || r.updated_at || '').slice(0,10)}));
}
export function fundingMarkup(items) {
  return items.map(p=>'<li class="publication-item"><article><h3><a href="'+escape(p.url)+'" target="_blank" rel="noopener noreferrer">'+escape(p.title)+'</a></h3><p class="project-dates">'+escape(p.years)+'</p><p class="publication-meta">Funder: '+escape(p.sponsor || 'Not listed in ORCID')+'</p><p class="publication-meta">Project ID: '+escape(p.id || 'Not listed in ORCID')+'</p></article></li>').join('\n');
}
export function repositoryMarkup(items) {
  return items.map(r=>'<li class="publication-item"><article><h3><a href="'+escape(r.url)+'" target="_blank" rel="noopener noreferrer">'+escape(r.name)+' ↗</a></h3>'+(r.description?'<p class="publication-meta">'+escape(r.description)+'</p>':'')+(r.updated?'<p class="publication-meta">Last activity: '+escape(r.updated)+'</p>':'')+'</article></li>').join('\n');
}
async function refresh(url, select, render, listId, statusId, source) {
  const list=document.getElementById(listId), status=document.getElementById(statusId);
  if(!list || !status) return;
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
  try {
    const response=await fetch(url,{headers:{Accept:source==='ORCID'?'application/json':'application/vnd.github+json'},signal:controller.signal});
    if(!response.ok) throw new Error('Source unavailable');
    const items=select(await response.json());
    list.innerHTML=items.length?render(items):'<li class="source-empty">No public '+(source==='ORCID'?'funded projects':'repositories')+' listed.</li>';
    const checked=new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date());
    status.textContent='Source: '+source+' · Latest '+items.length+' '+(source==='ORCID'?'funded projects by start date':'public repositories by activity')+' · Checked '+checked+'.';
  } catch {
    status.textContent+=' Live refresh is currently unavailable; showing the saved list where available.';
  } finally {clearTimeout(timer);}
}
if(typeof document!=='undefined') {
  refresh(FUNDINGS_API,selectFundings,fundingMarkup,'funded-project-list','funding-status','ORCID');
  refresh(REPOS_API,selectRepositories,repositoryMarkup,'github-project-list','github-status','GitHub');
}
