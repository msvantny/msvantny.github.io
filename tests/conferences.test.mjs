import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectRows,eventMarkup,sectionMarkup} from '../conferences.mjs';
import {videoCards,PLAYLIST} from '../videos.mjs';
test('contributions stay separate and sort independently of IDs or row order',()=>{
 const rows=[{event:'Older',year:2025},{event:'QIRT',year:2026,dates:'June–July 2026',title:'A'},{event:'RIPT',year:2026,dates:'10–12 June 2026',title:'B'},{event:'QIRT',year:2026,dates:'June–July 2026',title:'C'}];
 assert.equal(selectRows(rows).length,4);
 assert.deepEqual(selectRows(rows),selectRows([...rows].reverse()));
 assert.deepEqual(selectRows(rows).map(r=>r.event),['QIRT','QIRT','RIPT','Older']);
});
test('recent list has five records and an archive; archive has no photos or disclosures',()=>{
 const rows=Array.from({length:12},(_,i)=>({event:'Event '+i,year:2020+i,title:'Paper',authors:'Authors',photos:[]}));
 const recent=sectionMarkup(rows);
 assert.equal((recent.match(/class="conference-event"/g)||[]).length,5);
 assert.ok(recent.includes('conferences-archive.html#participation'));
 const archive=sectionMarkup(rows,'participation',true);
 assert.equal((archive.match(/<li>/g)||[]).length,12);
 assert.ok(!archive.includes('<details'));
 assert.ok(!archive.includes('<img'));
});
test('metadata, full name, contribution and authors appear in requested order; HTML is escaped',()=>{
 const html=eventMarkup({event:'<script>',year:2026,url:'javascript:alert(1)',photos:[],role:'Presenter',attendance:'No',description:'Full conference name',title:'A&B',authors:'<img>'});
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('&lt;img&gt;'));
 assert.ok(html.includes('Did not attend'));
 assert.ok(!html.includes('javascript:'));
 assert.ok(html.indexOf('Presenter')<html.indexOf('Full conference name'));
 assert.ok(html.indexOf('Full conference name')<html.indexOf('A&amp;B'));
 assert.ok(html.indexOf('A&amp;B')<html.indexOf('<summary>Authors'));
});
test('playlist previews validate IDs and escape titles',()=>{
 const html=videoCards({playlist:PLAYLIST,videos:[{id:'6pn8Mm6Z4gA',title:'A&B <test>'},{id:'bad',title:'Bad'}]});
 assert.equal((html.match(/class="video-card"/g)||[]).length,1);
 assert.ok(html.includes('A&amp;B &lt;test&gt;'));
 assert.ok(html.includes('https://www.youtube.com/watch?'));
 assert.throws(()=>videoCards({playlist:'wrong',videos:[]}));
});
