// Keep popup dimensions under page control instead of the OS select popup.
(function(){
let active=null;
const close=()=>{if(active){active.menu.hidden=true;active.button.setAttribute('aria-expanded','false');active=null;}};
for(const select of document.querySelectorAll('#rescene-record select')){
const wrap=document.createElement('span');wrap.className='rr-picker';
select.before(wrap);wrap.append(select);select.hidden=true;
const button=document.createElement('button');button.type='button';button.className='rr-picker-button';
button.setAttribute('aria-label',select.getAttribute('aria-label')||'');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
const menu=document.createElement('span');menu.className='rr-picker-menu';menu.hidden=true;menu.id=select.id+'-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',select.getAttribute('aria-label')||'');button.setAttribute('aria-controls',menu.id);wrap.append(button,menu);
const sync=()=>{button.textContent=select.selectedOptions[0]?.textContent||'';button.disabled=select.disabled;if(active?.button===button)close();};
const open=()=>{close();menu.replaceChildren();for(const option of select.options){const item=document.createElement('button');item.type='button';item.className='rr-picker-option';item.textContent=option.textContent;item.setAttribute('role','option');item.setAttribute('aria-selected',String(option.value===select.value));item.disabled=option.disabled;item.onclick=e=>{e.preventDefault();select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close();button.focus();};menu.append(item);}menu.hidden=false;button.setAttribute('aria-expanded','true');active={button,menu};const rect=button.getBoundingClientRect();menu.classList.toggle('rr-picker-above',window.innerHeight-rect.bottom<Math.min(240,menu.scrollHeight)+12&&rect.top>240);menu.querySelector('[aria-selected="true"]')?.focus();};
button.onclick=e=>{e.preventDefault();active?.button===button?close():open();};
button.onkeydown=e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();open();if(e.key==='Home')menu.firstElementChild?.focus();if(e.key==='End')menu.lastElementChild?.focus();}};
menu.onkeydown=e=>{const items=Array.from(menu.children).filter(x=>!x.disabled),i=items.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();close();button.focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();}else if(e.key==='Tab')close();};
select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{childList:true,subtree:true,attributes:true});sync();
}
document.addEventListener('pointerdown',e=>{if(active&&!active.button.parentElement.contains(e.target))close();});window.addEventListener('resize',close);
})();
