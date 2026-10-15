import fs from 'node:fs/promises';
const root='public/catalogo-maquinas';const original=JSON.parse(await fs.readFile(`${root}/photos.json`,'utf8'));const studio={};
const points={cp770:{motor:[28,34],cabine:[58,43],chassi:[38,62],colheita:[64,77],transmissao:[34,73],eletrica:[48,59]},'8320r':{motor:[64,42],cabine:[50,29],chassi:[45,58],transmissao:[35,62],eletrica:[48,47]},db74:{chassi:[57,53],colheita:[66,61],eletrica:[51,50]}};
for(const id of Object.keys(points)){studio[id]={brand:'John Deere',images:[{file:`assets/machines/${id}-studio.png`,url:original[id].images[0].url,source:original[id].images[0].source,caption:`${id.toUpperCase()} · cena editada a partir de fotografia oficial`,edited:true,points:points[id]}]};}
await fs.writeFile(`${root}/photos-studio.json`,JSON.stringify(studio,null,2));
