// Mobile-only CDP check: node scripts/cdp-mobile.mjs [url]
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
const CHROME=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=Number(process.env.CDP_PORT||9334)
const url=process.argv[2]||'http://localhost:5199/'
const profile=mkdtempSync(join(tmpdir(),'rov-mob-'))
const child=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,
 '--no-first-run','--disable-gpu','--hide-scrollbars','--window-size=390,844',url],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const wsUrl=await (async()=>{for(let i=0;i<60;i++){try{const l=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();const p=l.find(t=>t.type==='page'&&t.url.startsWith('http'));if(p)return p.webSocketDebuggerUrl}catch{}await sleep(250)}throw Error('no target')})()
const ws=new WebSocket(wsUrl)
await new Promise(r=>{ws.onopen=r})
let id=0;const pend=new Map();const logs=[]
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return}
 if(m.method==='Runtime.exceptionThrown')logs.push('EXC '+(m.params.exceptionDetails.exception?.description||'').split('\n')[0])}
const send=(method,params={})=>new Promise(res=>{const mid=++id;pend.set(mid,res);ws.send(JSON.stringify({id:mid,method,params}))})
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})
 if(r.result?.exceptionDetails)return {__err:String(r.result.exceptionDetails.exception?.description||'').split('\n')[0]}
 return r.result?.result?.value}
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true})
await send('Emulation.setTouchEmulationEnabled',{enabled:true})
const out={}
try{
 const wait=async(expr,ms=15000)=>{const t=Date.now();while(Date.now()-t<ms){if(await ev(expr)===true)return true;await sleep(200)}throw Error('timeout '+expr)}
 await wait("document.querySelectorAll('nav button').length>0")
 await ev("Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('เคาน์เตอร์')).click()")
 await wait("!!document.querySelector('.counter-panel')")
 await ev(`(()=>{const i=document.querySelector('.counter-search input');
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  set.call(i,'Aoi');i.dispatchEvent(new Event('input',{bubbles:true}))})()`)
 await sleep(400)
 await ev("document.querySelector('.counter-candidates .hero-tile')?.click()")
 await sleep(700)
 out.answers=await ev("document.querySelectorAll('.answer-card').length")
 out.answerCols=await ev("(()=>{const g=document.querySelector('.answer-grid');return g?getComputedStyle(g).gridTemplateColumns:null})()")
 out.cardWidth=await ev("(()=>{const c=document.querySelector('.answer-card');return c?Math.round(c.getBoundingClientRect().width):null})()")
 out.vw=await ev('window.innerWidth')
 out.noHScroll=await ev("document.documentElement.scrollWidth<=window.innerWidth+1")
 out.barRow=await ev("(()=>{const c=document.querySelector('.answer-card'),b=c?.querySelector('.score-bar');if(!b)return null;const t=c.querySelector('.answer-text').getBoundingClientRect();return {barOnOwnRow:b.getBoundingClientRect().top>t.top+4,barW:Math.round(b.getBoundingClientRect().width),cardW:Math.round(c.getBoundingClientRect().width)}})()")
 await ev("document.querySelector('.answer-card').click()")
 await sleep(600)
 out.detail=await ev("!!document.querySelector('.counter-detail')")
 out.detailCols=await ev("(()=>{const g=document.querySelector('.counter-detail-grid');return g?getComputedStyle(g).gridTemplateColumns:null})()")
 out.setTabsWrap=await ev("(()=>{const t=document.querySelector('.sets-tabs');if(!t)return null;const h=t.getBoundingClientRect().height;return Math.round(h)})()")
 out.copyBtn=await ev("(()=>{const b=document.querySelector('.sets-copy');if(!b)return null;const r=b.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}})()")
 out.noHScroll2=await ev("document.documentElement.scrollWidth<=window.innerWidth+1")
 out.tapTargets=await ev("(()=>{const small=Array.from(document.querySelectorAll('.counter-panel button')).filter(b=>b.getBoundingClientRect().height<24&&b.getBoundingClientRect().width>0).length;return small})()")
 out.errors=logs.slice(0,4)
}catch(e){out.failure=String(e.message||e)}
console.log(JSON.stringify(out,null,1))
child.kill();process.exit(0)
