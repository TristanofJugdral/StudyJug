(() => {
 const MARK='data-studyjug-word';
 const skip='script,style,noscript,textarea,input,select,option,button,a,code,pre,svg,math,[contenteditable]:not([contenteditable="false"]),[data-studyjug-word],[data-studyjug-ui]';
 let entries=[],pattern=null,observer,timer,tip;
 let settings={showPhonetics:true},hoverTimer,hideTimer,pinned=false;
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const letter=c=>!!c&&/[\p{L}\p{N}\p{M}_]/u.test(c);
 const cjk=c=>!!c&&/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(c);
 function allowed(text,start,end,term){const first=Array.from(term)[0],last=Array.from(term).at(-1),before=Array.from(text.slice(0,start)).at(-1),after=Array.from(text.slice(end))[0];return !(letter(first)&&!cjk(first)&&letter(before))&&!(letter(last)&&!cjk(last)&&letter(after));}
 function hide(){clearTimeout(hoverTimer);clearTimeout(hideTimer);tip?.remove();tip=null;pinned=false;}
 function scan(){if(!document.body)return;observer?.disconnect();try{
  if(pattern){const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&!n.parentElement.closest(skip)&&n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
   for(const node of nodes){const text=node.nodeValue;pattern.lastIndex=0;let m,last=0,changed=false;const fragment=document.createDocumentFragment();while((m=pattern.exec(text))){const matches=entries.filter(e=>e.term.toLocaleLowerCase()===m[0].toLocaleLowerCase());if(!matches.length||!allowed(text,m.index,m.index+m[0].length,m[0]))continue;fragment.append(document.createTextNode(text.slice(last,m.index)));const span=document.createElement('span');span.setAttribute(MARK,'');span.className='studyjug-word';span.textContent=m[0];span.tabIndex=0;span.setAttribute('role','button');span.setAttribute('aria-label',`${m[0]}: show saved definition`);span.style.setProperty('--studyjug-color',matches[0].color);span._studyjugEntries=matches;fragment.append(span);last=m.index+m[0].length;changed=true;}if(changed){fragment.append(document.createTextNode(text.slice(last)));node.replaceWith(fragment);}}
  }
 }finally{observer.observe(document.body,{subtree:true,childList:true,characterData:true});}}
 async function refresh(){const data=await chrome.storage.local.get(['studyjugPacks','studyjugSettings']);settings={showPhonetics:true,...data.studyjugSettings};entries=(data.studyjugPacks||[]).filter(p=>p.enabled).flatMap(p=>p.words.filter(w=>w.term).map(w=>({...w,pack:p.name,packId:p.id,color:p.color})));entries.sort((a,b)=>b.term.length-a.term.length);pattern=entries.length?new RegExp(entries.map(e=>escape(e.term)).join('|'),'giu'):null;observer.disconnect();hide();document.querySelectorAll(`[${MARK}]`).forEach(s=>{const parent=s.parentNode;s.replaceWith(document.createTextNode(s.textContent));parent.normalize();});scan();}
 function show(target){hide();const host=document.createElement('div');host.setAttribute('data-studyjug-ui','');const shadow=host.attachShadow({mode:'closed'});const style=document.createElement('style');style.textContent=':host{all:initial;position:fixed;z-index:2147483647}section{box-sizing:border-box;width:280px;max-height:240px;overflow:auto;background:#fff;color:#293025;border:1px solid #dce4d1;border-radius:12px;padding:16px;box-shadow:0 8px 28px #0003;font:14px/1.5 system-ui}h2{font-size:17px;margin:0 25px 8px 0}p{margin:4px 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}small{color:#716086}button{float:right;border:0;background:#eee;border-radius:5px;cursor:pointer;font:18px system-ui}';const box=document.createElement('section'),close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Close definition');close.onclick=()=>{hide();target.focus();};box.append(close);const title=document.createElement('h2');title.textContent=target.textContent;box.append(title);for(const e of target._studyjugEntries){const label=document.createElement('small');label.textContent=e.pack;const p=document.createElement('p');p.textContent=settings.showPhonetics&&e.phonetic?`(${e.phonetic}) ${e.definition}`:e.definition;const star=document.createElement('button');star.textContent=e.starred?'★':'☆';star.setAttribute('aria-label',e.starred?'Unstar word':'Star word');star.setAttribute('aria-pressed',String(!!e.starred));star.onclick=async()=>{star.disabled=true;const result=await chrome.runtime.sendMessage({action:'studyjugStar',packId:e.packId,wordId:e.id});if(result.ok){e.starred=result.starred;star.textContent=e.starred?'★':'☆';star.setAttribute('aria-pressed',String(!!e.starred));}star.disabled=false;};box.append(label,star,p);}shadow.append(style,box);document.documentElement.append(host);tip=host;host.addEventListener('mouseenter',()=>clearTimeout(hideTimer));host.addEventListener('mouseleave',()=>{if(!pinned)hideTimer=setTimeout(hide,200);});const rect=target.getBoundingClientRect();host.style.left=Math.max(8,Math.min(rect.left,innerWidth-296))+'px';host.style.top=Math.max(8,Math.min(rect.bottom+8,innerHeight-256))+'px';}
 document.addEventListener('click',e=>{const target=e.target.closest?.(`[${MARK}]`);if(target){e.preventDefault();e.stopPropagation();show(target);pinned=true;}else if(tip&&!e.composedPath().includes(tip))hide();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if((e.key==='Enter'||e.key===' ')&&e.target.hasAttribute?.(MARK)){e.preventDefault();show(e.target);pinned=true;}});
 document.addEventListener('mouseover',e=>{const target=e.target.closest?.(`[${MARK}]`);if(!target||target.contains(e.relatedTarget)||pinned)return;clearTimeout(hideTimer);clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>show(target),200);});
 document.addEventListener('mouseout',e=>{const target=e.target.closest?.(`[${MARK}]`);if(!target||target.contains(e.relatedTarget))return;clearTimeout(hoverTimer);if(!pinned)hideTimer=setTimeout(hide,250);});
 window.addEventListener('scroll',hide,true);
 observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(scan,300);});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;const relevant=value=>(value||[]).map(p=>({id:p.id,name:p.name,color:p.color,enabled:p.enabled,words:p.words}));const changed=changes.studyjugPacks&&JSON.stringify(relevant(changes.studyjugPacks.oldValue))!==JSON.stringify(relevant(changes.studyjugPacks.newValue));if(changed||changes.studyjugSettings)refresh();});
 refresh();
})();
(() => {
 let rememberedSelection='';
 function capture(){const text=window.getSelection()?.toString()||'';if(text.trim())rememberedSelection=text;}
 document.addEventListener('pointerdown',()=>{rememberedSelection='';},true);
 document.addEventListener('selectionchange',capture);
 document.addEventListener('mouseup',capture);
 document.addEventListener('keyup',capture);
 window.addEventListener('blur',()=>{const text=window.getSelection()?.toString();if(text?.trim())rememberedSelection=text;});
 capture();
 chrome.runtime.onMessage.addListener((message,sender,respond)=>{if(message.action==='studyjugSelection')respond({text:window.getSelection()?.toString()||rememberedSelection});});
})();
