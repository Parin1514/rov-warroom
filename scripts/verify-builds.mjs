// Verify src/hero-details.json builds against the live Garena hero pages.
// Read-only: prints a diff report, writes nothing. Run: node scripts/verify-builds.mjs
import {readFileSync,writeFileSync} from 'node:fs'
const root=new URL('../src/',import.meta.url)
const details=JSON.parse(readFileSync(new URL('hero-details.json',root),'utf8'))
const heroes=JSON.parse(readFileSync(new URL('heroes.json',root),'utf8'))
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'

// Garena item filenames lose the apostrophe: "Fenrir_s_Tooth" -> "Fenrir's Tooth".
// Build the reverse map from the names we already have so no name is guessed.
const known=new Map()
for(const d of Object.values(details))for(const b of d.builds||[])for(const i of b.items)known.set(fn(i.name),i.name)
function fn(name){return name.replace(/'/g,'_s').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')}
// The page escapes apostrophes as &#x27; in aria-labels.
const dec=s=>s.replace(/&#x27;/g,"'").replace(/&amp;/g,'&')

async function page(slug){
  const r=await fetch('https://www.rov.in.th/hero/'+slug,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(20000)})
  if(!r.ok)return {status:r.status,items:null}
  const html=await r.text()
  const block=html.match(/ไอเทมแนะนำ([\s\S]{0,4000}?)สกิลชาเลนเจอร์/)
  if(!block)return {status:200,items:null}
  const items=[...block[1].matchAll(/aria-label="([^"]+)"/g)].map(m=>dec(m[1]))
  return {status:200,items:[...new Set(items)]}
}

const report=[]
for(const h of heroes){
  const slug=h.sourceSlug
  if(!slug){report.push({id:h.id,note:'no sourceSlug'});continue}
  const live=await page(slug)
  const mine=(details[h.id]?.builds||[]).flatMap(b=>b.items.map(i=>i.name))
  report.push({id:h.id,name:h.name,slug,status:live.status,live:live.items,mine:[...new Set(mine)]})
}
writeFileSync(new URL('../.build-report.json',root),JSON.stringify(report,null,1))

const cmp=r=>{
  if(r.live===null||r.live===undefined)return 'no-live-data'
  const norm=list=>list.map(n=>known.get(fn(n))||n).sort().join('|')
  return norm(r.live)===norm(r.mine)?'same':'DIFF'
}
const buckets={}
for(const r of report)buckets[cmp(r)]=(buckets[cmp(r)]||0)+1
console.log(JSON.stringify(buckets,null,1))
for(const r of report)if(cmp(r)==='DIFF')console.log('\n'+r.id,'\n  live:',(r.live||[]).join(', '),'\n  app :',(r.mine||[]).join(', '))
for(const r of report)if(cmp(r)==='no-live-data')console.log('NO LIVE DATA:',r.id,r.status)
