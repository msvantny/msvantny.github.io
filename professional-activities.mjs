const API='https://pub.orcid.org/v3.0/0000-0001-9391-7069/activities';
const sections=[['memberships','membership','Membership'],['services','service','Service'],['invited-positions','invited-position','Invited position'],['distinctions','distinction','Distinction'],['editorial-services','editorial-service','Editorial service']];
const escape=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function selectActivities(data) {
  if(!sections.some(([key])=>Array.isArray(data?.[key]?.['affiliation-group']))) throw new Error('Invalid professional activities response');
  const result=[],seen=new Set();
  for(const [key,type,label] of sections) {
    for(const group of data[key]?.['affiliation-group']||[]) {
      const summaries=(group.summaries||[]).map(s=>s[type+'-summary']).filter(s=>s&&(!s.visibility||s.visibility==='public'));
      summaries.sort((a,b)=>Number(b['display-index']||0)-Number(a['display-index']||0));
      const item=summaries[0];
      if(!item?.organization?.name)continue;
      const organization=item.organization.name,role=item['role-title']||'',department=item['department-name']||'';
      const start=item['start-date']?.year?.value||'',end=item['end-date']?.year?.value||'';
      const id=[type,organization,role,department,start,end].join('|').toLowerCase().trim();
      if(seen.has(id))continue;
      seen.add(id);
      const url=/^https?:\/\//i.test(item.url?.value||'')?item.url.value:'https://orcid.org/0000-0001-9391-7069';
      const period=start&&end?start+'–'+end:start?'Since '+start:end?'Until '+end:'Dates not listed';
      result.push({organization,role,department,category:label,period,url,start:Number(start)||0});
    }
  }
  return result.sort((a,b)=>b.start-a.start||a.organization.localeCompare(b.organization));
}
export function activitiesMarkup(items) {
  return items.map(a=>'<li class="publication-item"><article><h3><a href="'+escape(a.url)+'" target="_blank" rel="noopener noreferrer">'+escape(a.organization)+'</a></h3>'+([a.role,a.department].some(Boolean)?'<p class="activity-role">'+[a.role,a.department].filter(Boolean).map(escape).join(' · ')+'</p>':'')+'<p class="publication-meta">'+escape(a.category)+' · '+escape(a.period)+'</p></article></li>').join('\n');
}
async function refreshActivities(){
  const list=document.getElementById('professional-activity-list'),status=document.getElementById('activity-status');
  if(!list||!status)return;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(API,{headers:{Accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error('ORCID unavailable');
    const items=selectActivities(await response.json());
    list.innerHTML=items.length?activitiesMarkup(items):'<li class="source-empty">No public professional activities listed in ORCID.</li>';
    status.textContent='Source: ORCID · '+items.length+' professional '+(items.length===1?'activity':'activities')+' · Checked '+new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date())+'.';
  }catch{status.textContent+=' Live refresh is currently unavailable; showing the saved list.';}
  finally{clearTimeout(timer);}
}
if(typeof document!=='undefined')refreshActivities();
