const download=document.getElementById('download');
const button=document.createElement('button');
button.textContent='Simular atendimento →';button.className='primary';button.id='request-crm';
download.after(button);
button.onclick=async()=>{
 button.disabled=true;
 try{
  const res=await fetch('catalog.json');if(!res.ok)throw Error('Não foi possível carregar a seleção.');
  const catalog=await res.json();const photo=location.pathname.includes('catalogo-maquinas');
  const raw=JSON.parse(localStorage.getItem(photo?'mw-photo-selection':'megawhip-3d-selection')||'[]');
  const items=raw.map(value=>{const url=photo?value.url:value;const p=catalog.items.find(p=>p.url===url);if(!p)return null;return {sku:p.code||p.pn,name:p.pn||p.title,model:photo?catalog.models.find(m=>m.id===value.modelId)?.name:'',url:p.url}}).filter(Boolean);
  if(!items.length)throw Error('Adicione pelo menos uma peça à seleção.');
  const old=JSON.parse(sessionStorage.getItem('mw-catalog-request')||'null');
  const eventId=old&&JSON.stringify(old.items)===JSON.stringify(items)?old.eventId:crypto.randomUUID();
  sessionStorage.setItem('mw-catalog-request',JSON.stringify({eventId,items}));
  location.href='/#/solicitar';
 }catch(e){alert(e.message||'Não foi possível salvar a seleção neste navegador.')}finally{button.disabled=false}
};
