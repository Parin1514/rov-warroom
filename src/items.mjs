// Item recommendation engine. Catalogue is the 53 items that appear in the
// verified Garena builds (src/items.json). Rules map verified hero tags and
// role to the item effect an analyst would pick; no win-rate claim is made.
import tags from './hero-tags.json' with {type:'json'}
import items from './items.json' with {type:'json'}

const byName=new Map(items.map(i=>[i.name,i]))
const HAS=name=>byName.has(name)

// name, roles that should consider it, tags it answers, why, category.
const RULES=[
  {name:'Glided Greaves',roles:['แทงค์','ไฟต์เตอร์','แอสซาซิน'],for:['cc'],cat:'กัน',why:'ลดเวลาถูกควบคุม ใช้เมื่ออีกฝั่งมีสกิลควบคุมหลายช่อง'},
  {name:'Medallion of Troy',roles:['แทงค์','ไฟต์เตอร์','ซัพพอร์ต'],for:['magic'],cat:'กัน',why:'เพิ่มความต้านทานเวทและลดเวลาติดสถานะ เหมาะกับทีมที่เจอเวทหนัก'},
  {name:'The Aegis',roles:['แทงค์','ซัพพอร์ต'],for:['magic'],cat:'กัน',why:'โล่กันเวทให้เพื่อนใกล้ตัว ใช้เมื่ออีกฝั่งมีเมจทำดาเมจหลัก'},
  {name:"Hyoga's Edge",roles:['แครี่','ไฟต์เตอร์','แอสซาซิน'],for:['tanky'],cat:'เจาะ',why:'ตัดความเร็วเคลื่อนที่และเกราะ ช่วยให้ทีมตามตัวหนาได้ทัน'},
  {name:'Spear of Longinus',roles:['ไฟต์เตอร์','แครี่'],for:['tanky'],cat:'เจาะ',why:'ลดเกราะเป้าหมายซ้ำ ๆ เหมาะกับตัวที่ต้องเจาะแนวหน้า'},
  {name:'Muramasa',roles:['แครี่','แอสซาซิน','ไฟต์เตอร์'],for:['tanky','dash'],cat:'เจาะ',why:'เจาะเกราะเป้าหมายที่หนาที่สุดในไฟต์'},
  {name:'Staff of Nuul',roles:['เมจ'],for:['tanky','mitigate'],cat:'เจาะ',why:'ลดความต้านทานเวทของเป้าหมาย เหมาะกับเมจที่ต้องเจอตัวหนา'},
  {name:'Frost Cape',roles:['แทงค์','ไฟต์เตอร์'],for:['dash','phys'],cat:'คุม',why:'สร้างพื้นที่ชะลอ ช่วยหยุดตัวที่ต้องวิ่งเข้าหา'},
  {name:'Mail of Pain',roles:['แทงค์','ไฟต์เตอร์'],for:['phys'],cat:'กัน',why:'สะท้อนดาเมจกายภาพ ใช้เมื่ออีกฝั่งพึ่งดาเมจกายภาพ'},
  {name:"Gaia's Standard",roles:['แทงค์','ไฟต์เตอร์'],for:['magic'],cat:'กัน',why:'ฟื้นฟูเมื่อรับดาเมจเวท เหมาะกับการโดนเมจกดดันต่อเนื่อง'},
  {name:'Curse of Death',roles:['เมจ','ซัพพอร์ต'],for:['heal'],cat:'ตอบโต้',why:'ลดการฟื้นฟูของเป้าหมาย ใช้เมื่ออีกฝั่งมีตัวฮีลหรือฟื้นฟูสูง'},
  {name:'Blade of Eternity',roles:['แครี่','แอสซาซิน','เมจ'],for:['burst','dive'],cat:'กัน',why:'กันจังหวะเบิร์สต์ด้วยโล่ชั่วคราว ใช้เมื่ออีกฝั่งปิดงานเร็ว'},
  {name:'Death Sickle',roles:['แครี่','แอสซาซิน'],for:['burst','dive'],cat:'กัน',why:'เผื่อจังหวะรอดจากดาเมจปิดงานและกลับเข้าไฟต์'},
  {name:'Arctic Orb',roles:['เมจ','ซัพพอร์ต','แครี่'],for:['cc','burst'],cat:'กัน',why:'ปลดสถานะและลดดาเมจช่วงสั้น เหมาะกับตัวที่ถูกจับเป็นเป้าหมายแรก'},
  {name:'Rock Shield',roles:['แทงค์','ไฟต์เตอร์','ซัพพอร์ต'],for:['poke','magic'],cat:'กัน',why:'ดูดดาเมจและให้โล่ ใช้เมื่อโดนโปะก่อนเริ่มไฟต์'},
  {name:"Hercules's Madness",roles:['แทงค์','ไฟต์เตอร์'],for:['burst','phys'],cat:'กัน',why:'เพิ่มความทนทานระหว่างไฟต์ยาว เหมาะกับแนวหน้าที่ปะทะต่อเนื่อง'},
  {name:'Leviathan',roles:['แทงค์'],for:['tanky'],cat:'บูสต์',why:'เสริมพลังเมื่อปะทะหลายเป้าหมาย เหมาะกับแนวหน้า'},
  {name:'Omni Arms',roles:['ไฟต์เตอร์','แครี่'],for:['heal','sustain'],cat:'บูสต์',why:'เสริมการฟื้นฟูหลังใช้สกิล เหมาะกับตัวที่ฟื้นฟูต่อเนื่อง'},
  {name:"Rhea's Blessing",roles:['ซัพพอร์ต','เมจ'],for:['heal','sustain'],cat:'บูสต์',why:'เพิ่มผลการรักษาและการฟื้นฟูให้ตัวเองและเพื่อน'},
  {name:"Hermes' Select",roles:['ซัพพอร์ต','แทงค์'],for:['roam'],cat:'เคลื่อนที่',why:'เพิ่มความเร็วเคลื่อนที่และช่วยหมุนแผนที่เร็วขึ้น'},
  {name:'Sonic Boots',roles:['แครี่','เมจ'],for:['poke','kite'],cat:'เคลื่อนที่',why:'เพิ่มความเร็วโจมตีและเคลื่อนที่ เหมาะกับตัวยิงระยะไกล'},
  {name:'War Boots',roles:['แทงค์','ไฟต์เตอร์'],for:['phys'],cat:'กัน',why:'เพิ่มเกราะกายภาพช่วงต้น ใช้เมื่อเลนเจอดาเมจกายภาพหนัก'},
  {name:'Enchanted Kicks',roles:['เมจ','ซัพพอร์ต'],for:['magic'],cat:'กัน',why:'เพิ่มความต้านทานเวทช่วงต้น ใช้เมื่อเลนเจอเมจ'},
  {name:"Fenrir's Tooth",roles:['แอสซาซิน','ไฟต์เตอร์'],for:['burst','dive'],cat:'เจาะ',why:'เพิ่มดาเมจปิดงานกับเป้าหมายที่เลือดเหลือน้อย'},
  {name:'Bow of Slaughter',roles:['แครี่'],for:['heal'],cat:'ตอบโต้',why:'ลดการฟื้นฟูเป้าหมายต่อเนื่อง เหมาะกับแครี่ที่ต้องสู้กับตัวฮีล'},
  {name:"Fafnir's Talon",roles:['แครี่','ไฟต์เตอร์'],for:['phys','burst'],cat:'เจาะ',why:'เสริมความเร็วโจมตีและดาเมจจริงชั่วคราว ใช้ปิดเป้าหมายหนา'},
  {name:'Blitz Blades',roles:['แอสซาซิน','ไฟต์เตอร์'],for:['dive','burst'],cat:'บูสต์',why:'เสริมความเร็วโจมตีและลดคูลดาวน์ เหมาะกับตัวที่ต้องใช้สกิลรัว'},
  {name:"Slikk's Sting",roles:['แอสซาซิน'],for:['dive'],cat:'เจาะ',why:'เพิ่มความเร็วโจมตีและความแรงเข้าหาเป้าหมายเดียว'},
  {name:'Soulreaver',roles:['แอสซาซิน','แครี่'],for:['burst','phys'],cat:'เจาะ',why:'สะสมดาเมจปิดงานเมื่อยิงเป้าเดิมซ้ำ'},
  {name:'Shield of the Lost',roles:['แทงค์','ไฟต์เตอร์'],for:['phys'],cat:'กัน',why:'ลดดาเมจกายภาพจากหลายเป้าหมาย เหมาะกับแนวหน้า'},
  {name:'Amulet of Longevity',roles:['แทงค์','เมจ','ซัพพอร์ต'],for:['burst','magic'],cat:'กัน',why:'เพิ่มเลือดและฟื้นฟู เหมาะกับตัวที่ต้องทนจังหวะเบิร์สต์เวท'},
  {name:"Odin's Will",roles:['แทงค์','แอสซาซิน','ไฟต์เตอร์'],for:['cc','dive'],cat:'กัน',why:'ปลดสถานะช้าและเพิ่มความเร็ว ใช้เมื่อถูกตรึงในไฟต์'},
  {name:"Frosty's Revenge",roles:['แทงค์','ไฟต์เตอร์'],for:['dash','phys'],cat:'คุม',why:'ชะลอเป้าหมายที่เข้าหา ช่วยให้ทีมถอยเป็น'},
  {name:'Boomstick',roles:['เมจ'],for:['burst','magic'],cat:'บูสต์',why:'เสริมดาเมจสกิลระยะแรกของไฟต์ เหมาะกับเมจเบิร์สต์'},
  {name:"Hecate's Diadem",roles:['เมจ'],for:['magic','burst'],cat:'บูสต์',why:'เพิ่มดาเมจเวทต่อเนื่อง เหมาะกับเมจที่ยืนยิง'},
  {name:'Holy of Holies',roles:['เมจ'],for:['magic'],cat:'บูสต์',why:'เพิ่มดาเมจเวทสูงสุด เหมาะกับเมจที่ปลอดภัยพอจะยืนยิง'},
  {name:'Orb of the Magi',roles:['เมจ'],for:['magic','sustain'],cat:'บูสต์',why:'เพิ่มดาเมจเวทและฟื้นฟู เหมาะกับเมจที่ต้องอยู่ยาว'},
  {name:'Apocalypse',roles:['เมจ'],for:['magic','tanky'],cat:'เจาะ',why:'เพิ่มดาเมจเวทตามเลือดเป้าหมาย เหมาะกับเมจที่เจอแนวหน้า'},
  {name:'Soaring Aura',roles:['เมจ','ซัพพอร์ต'],for:['magic','heal'],cat:'บูสต์',why:'เพิ่มพลังเวทให้ทีมและลดต้านเวทศัตรู เหมาะกับทีมเมจหลายตัว'},
  {name:'Poseidon Emblem',roles:['ซัพพอร์ต','เมจ'],for:['magic'],cat:'บูสต์',why:'เสริมดาเมจเวทให้เพื่อนรอบตัว เหมาะกับทีมที่พึ่งเวท'},
  {name:'Soul Strom Badge',roles:['ซัพพอร์ต','เมจ'],for:['magic','heal'],cat:'บูสต์',why:'เสริมพลังเวทและคูลดาวน์ เหมาะกับซัพพอร์ตเวท'},
  {name:"Berith's Agony",roles:['แทงค์','ไฟต์เตอร์'],for:['tanky'],cat:'เจาะ',why:'เผาดาเมจเวทต่อเนื่องตามเลือด เหมาะกับแนวหน้าที่ปะทะยาว'},
  {name:'Mantle of Ra',roles:['แทงค์'],for:['tanky'],cat:'เจาะ',why:'เผาดาเมจรอบตัวและเพิ่มเกราะ เหมาะกับแนวหน้า'},
  {name:"Ifrit's Claw",roles:['แครี่','ไฟต์เตอร์'],for:['phys'],cat:'บูสต์',why:'สร้างดาเมจต่อเนื่องเมื่อโจมตีปกติ เหมาะกับตัวแลกเปลี่ยน'},
  {name:'Mr. Stabby',roles:['ไฟต์เตอร์'],for:['phys','sustain'],cat:'บูสต์',why:'เสริมดาเมจปกติและการฟื้นฟู เหมาะกับไฟต์เตอร์'},
  {name:"Loki's Curse",roles:['แอสซาซิน'],for:['burst'],cat:'บูสต์',why:'เสริมดาเมจสกิลชุดแรก เหมาะกับตัวเปิดไฟต์'},
  {name:'Firestorm Bow',roles:['แครี่'],for:['tanky'],cat:'เจาะ',why:'เผาดาเมจตามเลือดสูงสุด เหมาะกับแครี่ที่ต้องสู้กับแนวหน้า'},
  {name:'Claves Sancti',roles:['แครี่'],for:['phys'],cat:'บูสต์',why:'เพิ่มดาเมจคริติคอล เหมาะกับตัวยิงดาเมจกายภาพหลัก'},
  {name:'Broken Spear',roles:['แอสซาซิน','แครี่'],for:['dash'],cat:'ตอบโต้',why:'ตัดการฟื้นฟูของเป้าหมายที่ต้องวิ่งหนี ใช้เมื่อตามตัวไม่ทัน'},
  {name:'Zweihander',roles:['เมจ'],for:['magic'],cat:'บูสต์',why:'เพิ่มดาเมจเวทเมื่อเลือดเหลือน้อย เหมาะกับเมจที่ต้องแลก'},
  {name:'Flashy Boots',roles:['แทงค์','ไฟต์เตอร์','ซัพพอร์ต'],for:['dash','cc'],cat:'เคลื่อนที่',why:'ลดคูลดาวน์สกิล ใช้เมื่อต้องใช้สกิลควบคุมบ่อย'}
]

