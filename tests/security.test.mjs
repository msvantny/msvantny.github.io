import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {eventMarkup} from '../conferences.mjs';
import {articlesMarkup} from '../publications.mjs';
import {selectFundings,fundingMarkup,selectRepositories,repositoryMarkup} from '../projects.mjs';
import {selectActivities,activitiesMarkup} from '../professional-activities.mjs';
import {videoCards,PLAYLIST} from '../videos.mjs';

test('remote text cannot inject markup or executable link schemes',()=>{
  const attack='<img src=x onerror="alert(1)">';
  const article=articlesMarkup([{title:attack,url:'javascript:alert(1)',journal:attack,year:'2026',authors:[{name:attack}]}]);
  const conference=eventMarkup({event:attack,year:2026,title:attack,authors:attack,description:attack,url:'javascript:alert(1)',photos:[{src:'data:image/svg+xml;base64,PHN2Zz4='}]});
  const fundings=selectFundings({group:[{'funding-summary':[{visibility:'public',title:{title:{value:attack}},organization:{name:attack},url:{value:'javascript:alert(1)'}}]}]});
  const repos=selectRepositories([{name:attack,owner:{login:'msvantny'},description:attack,html_url:'javascript:alert(1)'}]);
  const activities=selectActivities({memberships:{'affiliation-group':[{summaries:[{'membership-summary':{organization:{name:attack},url:{value:'javascript:alert(1)'}}}]}]}});
  const video=videoCards({playlist:PLAYLIST,videos:[{id:'6pn8Mm6Z4gA',title:attack},{id:'" onclick="x',title:attack}]});
  for(const markup of [article,conference,fundingMarkup(fundings),repositoryMarkup(repos),activitiesMarkup(activities),video]){
    assert.ok(markup.includes('&lt;img'));
    assert.doesNotMatch(markup,/<img src=x|href="javascript:|src="data:image\/svg/i);
  }
});

test('conference client consumes JSON without creating remote scripts',()=>{
  const client=fs.readFileSync(new URL('../conferences.mjs',import.meta.url),'utf8');
  assert.match(client,/response\.json\(\)/);
  assert.doesNotMatch(client,/createElement\(['"]script|window\[callback\]|\?callback=/);
});

test('Apps Script exports only approved rows and explicit public fields',()=>{
  const headers=['Publish','Event','Year','Dates','Location','Role','Attendance','Contribution title','Authors','Link','Description','Photos','Review notes','Original citation'];
  const row=(publish,event)=>headers.map(h=>({Publish:publish,Event:event,Year:'2026',Photos:'approved.jpg','Review notes':'PRIVATE REVIEW','Original citation':'PRIVATE SOURCE'}[h]||''));
  const galleryLookups=[];
  const context=vm.createContext({
    SpreadsheetApp:{openById:id=>{assert.equal(id,'1tsG3XL3NPgwuEdhznS-cOouAx7jsN0WJYTygmGi9bD4');return {getSheetByName:()=>({getDataRange:()=>({getDisplayValues:()=>[headers,row('Yes','Public event'),row('No','PRIVATE EVENT')]})})};}},
    DriveApp:{getFolderById:id=>{assert.equal(id,'13ZDw6oZO7JPX235TQAQ8JUXqLiAMkQtg');return {getFilesByName:name=>{galleryLookups.push(name);return {hasNext:()=>false};}};}},
    ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(type){this.type=type;return this;}})}
  });
  vm.runInContext(fs.readFileSync(new URL('../tools/conferences-feed.gs',import.meta.url),'utf8'),context);
  const result=context.doGet({parameter:{sheetId:'attacker',fileId:'attacker',callback:'evil);alert(1)//'}});
  assert.equal(result.type,'json');
  assert.doesNotMatch(result.text,/PRIVATE/);
  const data=JSON.parse(result.text);
  assert.equal(data.organized.length,1);
  assert.deepEqual(Object.keys(data.organized[0]).sort(),['event','year','dates','location','role','attendance','title','authors','url','description','photos'].sort());
  assert.ok(galleryLookups.every(name=>name==='approved.jpg'));
});

test('every HTML page blocks external executable scripts and inline code',()=>{
  for(const name of fs.readdirSync(new URL('..',import.meta.url)).filter(n=>n.endsWith('.html'))){
    const html=fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
    const policy=html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
    assert.ok(policy,name+' missing CSP');
    assert.match(policy,/(?:^|;)\s*script-src 'self';/);
    assert.ok(!policy.includes('unsafe-inline')&&!policy.includes('unsafe-eval'));
    assert.match(policy,/base-uri 'none'/);
    assert.match(policy,/object-src 'none'/);
    assert.doesNotMatch(html,/\sstyle="|<script[^>]+src="https?:/i);
    for(const link of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g))assert.match(link[0],/rel="noopener noreferrer"/);
  }
});
