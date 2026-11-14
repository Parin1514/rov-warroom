// Minimal CDP smoke: node scripts/cdp-check.mjs [url]
// Requires Chrome. Prints JSON assertions to stdout.
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

const CHROME=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT=Number(process.env.CDP_PORT||9333)
const url=process.argv[2]||'http://127.0.0.1:5199/'
const profile=mkdtempSync(join(tmpdir(),'rov-cdp-'))
const child=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,`--user-data-dir=${profile}`,
 '--no-first-run','--no-default-browser-check','--disable-gpu','--hide-scrollbars','--window-size=1440,1100',url],{stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))

async function targetWS(){
 for(let i=0;i<60;i++){
  try{const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
   const page=list.find(t=>t.type==='page'&&t.url.startsWith('http'))
   if(page)return page.webSocketDebuggerUrl}catch{}
  await sleep(250)
 }
 throw new Error('no CDP target')
}
const ws=new WebSocket(await targetWS())
await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=()=>rej(new Error('ws fail'))})
let id=0
const pending=new Map()
const logs=[]
ws.onmessage=e=>{
 const m=JSON.parse(e.data)
 if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);return}
 if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')logs.push(m.params.args.map(a=>a.value||a.description).join(' '))
 if(m.method==='Runtime.exceptionThrown')logs.push('EXC: '+(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text))
}
const send=(method,params={})=>new Promise(res=>{const mid=++id;pending.set(mid,res);ws.send(JSON.stringify({id:mid,method,params}))})
const ev=async expression=>{
 const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})
 if(r.result?.exceptionDetails)return {__err:String(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text).split('\n')[0]}
 return r.result?.result?.value
}
await send('Runtime.enable')
const out={}
const waitFor=async(expr,label,ms=15000)=>{
 const t0=Date.now()
 while(Date.now()-t0<ms){if(await ev(expr)===true)return true;await sleep(200)}
 throw new Error('timeout waiting for '+label)
}
try{
 await sleep(2500)
 out.url=await ev('location.href')
 out.readyState=await ev('document.readyState')
 out.rootHtml=await ev("document.getElementById('root')?.innerHTML.slice(0,300)")
 out.bodyText=await ev("document.body.innerText.slice(0,300)")
 out.consoleErrorsEarly=logs.slice(0,8)
 await waitFor("document.querySelectorAll('nav button').length>0",'nav')
 out.title=await ev('document.title')
 out.nav=await ev("Array.from(document.querySelectorAll('nav button')).map(b=>b.textContent.trim())")
 // 1. Draft Team Analysis check on Draft page
 await ev(`(()=>{
   window.confirm=()=>true;
   Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('ลองดราฟต์ตัวอย่าง'))?.click();
 })()`)
 await sleep(600)
 out.draftFocus=await ev("document.querySelector('.team-draft-title')?.textContent")
 out.draftStrengths=await ev("Array.from(document.querySelectorAll('.team-column.strengths li b')).map(x=>x.textContent)")
 out.draftWeaknesses=await ev("Array.from(document.querySelectorAll('.team-column.weaknesses li b')).map(x=>x.textContent)")
 // 2. Check Florentino factual skill description in Intel modal
 await ev("Array.from(document.querySelectorAll('.slot-pick')).find(b=>b.textContent.includes('Florentino'))?.click()")
 await sleep(400)
 await ev("document.querySelector('.btn.intel-open')?.click()")
 await sleep(700)
 out.intelSkillFact=await ev("document.querySelector('.skill-fact-desc')?.textContent")
 out.intelSkillName=await ev("document.querySelector('.skill-preview-head b')?.textContent")
 await ev("document.querySelector('.intel-top .btn')?.click()")
 await sleep(400)
 // 3. Navigate to Counter page
 await ev("Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('เคาน์เตอร์')).click()")
 await waitFor("!!document.querySelector('.counter-panel')",'counter panel')
 out.counterPanel=true
 out.threatStrip=await ev("document.querySelector('.thread-strip')?.textContent||''")
 await ev(`(()=>{const i=document.querySelector('.counter-search input');
  const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
  set.call(i,'Aoi');i.dispatchEvent(new Event('input',{bubbles:true}));})()`)
 await sleep(450)
 out.candidateNames=await ev("Array.from(document.querySelectorAll('.counter-candidates .hero-tile strong')).map(x=>x.textContent)")
 await ev("document.querySelector('.counter-candidates .hero-tile')?.click()")
 await sleep(700)
 out.enemyChips=await ev("document.querySelectorAll('.counter-chip').length")
 out.answers=await ev("document.querySelectorAll('.answer-card').length")
 out.firstAnswer=await ev("document.querySelector('.answer-card')?.innerText.replace(/\\n/g,' | ')||''")
 out.scoreLabels=await ev("Array.from(document.querySelectorAll('.answer-card .score-bar b')).slice(0,6).map(x=>x.textContent)")
 out.threatAfter=await ev("document.querySelector('.thread-strip')?.textContent||''")
 await ev("document.querySelector('.answer-card')?.click()")
 await sleep(600)
 out.detailOpen=await ev("!!document.querySelector('.counter-detail')")
 out.detailItems=await ev("Array.from(document.querySelectorAll('.counter-item b')).map(x=>x.textContent)")
 out.miniRows=await ev("document.querySelectorAll('.counter-detail-grid .mini-row').length")
 out.playbookPlan=await ev("document.querySelector('.playbook-plan')?.innerText.replace(/\\n/g,' | ')||''")
 out.playbookPhases=await ev("Array.from(document.querySelectorAll('.playbook-phases dt')).map(x=>x.textContent)")
 out.playbookLines=await ev("document.querySelectorAll('.playbook-phases dd').length")
 out.playbookFirst=await ev("document.querySelector('.playbook-phases dd')?.textContent||''")
 await ev("Array.from(document.querySelectorAll('.counter-modes button')).find(b=>b.textContent.includes('เทียบ'))?.click()")
 await sleep(400)
 out.pairStage=await ev("!!document.querySelector('.pair-stage')")
 out.pairRows=await ev("document.querySelectorAll('.pair-row').length")
 out.setTabs=await ev("Array.from(document.querySelectorAll('.sets-tabs .chip')).map(x=>x.textContent)")
 out.setItems=await ev("Array.from(document.querySelectorAll('.sets-items li b')).map(x=>x.textContent)")
 await ev("document.querySelectorAll('.sets-tabs .chip')[1]?.click()")
 await sleep(300)
 out.setSwitched=await ev("Array.from(document.querySelectorAll('.sets-items li b')).map(x=>x.textContent)")
 out.setCopy=await ev("!!document.querySelector('.sets-copy')")
 out.noHorizontalScroll=await ev("document.documentElement.scrollWidth<=window.innerWidth+1")
 // hero dossier item sets
 await ev("document.querySelector('.pair-self .btn')?.click()")
 await sleep(900)
 out.intelOpen=await ev("!!document.querySelector('.intel-shell')")
 out.intelSkillFact=await ev("document.querySelector('.skill-fact-desc')?.textContent")
 out.intelSkillName=await ev("document.querySelector('.skill-preview-head b')?.textContent")
 out.intelSets=await ev("Array.from(document.querySelectorAll('.intel-sets .intel-build b')).map(x=>x.textContent)")
 out.intelItems=await ev("Array.from(document.querySelectorAll('#intel-items .intel-tile b')).map(x=>x.textContent)")
 out.intelMatch=await ev("Array.from(document.querySelectorAll('.intel-rail section:nth-child(2) .intel-match b')).map(x=>x.textContent)")
 await ev("document.querySelectorAll('.intel-sets .intel-build')[1]?.click()")
 await sleep(300)
 out.intelItemsSwitched=await ev("Array.from(document.querySelectorAll('#intel-items .intel-tile b')).map(x=>x.textContent)")
 out.consoleErrors=logs.slice(0,6)
 // Mobile pass: same page, 390x844 with touch emulation.
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true})
 await send('Emulation.setTouchEmulationEnabled',{enabled:true})
 await ev("document.querySelector('.intel-top .btn')?.click()")
 await sleep(500)
 out.mobileNoHScroll=await ev("document.documentElement.scrollWidth<=window.innerWidth+1")
 out.mobileAnswersVisible=await ev("document.querySelectorAll('.answer-card').length")
 out.mobileNavOverflow=await ev("(()=>{const n=document.querySelector('.top-inner nav');return n?n.scrollWidth<=n.clientWidth+2:null})()")
 out.mobileSetsUsable=await ev("(()=>{const t=document.querySelector('.sets-tabs');return t?t.getBoundingClientRect().height<140:null})()")
 await ev("window.scrollTo(0,document.body.scrollHeight)")
 await sleep(300)
 out.mobileBottomOverflow=await ev("document.body.scrollHeight>=document.documentElement.clientHeight")
}catch(e){out.failure=String(e.message||e)}
console.log(JSON.stringify(out,null,1))
child.kill()
process.exit(0)
