let packs = [];
let settings = {showPhonetics:true};
const palette=[['Lime green','#8bcf26'],['Red','#dc4545'],['Orange','#e68728'],['Yellow','#dabd19'],['Blue','#4385d6'],['Purple','#ad83db'],['Pink','#e276ae'],['Brown','#996742'],['Green','#269849'],['Light blue / cyan','#38bddd'],['Magenta','#d53bd3'],['Light brown','#c49365']];
const colors=palette.map(c=>c[1]);
let draft='';
const pageSelection=selectedPageText();
let entryDrafts={};
const openEntryForms=new Set();
let draftWrites=Promise.resolve();
const hasDraftContent=d=>!!d&&[d.term,d.phonetic,d.definition].some(v=>String(v||'').trim());
async function selectedPageText(){
 try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)return '';
 let text='';try{const response=await chrome.tabs.sendMessage(tab.id,{action:'studyjugSelection'});text=response?.text||'';}catch{}
 if(!text.trim()){const results=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func:()=>window.getSelection()?.toString()||''});text=results.map(r=>r.result).find(t=>typeof t==='string'&&t.trim())||'';}
 return String(text).trim().normalize('NFC').slice(0,200);
 }catch{return '';}
}

function persistEntryDrafts(){const snapshot=JSON.parse(JSON.stringify(entryDrafts));draftWrites=draftWrites.catch(()=>{}).then(()=>chrome.storage.local.set({studyjugEntryDrafts:snapshot}));return draftWrites;}

