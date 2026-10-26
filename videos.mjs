export const PLAYLIST = 'PL5j8OBCSHNnQx0IiaYhAmxtuQCGaH8rJG';
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function videoCards(data) {
  if(data?.playlist!==PLAYLIST || !Array.isArray(data.videos)) throw new Error('Invalid playlist');
  return data.videos.filter(v=>/^[\w-]{11}$/.test(v.id)&&typeof v.title==='string').slice(0,10).map(v=>`<a class="video-card" href="https://www.youtube.com/watch?v=${v.id}&amp;list=${PLAYLIST}" data-video-id="${v.id}" target="_blank" rel="noopener noreferrer" aria-label="Play: ${esc(v.title)}"><img src="https://img.youtube.com/vi/${v.id}/mqdefault.jpg" alt="" width="320" height="180" loading="lazy"><span>${esc(v.title)}</span></a>`).join('');
}
if(typeof document!=='undefined') {
  const strip=document.getElementById('video-strip');
  const player=document.querySelector('.youtube-player iframe');
  strip?.addEventListener('click',event=>{
    const card=event.target.closest('.video-card');
    if(!card || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button!==0) return;
    event.preventDefault();
    const id=card.dataset.videoId;
    if(!/^[\w-]{11}$/.test(id)) return;
    player.src=`https://www.youtube-nocookie.com/embed/${id}?list=${PLAYLIST}&autoplay=1&playsinline=1&rel=0`;
    player.title=card.textContent.trim();
    strip.querySelectorAll('.video-card').forEach(link=>link.removeAttribute('aria-current'));
    card.setAttribute('aria-current','true');
  });
  document.querySelectorAll('[data-video-scroll]').forEach(button=>button.addEventListener('click',()=>strip.scrollBy({left:strip.clientWidth*Number(button.dataset.videoScroll),behavior:'smooth'})));
  // GitHub Actions refreshes this public metadata daily. Read raw GitHub so a
  // bot metadata commit does not depend on triggering another Pages deployment.
  fetch('https://raw.githubusercontent.com/msvantny/msvantny.github.io/main/assets/youtube-playlist.json',{cache:'no-cache',signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw new Error('Playlist unavailable');return r.json();}).then(data=>{const markup=videoCards(data);if(markup&&!strip.querySelector('[aria-current="true"]'))strip.innerHTML=markup;}).catch(()=>{/* Keep the saved working previews. */});
}
