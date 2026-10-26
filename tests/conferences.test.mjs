import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {groupEvents,eventMarkup,sectionMarkup} from '../conferences.mjs';

test('events group contributions and sort independently of IDs and row order',()=>{
  const rows=[{id:'P001',event:'Older',year:2025},{event:'QIRT',year:2026,dates:'June–July 2026',title:'A'},{event:'RIPT',year:2026,dates:'10–12 June 2026',title:'B'},{event:'QIRT',year:2026,dates:'June–July 2026',title:'C'}];
  assert.deepEqual(groupEvents(rows).map(e=>e.event),['QIRT','RIPT','Older']);
  assert.deepEqual(groupEvents(rows).map(e=>e.event),groupEvents([...rows].reverse()).map(e=>e.event));
  assert.equal(groupEvents(rows)[0].contributions.length,2);
  assert.ok(sectionMarkup(rows,'Events').includes('QIRT'));
});
test('HTML escapes source text, rejects unsafe links and distinguishes non-attendance',()=>{
  const event={event:'<script>',year:2026,url:'javascript:alert(1)',photos:[],contributions:[{title:'A&B',role:'Author / co-author',attendance:'No',authors:'<img>'}]};
  const html=eventMarkup(event);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img&gt;'));
  assert.ok(html.includes('did not attend'));
  assert.ok(!html.includes('javascript:'));
});
test('Apps Script export includes selected public fields and omits notes and drafts',()=>{
  const headers=['ID','Event','Year','Dates','Location','Role','Attendance','Contribution title','Authors','Link','Photos','Description','Review notes','Publish','Original citation'];
  const row=(publish,event)=>['',event,'2026','','','Presenter','Yes','Title','Authors','','','Public description','PRIVATE NOTE',publish,'PRIVATE CITATION'];
  const mock={SpreadsheetApp:{openById:()=>({getSheetByName:()=>({getDataRange:()=>({getDisplayValues:()=>[headers,row('Yes','Public event'),row('No','Draft event')]})})})},DriveApp:{getFolderById:()=>({})},ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})}};
  vm.createContext(mock); vm.runInContext(fs.readFileSync(new URL('../tools/conferences-feed.gs',import.meta.url),'utf8'),mock);
  const result=mock.doGet({parameter:{}}).text;
  assert.ok(result.includes('Public event'));
  assert.ok(!result.includes('PRIVATE'));
  assert.ok(!result.includes('Draft event'));
  assert.equal(JSON.parse(result).organized.length,1);
  assert.ok(mock.doGet({parameter:{callback:'conferenceFeed_abc123'}}).text.startsWith('conferenceFeed_abc123('));
  assert.ok(mock.doGet({parameter:{callback:'alert(1)'}}).text.startsWith('{'));
});