const localSearches=new Map();
const normalise=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().trim();
const wordMatches=(entry,q)=>[entry.term,entry.phonetic,entry.definition].some(value=>normalise(value).includes(q));
const root = document.querySelector('#packs');
function el(tag, text, cls) { const e = document.createElement(tag); if(text !== undefined) e.textContent=text; if(cls)e.className=cls; return e; }
async function save() { await chrome.storage.local.set({studyjugPacks:packs}); }
function status(text) { document.querySelector('#status').textContent=text; }
function render() {
 root.replaceChildren();
 if(!packs.length) root.append(el('p','Create your first language pack above.','empty'));
 for(const pack of packs) {
  const card=el('section',undefined,'pack'); card.style.setProperty('--pack-color',pack.color);card.dataset.packId=pack.id;
  const head=el('div',undefined,'pack-head'), open=el('button',`${pack.open?'▾':'▸'} ${pack.name} · ${pack.words.length}`);
  open.setAttribute('aria-expanded',String(!!pack.open));open.className='pack-open'; open.onclick=async()=>{pack.open=!pack.open;applySearch();await save();};
  const label=el('label','Underline'), toggle=el('input');toggle.type='checkbox';toggle.checked=pack.enabled;toggle.setAttribute('aria-label',`Underline ${pack.name}`);
  toggle.onchange=async()=>{pack.enabled=toggle.checked;await save();status('Updated on your open pages.');};label.prepend(toggle);const colourButton=el('button',undefined,'pack-colour');colourButton.type='button';colourButton.setAttribute('aria-label',`Change colour for ${pack.name}`);colourButton.setAttribute('aria-expanded','false');
  const colourGrid=el('div',undefined,'colour-grid');colourGrid.hidden=true;colourGrid.setAttribute('role','group');colourGrid.setAttribute('aria-label',`Colours for ${pack.name}`);
  for(const [name,value] of palette){const swatch=el('button',undefined,'colour-swatch');swatch.type='button';swatch.style.backgroundColor=value;swatch.setAttribute('aria-label',name);swatch.setAttribute('aria-pressed',String(pack.color===value));swatch.onclick=async()=>{pack.color=value;card.style.setProperty('--pack-color',value);colourGrid.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===swatch)));colourGrid.hidden=true;colourButton.setAttribute('aria-expanded','false');colourButton.focus();await save();};colourGrid.append(swatch);}
  colourButton.onclick=()=>{const opening=colourGrid.hidden;root.querySelectorAll('.colour-grid').forEach(g=>g.hidden=true);root.querySelectorAll('.pack-colour').forEach(b=>b.setAttribute('aria-expanded','false'));colourGrid.hidden=!opening;colourButton.setAttribute('aria-expanded',String(opening));if(opening)colourGrid.querySelector('[aria-pressed="true"]')?.focus();};
  colourGrid.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();colourGrid.hidden=true;colourButton.setAttribute('aria-expanded','false');colourButton.focus();}};
  head.append(colourButton,open,label);card.append(head,colourGrid);
  {
   const body=el('div',undefined,'pack-body'), form=el('form',undefined,'entry-form');

   const word=el('input');word.placeholder='Word or phrase';word.required=true;word.maxLength=200;word.setAttribute('aria-label','Word or phrase');
   const definition=el('textarea');definition.placeholder='Your definition or translation';definition.required=true;definition.maxLength=4000;definition.setAttribute('aria-label','Definition');
   const submit=el('button','Save word');let editing=null;
   const phonetic=el('input');phonetic.placeholder='Pronunciation (optional)';phonetic.maxLength=300;phonetic.setAttribute('aria-label','Pronunciation (optional)');
   const savedDraft=entryDrafts[pack.id];
   if(savedDraft){word.value=savedDraft.term||'';phonetic.value=savedDraft.phonetic||'';definition.value=savedDraft.definition||'';editing=savedDraft.editing||null;}else if(draft){word.value=draft;}
   const entryToggle=el('button','+ Add word','entry-toggle');entryToggle.type='button';
   const heading=el('strong',editing?'Edit word':'Add a new word','entry-heading'),closeForm=el('button','Close','entry-close');closeForm.type='button';
   const draftHint=el('p','Unfinished entries are saved automatically.','draft-hint');
   function setEntryOpen(open){form.hidden=!open;entryToggle.setAttribute('aria-expanded',String(open));if(open)openEntryForms.add(pack.id);else openEntryForms.delete(pack.id);entryToggle.textContent=open?'− Hide word form':(entryDrafts[pack.id]?'↩ Resume unfinished word':'+ Add word');}
   function rememberEntry(){const next={term:word.value,phonetic:phonetic.value,definition:definition.value,editing};if(hasDraftContent(next))entryDrafts[pack.id]=next;else{delete entryDrafts[pack.id];editing=null;heading.textContent='Add a new word';submit.textContent='Save word';}persistEntryDrafts().catch(()=>status('Could not save your unfinished entry.'));}
   form.addEventListener('input',rememberEntry);entryToggle.onclick=async()=>{const opening=form.hidden,resuming=hasDraftContent(entryDrafts[pack.id]);setEntryOpen(opening);if(opening){word.focus();if(!resuming){const selected=await pageSelection||await selectedPageText();if(selected&&!hasDraftContent(entryDrafts[pack.id])&&!word.value&&!phonetic.value&&!definition.value){word.value=selected;rememberEntry();}}}};closeForm.onclick=()=>{rememberEntry();setEntryOpen(false);entryToggle.focus();};
   form.append(heading,word,phonetic,definition,draftHint,submit,closeForm);setEntryOpen(openEntryForms.has(pack.id)||!!draft);
form.onsubmit=async e=>{e.preventDefault();const term=word.value.trim().normalize('NFC'),meaning=definition.value.trim();if(!term||!meaning)return;const duplicate=pack.words.find(w=>w.id!==editing&&w.term.toLocaleLowerCase()===term.toLocaleLowerCase());if(duplicate){status('That word is already in this pack. Use Edit.');return;}const old=pack.words.find(w=>w.id===editing);const entry={...old,id:editing||crypto.randomUUID(),createdAt:old?.createdAt||Date.now(),term,phonetic:phonetic.value.trim(),definition:meaning};if(editing)pack.words=pack.words.map(w=>w.id===editing?entry:w);else pack.words.push(entry);await save();delete entryDrafts[pack.id];await persistEntryDrafts();openEntryForms.delete(pack.id);draft='';await chrome.storage.local.remove('studyjugDraft');render();status('Word saved.');};
   const searchArea=el('div',undefined,'pack-search-area'),searchControl=el('div',undefined,'pack-search-control'),searchButton=el('button',undefined,'pack-search-button'),local=el('input');
   searchButton.type='button';searchButton.setAttribute('aria-label',`Search words in ${pack.name}`);searchButton.setAttribute('aria-expanded','false');
   const glass=()=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const circle=document.createElementNS(svg.namespaceURI,'circle');circle.setAttribute('cx','10.5');circle.setAttribute('cy','10.5');circle.setAttribute('r','6.5');const line=document.createElementNS(svg.namespaceURI,'path');line.setAttribute('d','M16 16l5 5');svg.append(circle,line);return svg;};searchButton.append(glass());
   local.type='search';local.placeholder='Search words, pronunciation or definitions…';local.setAttribute('aria-label',`Search words in ${pack.name}`);local.value=localSearches.get(pack.id)||'';local.hidden=!local.value;
   const searchEnd=el('span',undefined,'pack-search-end');searchEnd.append(glass());searchEnd.hidden=local.hidden;
   function setSearchOpen(open){local.hidden=!open;searchEnd.hidden=!open;searchButton.hidden=open;searchButton.setAttribute('aria-expanded',String(open));searchControl.classList.toggle('is-open',open);}
   setSearchOpen(!!local.value);searchButton.onclick=()=>{setSearchOpen(true);local.focus();};
   local.oninput=()=>{localSearches.set(pack.id,local.value);applySearch();};
   searchControl.addEventListener('focusout',()=>{setTimeout(()=>{if(!searchControl.contains(document.activeElement)&&!local.value.trim()){local.value='';localSearches.delete(pack.id);applySearch();setSearchOpen(false);}},0);});
   local.onkeydown=e=>{if(e.key==='Escape'){local.value='';localSearches.delete(pack.id);applySearch();setSearchOpen(false);searchButton.focus();}};
   searchControl.append(searchButton,local,searchEnd);searchArea.append(searchControl);body.append(searchArea);

   const list=el('div',undefined,'words');
   for(const entry of [...pack.words].sort((a,b)=>Number(!!b.starred)-Number(!!a.starred))){const row=el('div',undefined,'word'),text=el('div');row.dataset.wordId=entry.id;text.append(el('strong',entry.term));if(entry.phonetic)text.append(el('p',entry.phonetic,'phonetic'));text.append(el('p',entry.definition));const edit=el('button','Edit'),remove=el('button','Delete');edit.onclick=()=>{editing=entry.id;word.value=entry.term;phonetic.value=entry.phonetic||'';definition.value=entry.definition;submit.textContent='Save changes';heading.textContent='Edit word';rememberEntry();setEntryOpen(true);word.focus();};remove.onclick=async()=>{pack.words=pack.words.filter(w=>w.id!==entry.id);await save();render();};const star=el('button',entry.starred?'★':'☆');star.setAttribute('aria-label',entry.starred?'Unstar word':'Star word');star.setAttribute('aria-pressed',String(!!entry.starred));star.onclick=async()=>{const result=await chrome.runtime.sendMessage({action:'studyjugStar',packId:pack.id,wordId:entry.id});if(result.ok){entry.starred=result.starred;render();}};row.append(text,star,edit,remove);list.append(row);}
   const noWords=el('p','No words yet. Choose Add word to begin.','empty word-empty');list.append(noWords);
   const removePack=el('button','Delete pack','secondary');removePack.onclick=async()=>{if(!confirm(`Delete ${pack.name} and its words?`))return;packs=packs.filter(p=>p.id!==pack.id);await save();render();};
   body.append(entryToggle,form,list,removePack);card.append(body);
  }root.append(card);
 }
 applySearch();
}
document.querySelector('#pack-form').onsubmit=async e=>{e.preventDefault();const input=document.querySelector('#pack-name'),name=input.value.trim();if(!name)return;if(packs.some(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase())){status('A pack with that name already exists.');return;}packs.push({id:crypto.randomUUID(),name,color:colors[packs.length%2],enabled:true,open:true,words:[]});await save();input.value='';render();};
(async()=>{try{const data=await chrome.storage.local.get(['studyjugPacks','languages','studyjugSettings','studyjugDraft','studyjugEntryDrafts']);entryDrafts=data.studyjugEntryDrafts||{};for(const id of Object.keys(entryDrafts)){if(!hasDraftContent(entryDrafts[id]))delete entryDrafts[id];}await persistEntryDrafts();draft=data.studyjugDraft||'';settings={showPhonetics:true,searchScope:'both',...data.studyjugSettings};document.querySelector('#search-scope').value=settings.searchScope;document.querySelector('#show-phonetics').checked=settings.showPhonetics;if(Array.isArray(data.studyjugPacks))packs=data.studyjugPacks;else{packs=Object.entries(data.languages||{}).map(([name,words],i)=>({id:crypto.randomUUID(),name,color:colors[i%2],enabled:true,open:false,words:Object.entries(words).map(([term,v])=>({id:crypto.randomUUID(),term,definition:String(v.translation||'')}))}));await save();}if(draft){packs.forEach(p=>p.open=true);status('Selected text is ready. Choose its pack, add a definition, then save.');}render();}catch(e){status('Could not load your word bank. Please reopen StudyJug.');}})();
document.querySelector('#show-phonetics').onchange=async e=>{settings.showPhonetics=e.target.checked;await chrome.storage.local.set({studyjugSettings:settings});status('Settings saved.');};

chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;if(changes.studyjugPacks){const incoming=changes.studyjugPacks.newValue||[];const same=packs.length===incoming.length&&incoming.every(p=>packs.some(old=>old.id===p.id));if(same){for(const next of incoming){const current=packs.find(p=>p.id===next.id);Object.assign(current,next);}applySearch();}else{packs=incoming;render();}}if(changes.studyjugDraft?.newValue){draft=changes.studyjugDraft.newValue;packs.forEach(p=>p.open=true);render();}});

function applySearch(){
 const q=normalise(document.querySelector('#library-search').value),scope=settings.searchScope||'both';
 const results=document.querySelector('#word-results');results.replaceChildren();results.hidden=!q||scope==='packs';
 let wordCount=0,packCount=0;
 if(q&&scope!=='packs'){
  results.append(el('h2','Matching words'));
  for(const pack of packs)for(const entry of [...pack.words].sort((a,b)=>Number(!!b.starred)-Number(!!a.starred))){
   if(!wordMatches(entry,q))continue;wordCount++;
   const button=el('button',undefined,'word-result');button.append(el('strong',entry.term),el('small',pack.name),el('span',(settings.showPhonetics&&entry.phonetic?'('+entry.phonetic+') ':'')+entry.definition));
   button.onclick=()=>{document.querySelector('#library-search').value='';localSearches.delete(pack.id);pack.open=true;render();const card=[...root.querySelectorAll('.pack')].find(c=>c.dataset.packId===pack.id),row=[...card.querySelectorAll('.word')].find(r=>r.dataset.wordId===entry.id);row.scrollIntoView({block:'nearest'});row.tabIndex=-1;row.focus();};results.append(button);
  }
  if(!wordCount)results.append(el('p','No matching words.','empty'));
 }
 for(const card of root.querySelectorAll('.pack')){
  const pack=packs.find(p=>p.id===card.dataset.packId);if(!pack)continue;
  card.hidden=!!q&&(scope==='words'||!normalise(pack.name).includes(q));if(card.hidden)continue;packCount++;
  const local=normalise(localSearches.get(pack.id));let count=0;
  for(const row of card.querySelectorAll('.word')){const entry=pack.words.find(w=>w.id===row.dataset.wordId);row.hidden=!!local&&!wordMatches(entry,local);if(!row.hidden)count++;}
  const empty=card.querySelector('.word-empty');empty.hidden=count>0;empty.textContent=pack.words.length?'No matching words. Try a different search.':'No words yet. Choose Add word to begin.';
  const expanded=!!pack.open;card.querySelector('.pack-body').hidden=!expanded;const open=card.querySelector('.pack-open');open.setAttribute('aria-expanded',String(expanded));open.textContent=`${expanded?'▾':'▸'} ${pack.name} · ${local?count+' / ':''}${pack.words.length}`;
 }
 const heading=document.querySelector('#pack-results-heading');heading.hidden=!q||scope==='words';
 document.querySelector('#search-summary').textContent=q?`${wordCount} matching words · ${packCount} matching packs`:'';
 let empty=root.querySelector('.library-empty');if(!empty){empty=el('p','No matching packs.','empty library-empty');root.append(empty);}empty.hidden=!q||scope==='words'||packCount>0;
}
document.querySelector('#library-search').oninput=applySearch;
document.querySelector('#search-scope').onchange=async e=>{settings.searchScope=e.target.value;await chrome.storage.local.set({studyjugSettings:settings});applySearch();};

document.addEventListener('click',e=>{if(e.target.closest('.pack-colour,.colour-grid'))return;root.querySelectorAll('.colour-grid').forEach(g=>g.hidden=true);root.querySelectorAll('.pack-colour').forEach(b=>b.setAttribute('aria-expanded','false'));});
