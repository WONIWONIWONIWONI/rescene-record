import base64,gzip,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def build():
 manifest=json.loads((ROOT/'data/manifest.json').read_text())
 charts={key:json.loads((ROOT/'data'/f'{key}.json').read_text()) for key in manifest['charts']}
 data=json.dumps({'manifest':manifest,'charts':charts},ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
 encoded=base64.b64encode(gzip.compress(data.encode(),mtime=0)).decode()
 extra='<style>#rescene-record .rr-album{display:block;font-size:11px;color:var(--rr-muted);margin-left:16px;overflow-wrap:anywhere}#rescene-record .rr-notice a{color:inherit}#rescene-record td{vertical-align:top}#rescene-record td:first-child{width:40%;min-width:90px}#rescene-record .rr-proto{white-space:normal;text-align:center}@media(max-width:450px){#rescene-record .rr-brand small{letter-spacing:1px}#rescene-record th:nth-child(4),#rescene-record td:nth-child(4){display:none}#rescene-record .rr-chart-sub{overflow-wrap:anywhere}}body{color-scheme:light dark;background:light-dark(#f4f5f7,#111416)}</style>'
 font=base64.b64encode((ROOT/'font.woff2').read_bytes()).decode()
 extra+="<style>@font-face{font-family:'Noto Sans KR';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,"+font+") format('woff2')}</style>"
 boot="""(async function(){try{const element=document.getElementById('rr-data');const bytes=Uint8Array.from(atob(element.textContent),c=>c.charCodeAt(0));element.textContent=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();"""
 fail="""}catch(error){document.getElementById('rr-detail').textContent='기록을 열 수 없습니다. 최신 Chrome, Edge, Safari 또는 Firefox에서 다시 열어 주세요.';console.error(error);}})();"""
 html=(ROOT/'template.html').read_text()+extra+'<script id="rr-data" type="application/octet-stream">'+encoded+'</script><script>'+boot+(ROOT/'app.js').read_text()+(ROOT/'mts.js').read_text()+(ROOT/'selects.js').read_text()+fail+'</script></div></body></html>'
 (ROOT/'index.html').write_text(html)
 print('Built standalone archive',len(html.encode()),'bytes')
if __name__=='__main__':build()
