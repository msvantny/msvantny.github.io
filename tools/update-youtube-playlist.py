"""Refresh playlist metadata only; video files stay on YouTube."""
import json
from pathlib import Path
import re
import urllib.request
import xml.etree.ElementTree as ET

PLAYLIST = 'PL5j8OBCSHNnQx0IiaYhAmxtuQCGaH8rJG'
NS = {'a':'http://www.w3.org/2005/Atom','yt':'http://www.youtube.com/xml/schemas/2015'}

def parse_feed(xml):
    root = ET.fromstring(xml)
    videos, seen = [], set()
    for entry in root.findall('a:entry', NS):
        video_id = entry.findtext('yt:videoId', namespaces=NS)
        title = entry.findtext('a:title', namespaces=NS)
        if not video_id or not re.fullmatch(r'[\w-]{11}', video_id) or not title or video_id in seen:
            continue
        seen.add(video_id)
        videos.append({'id':video_id, 'title':title})
    if not videos:
        raise ValueError('YouTube returned no public playlist videos; keeping the previous file.')
    return {'playlist':PLAYLIST, 'videos':videos[:10]}

if __name__ == '__main__':
    req = urllib.request.Request('https://www.youtube.com/feeds/videos.xml?playlist_id='+PLAYLIST, headers={'User-Agent':'msvantny-research-website/1.0'})
    with urllib.request.urlopen(req, timeout=45) as response:
        data = parse_feed(response.read())
    target = Path(__file__).resolve().parents[1] / 'assets/youtube-playlist.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('Refreshed',len(data['videos']),'playlist previews.')
