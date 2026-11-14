// Regenerate src/hero-tags.json and src/items.json from the verified dossiers.
// Run: node scripts/build-hero-tags.mjs
import {readFileSync,writeFileSync} from 'node:fs'
const root=new URL('../src/',import.meta.url)
const details=JSON.parse(readFileSync(new URL('hero-details.json',root),'utf8'))
const heroes=JSON.parse(readFileSync(new URL('heroes.json',root),'utf8'))

const has=(tags,list)=>list.some(t=>tags.has(t))
const CC=['สตั้น','สตั๊น','ควบคุม','ล็อคตัว','แช่แข็ง','หยุดนิ่ง','ยั่วยุ','Fossilize']
const KNOCK=['ลอยขึ้น','ผลักถอยหลัง']
const DASH=['เคลื่อนที่','วาร์ป','ไม่ตกเป็นเป้าหมาย','ล่องหน']
const HEAL=['ฮีล','ฟื้นฟู','ดูดกลืน']
const INVIS=['ล่องหน','ไม่ตกเป็นเป้าหมาย']
const VISION=['เปิดแผนที่','ใบ้']
const TRUE=['จริง']
const MITIGATE=['ป้องกัน','ลดความเสียหาย','ต้านสถานะ','กันสถานะ','กันกายภาพ','ต้านความเสียหาย','ป้องกันตาย']

const tags={}
for(const h of heroes){
  const d=details[h.id]
  const set=new Set()
  let phys=0,magic=0
  for(const s of d?.skills||[])for(const t of s.tags||[]){
    set.add(t)
    if(t==='กายภาพ')phys++
    if(t==='เวท')magic++
  }
  const all=set
  tags[h.id]={
    id:h.id,
    cc:(has(all,CC)?1:0)+(has(all,KNOCK)?1:0),
    dash:has(all,DASH),
    heal:has(all,HEAL),
    invis:has(all,INVIS),
    vision:has(all,VISION),
    trueDmg:has(all,TRUE),
    mitigate:has(all,MITIGATE),
    phys,magic,
    tanky:h.role==='แทงค์'||h.role==='ไฟต์เตอร์',
    dive:h.role==='แอสซาซิน'&&has(all,DASH),
    poke:d?.specialty?.includes('ระยะไกล')===true,
    sustain:h.role==='ซัพพอร์ต'||has(all,HEAL),
    burst:h.role==='แอสซาซิน'||h.role==='เมจ'
  }
}
writeFileSync(new URL('hero-tags.json',root),JSON.stringify(tags))

const items=new Map()
for(const d of Object.values(details))for(const b of d.builds||[])for(const i of b.items){
  if(items.has(i.name))continue
  const cat=i.icon?.match(/Item\/([^/]+)\//)?.[1]||null
  items.set(i.name,{name:i.name,icon:i.icon,cat})
}
const list=[...items.values()].sort((a,b)=>a.name.localeCompare(b.name))
writeFileSync(new URL('items.json',root),JSON.stringify(list))
console.log('hero-tags',Object.keys(tags).length,'items',list.length)
