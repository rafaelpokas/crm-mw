import fs from 'node:fs/promises';
const root='public/catalogo-maquinas';await fs.mkdir(`${root}/assets/machines`,{recursive:true});
const pages=[
['ch570','/pt/colheitadeiras/colhedora-de-cana/ch570/'],['ch670','/pt/colheitadeiras/colhedora-de-cana/ch670/'],['ch950','/pt/colheitadeiras/colhedora-de-cana/ch950/'],['ch960','/pt/colheitadeiras/colhedora-de-cana/ch960/'],
['cp690','/pt/colheitadeiras/colhedora-de-algodao/cp690/'],['cp770','/pt/colheitadeiras/colhedora-de-algodao/cp770/'],['cs690','/pt/colheitadeiras/colhedora-de-algodao/cs690/'],['cs770','/pt/colheitadeiras/colhedora-de-algodao/cs770/'],
['m4025','/pt/tratos-culturais/pulverizador-m4025/'],['m4030','/pt/tratos-culturais/pulverizador-m4030/'],['m4040','/pt/tratos-culturais/pulverizador-m4040/'],['r4023','/pt/tratos-culturais/pulverizador-r4023/'],
['8320r','/pt/tratores/série-8r-270cv-400cv/8320r/'],['8270r','/pt/tratores/série-8r-270cv-400cv/8270r/'],['8345r','/pt/tratores/série-8r-270cv-400cv/8345r/'],['8370r','/pt/tratores/série-8r-270cv-400cv/8370r/'],['8400r','/pt/tratores/série-8r-270cv-400cv/8400r/'],
['db74','/pt/soluções-para-plantio/plantadeira-db74/'],['db40','/pt/soluções-para-plantio/plantadeira-db40/'],['db50','/pt/soluções-para-plantio/plantadeira-db50/'],['db90','/pt/soluções-para-plantio/plantadeira-db90/'],
['210g','/pt/escavadeiras-hidráulicas/escavadeira-210g/'],['s670','/pt/colheitadeiras/série-s/s670/'],['s680','/pt/colheitadeiras/série-s/s680/'],['s690','/pt/colheitadeiras/série-s/s690/']];
const photos={};
async function harvest(id,url,strict=true){try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok){console.log('Missing page',id,r.status);return;}const html=await r.text();
await fs.writeFile(`${root}/assets/machines/page-${id}.txt`,url+'\n');
const paths=[...new Set([...html.matchAll(/(?:src|data-src|href)="([^"\s]+\.(?:jpg|png|webp))(?:\?[^"\s]*)?"/g)].map(m=>m[1]))];
const key=id.replace(/-/g,'');
const candidates=paths.filter(p=>p.toLowerCase().replace(/[-_]/g,'').includes(key)&&!/(salesmanual|logo|icon|feature|engine|motor|cabine|cab|cortador|monitor|thumb|small|r2g|r2c|r4f)/i.test(p)).sort((a,b)=>score(b)-score(a));
function score(p){return(/large|1920|1366|r4g|r4k/i.test(p)?20:0)+(/campo|field|action|hero/i.test(p)?8:0)+(/studio|estudio/i.test(p)?5:0);}
let chosen=candidates.slice(0,4);if(!chosen.length)return;
const images=[];for(let i=0;i<chosen.length;i++){const imgUrl=new URL(chosen[i],url).href;const res=await fetch(imgUrl,{signal:AbortSignal.timeout(30000)});if(!res.ok)continue;const buf=Buffer.from(await res.arrayBuffer());if(buf.length<12000)continue;const file=`assets/machines/${id}-${images.length}.${imgUrl.split('.').pop().split('?')[0]}`;await fs.writeFile(`${root}/${file}`,buf);images.push({file,url:imgUrl,source:url,bytes:buf.length});}
if(images.length)photos[id]={brand:'John Deere',images};console.log('Photos',id,images.length);
}catch(e){console.log('Photo error',id,e.message);}}
for(let i=0;i<pages.length;i+=4)await Promise.all(pages.slice(i,i+4).map(([id,path])=>harvest(id,'https://www.deere.com.br'+path)));
// Discover current, directly named models and their dedicated links from official category pages.
for(const path of ['/pt/equipamentos/','/pt/colheitadeiras/colhedora-de-algodao/','/pt/soluções-para-plantio/','/pt/escavadeiras-hidráulicas/','/pt/pás-carregadeiras/']){
try{const url='https://www.deere.com.br'+path;const html=await(await fetch(url,{signal:AbortSignal.timeout(30000)})).text();const links=[...new Set([...html.matchAll(/href="([^"#]+)"/g)].map(m=>m[1]))];
await fs.writeFile(`${root}/assets/machines/discovery-${encodeURIComponent(path)}.json`,JSON.stringify({url,links,images:[...html.matchAll(/(?:src|data-src)="([^"\s]+\.(?:jpg|png|webp))"/g)].map(m=>m[1])}));
for(const [id] of pages.filter(([id])=>!photos[id])){const link=links.find(l=>l.toLowerCase().replace(/[-_]/g,'').includes(id));if(link)await harvest(id,new URL(link,url).href);}
}catch(e){console.log('Discovery',e.message);}}
await fs.writeFile(`${root}/photos.json`,JSON.stringify(photos,null,2));console.log('PHOTO MODELS',Object.keys(photos));
