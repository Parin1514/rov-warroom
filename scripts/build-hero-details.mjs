// Rebuild src/hero-details.json entirely from the official rov.in.th hero pages.
// Each page embeds a JSON island with skills, runes, recommended items,
// challenger skill and enchantments — no third-party source needed.
// Run: node scripts/build-hero-details.mjs
import {readFileSync,writeFileSync} from 'node:fs'
const root=new URL('../src/',import.meta.url)
const heroes=JSON.parse(readFileSync(new URL('heroes.json',root),'utf8'))
const prev=JSON.parse(readFileSync(new URL('hero-details.json',root),'utf8'))
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
const dec=s=>s.replace(/&#x27;/g,"'").replace(/&amp;/g,'&')

// Icon URLs the page emits for items/runes/enchantments already point at
// cdn-webth.garenanow.com — keep them verbatim so no asset is guessed.
function section(html,from,to){
  const a=html.indexOf(from);if(a<0)return ''
  const b=to?html.indexOf(to,a+from.length):-1
  return html.slice(a,b>0?b:a+9000)
}
const labels=seg=>[...seg.matchAll(/aria-label="([^"]+)"/g)].map(m=>dec(m[1]))
const imgs=seg=>[...seg.matchAll(/"(https:\/\/cdn-webth[^"]+\.(?:png|webp|jpg))"/g)].map(m=>m[1])

function parseHero(html){
  // Skills: names appear as <h4>-ish children with cooldown text nearby.
  // The embedded island stores them as "children":"Name" inside skillblocks.
  const skillSeg=section(html,'className:\\"skills','ไอเทมแนะนำ')
  const skills=[...skillSeg.matchAll(/\\"children\\":\\"([^\\"]{2,60})\\"/g)]
    .map(m=>m[1]).filter(t=>!/^[\d\s%.]+$/.test(t))
  // Items: one column per set. Column starts at recommendItems__column; the set
  // name is in the first <h5>; the items are aria-labels within that column.
  const cols=[]
  for(const m of html.matchAll(/recommendItems__column[^>]*>([\s\S]*?)(?=recommendItems__column|สกิลชาเลนเจอร์|$)/g)){
    const seg=m[1]
    const setName=dec(seg.match(/<h5[^>]*>([^<]+)<\/h5>/)?.[1]||'แนะนำ')
    const names=[...new Set(labels(seg))]
    const imgSeg=imgs(seg).filter(u=>u.includes('/Item/'))
    const items=names.map((name,i)=>({name,icon:imgSeg.find(u=>u.toLowerCase().includes(fn(name).toLowerCase()))||imgSeg[i]||null}))
    if(items.length)cols.push({name:setName,items})
  }
  // Challenger skill: small block after the heading.
  const chalSeg=section(html,'สกิลชาเลนเจอร์','รูน')
  const knownItems=new Set(cols.flatMap(c=>c.items.map(i=>i.name)))
  const challenger=labels(chalSeg).find(n=>!knownItems.has(n))||null
  // Runes: between รูน and พลังแฝง — first three labels are the rune names.
  const runeSeg=section(html,'\\u0e23\\u0e39\\u0e19','พลังแฝง')||section(html,'รูน','พลังแฝง')
  const runeNames=labels(runeSeg).filter(n=>!knownItems.has(n)&&n!==challenger).slice(0,3)
  const runeImgs=imgs(runeSeg).filter(u=>u.includes('/Rune/'))
  const runes=runeNames.map((name,i)=>({name,color:['red','purple','green'][i]||'red',icon:runeImgs[i]||null}))
  // Enchantments: each <div class="enchantmentsWrapper"> is one row.
  // Inside: <a aria-label="Name"><img src="..."> per cell.
  const enchSeg=section(html,'enchantmentsContainer','สกิลชาเลนเจอร์')||section(html,'พลังแฝง','Facebook')
  const rows=[]
  for(const w of enchSeg.matchAll(/enchantmentsWrapper[^>]*>([\s\S]*?)(?=enchantmentsWrapper|<\/section|$)/g)){
    const cells=[...w[1].matchAll(/aria-label="([^"]+)"[^>]*><img src="([^"]+)"/g)]
      .map(m=>({name:dec(m[1]),icon:m[2]}))
      .filter(c=>c.icon.includes('/Enchantment/'))
    if(cells.length)rows.push(cells)
  }
  const enchantments=rows
  return {skills:[...new Set(skills)],cols,challenger,runes,enchantments}
}
function fn(name){return name.replace(/'/g,'_s').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')}

const out={}
let failed=[]
for(const h of heroes){
  const slug=h.sourceSlug
  if(!slug){failed.push(h.id);continue}
  try{
    const r=await fetch('https://www.rov.in.th/hero/'+slug,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(20000)})
    if(!r.ok)throw new Error('HTTP '+r.status)
    const html=await r.text()
    const p=parseHero(html)
    const old=prev[h.id]||{}
    out[h.id]={
      garena:r.ok?'https://www.rov.in.th/hero/'+slug:'https://www.rov.in.th/hero',
      skills:p.skills.length?p.skills.map((name,i)=>({name,slot:i===0?'พาสซีฟ':'สกิล '+i,tags:(old.skills||[]).find(s=>s.name===name)?.tags||[]})):old.skills||[],
      builds:p.cols.length?p.cols.map(c=>({name:c.name,items:c.items,review:{checkedAt:new Date().toISOString().slice(0,10),patch:'Garena ทางการ'}})):(old.builds||[]),
      challenger:p.challenger?{name:p.challenger}:(old.challenger||null),
      runes:p.runes.length?p.runes:(old.runes||[]),
      enchantments:p.enchantments.length?p.enchantments:(old.enchantments||[])
    }
    if(p.cols.length===0)failed.push(h.id+'(no-items)')
  }catch(e){failed.push(h.id+':'+e.message);if(prev[h.id])out[h.id]={...prev[h.id],garena:'https://www.rov.in.th/hero'}}
}
writeFileSync(new URL('hero-details.json',root),JSON.stringify(out,null,1))
console.log('heroes:',Object.keys(out).length,'failed/kept-old:',failed.length)
if(failed.length)console.log(failed.join('\n'))