const CTX=t=>({
  cc:t.cc>=1,magic:t.magic>=2,phys:t.phys>=2,tanky:t.tanky,dash:t.dash,heal:t.heal,
  burst:t.burst,sustain:t.sustain||t.heal,dive:t.dive,poke:t.poke,vision:t.vision,
  mitigate:t.mitigate,roam:t.dash&&t.cc>=1,kite:t.poke&&t.dash
})

// Threat profile of the enemy lineup, from the same verified tags.
export function threatProfile(enemyHeroes){
  const p={cc:0,magic:0,phys:0,heal:0,tanky:0,dash:0,burst:0,poke:0,burst2:0}
  for(const h of enemyHeroes){
    const t=tags[h.id]||{}
    if(t.cc)p.cc++
    if(t.magic>=2)p.magic++
    if(t.phys>=2)p.phys++
    if(t.heal)p.heal++
    if(t.tanky)p.tanky++
    if(t.dash)p.dash++
    if(t.burst)p.burst++
    if(t.poke)p.poke++
  }
  return p
}

// Score = own-tag fit (2) + threat answer (3) + role fit (1).
export function recommendItems(hero,enemyHeroes=[],limit=6){
  const t=tags[hero?.id]||{}
  const own=CTX(t)
  const threat=threatProfile(enemyHeroes)
  const press={
    cc:threat.cc>=2,magic:threat.magic>=2,phys:threat.phys>=2,heal:threat.heal>0,
    tanky:threat.tanky>=2,dash:threat.dash>=2,burst:threat.burst>=2,poke:threat.poke>=2
  }
  const rows=[]
  for(const rule of RULES){
    if(!HAS(rule.name))continue
    const ownHit=rule.for.filter(k=>own[k]).length
    const threatHit=rule.for.filter(k=>press[k]).length
    const roleHit=rule.roles.includes(hero?.role)?1:0
    if(!ownHit&&!threatHit)continue
    rows.push({
      ...byName.get(rule.name),
      cat:rule.cat,why:rule.why,
      score:ownHit*2+threatHit*3+roleHit,
      ownHit,threatHit,roleHit
    })
  }
  return rows.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).slice(0,limit)
}

// Items a hero's own verified build already contains.
export const baseItems=build=>(build?.items||[]).filter(i=>byName.has(i.name))
export {items,byName}
