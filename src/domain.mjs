export const LANES=[
  {id:'slayer',label:'ออฟเลน',en:'SLAYER'},
  {id:'jungle',label:'ป่า',en:'JUNGLE'},
  {id:'mid',label:'กลาง',en:'MID'},
  {id:'dragon',label:'แครี่',en:'DRAGON'},
  {id:'roam',label:'โรม',en:'ROAM'}
]
export const SIDES={blue:'ทีมเรา',red:'คู่แข่ง'}
export const SOURCE={date:'2026-10-19',url:'https://rovguide.com/th/meta',name:'RoVGuide · แรงก์ไทย'}
export const PATCH={date:'2026-11-04',url:'https://www.rov.in.th/patch-notes/hotfix261104',name:'Hotfix 4 พ.ย. 2569'}
export const UPCOMING={date:'2026-11-17',url:'https://www.rov.in.th/patch-notes/hotfix261117',name:'Hotfix 17 พ.ย. 2569'}
export const OBJECTIVES=[
  {id:'dragon',name:'Abyssal Dragon',short:'มังกร',x:72,y:72,seconds:null,type:'major'},
  {id:'slayer',name:'Dark Slayer',short:'สเลเยอร์',x:28,y:27,seconds:null,type:'major'},
  {id:'legend',name:'มอนสเตอร์ตำนาน (15+)',short:'ตำนาน',x:64,y:81,seconds:180,type:'major'},
  {id:'blue-home',name:'บัฟฟ้า · ฝั่งเรา',short:'ฟ้า',x:20,y:62,seconds:null,type:'blue'},
  {id:'red-home',name:'บัฟแดง · ฝั่งเรา',short:'แดง',x:42,y:82,seconds:null,type:'red'},
  {id:'blue-away',name:'บัฟฟ้า · ฝั่งคู่แข่ง',short:'ฟ้า',x:80,y:38,seconds:null,type:'blue'},
  {id:'red-away',name:'บัฟแดง · ฝั่งคู่แข่ง',short:'แดง',x:58,y:18,seconds:null,type:'red'}
]
export const defaultProfiles=()=>LANES.map((l,i)=>({slot:i+1,name:'',lane:l.id,pool:[],member_id:null}))
export const fresh=()=>({blue:{},red:{},bans:{blue:[],red:[]},opponents:{},notes:'',startedAt:null,objectives:{},durations:{},meta:null})
export const heroGroup=id=>id?.startsWith('flowborn-')?'flowborn':id
export function occupied(state,id,except){
  const same=x=>heroGroup(x)===heroGroup(id)
  return ['blue','red'].some(side=>Object.entries(state[side]).some(([lane,pick])=>same(pick)&&!(except?.side===side&&except?.lane===lane)))||
    [...state.bans.blue,...state.bans.red].some(same)
}
export function selectHero(state,target,id){
  if(!SIDES[target.side]||(!target.ban&&!LANES.some(l=>l.id===target.lane)))throw new Error('เลือกช่องดราฟต์ก่อน')
  if(occupied(state,id,target.ban?null:target))throw new Error('ฮีโร่นี้ถูกเลือกหรือแบนแล้ว')
  if(target.ban){
    if(state.bans[target.side].length>=6)throw new Error('ช่องแบนของฝั่งนี้เต็มแล้ว')
    return {...state,bans:{...state.bans,[target.side]:[...state.bans[target.side],id]}}
  }
  return {...state,[target.side]:{...state[target.side],[target.lane]:id}}
}
export function nextTarget(state,target){
  if(target.ban)return target
  const lane=LANES.find(l=>!state[target.side][l.id])
  return lane?{...target,lane:lane.id}:target
}
const combos=[
 ['hayate','annette','Annette ช่วยกันตัวล้วงและเปิดพื้นที่ให้ Hayate เลือกจังหวะเข้าไฟต์'],
 ['capheny','thane','Thane ดันศัตรูออกจากแนวหลังให้ Capheny ยิงต่อเนื่อง'],
 ['violet','alice','Alice ช่วยคุมพื้นที่ให้ Violet เก็บระยะและยิงสวน'],
 ['yue','grakk','เมื่อ Grakk ดึงโดน Yue สามารถวางสกิลตามตำแหน่งที่เป้าหมายถูกดึงมา'],
 ['lorion','maloch','ใช้สกิลควบคุมพื้นที่ของ Lorion ต่อจังหวะเปิดไฟต์ของ Maloch'],
 ['zata','krizzix','Krizzix ช่วยรวมเป้าหมายเพื่อให้ Zata ต่อดาเมจ'],
 ['nakroth','rouie','วางแผนแยกดันและใช้จุดกลับฐานของ Rouie สำหรับถอนตัวหรือรวมทีม'],
 ['yorn','lumburr','Lumburr ช่วยเปิดหรือกันแนวหน้าให้ Yorn มีพื้นที่ยืนยิง'],
 ['elsu','baldum','จังหวะล็อกหรือแยกศัตรูช่วยให้ Elsu ตั้งตำแหน่งยิงได้'],
 ['aoi','bonnie','Bonnie ช่วยตรึงศัตรูเพื่อให้ Aoi เลือกมุมเข้าปิดงาน'],
 ['sinestrea','dolia','Dolia ช่วยเปิดทางให้ใช้สกิลสำคัญซ้ำเมื่อจังหวะรีเซ็ตตรงกับแผน']
]
const locks=['aleister','arum']
const divers=['hayate','nakroth','aoi','zata','yan','keera','murad','billow','paine','quillen','sinestrea','wukong','kaine','the-flash','tulen','zill','airi']
const diversSet=new Set(divers)
const poke=['yue','elsu','liliana','kahlii','preyta','violet','heino','gildur','krixi']
const fragile=['yorn','capheny','telannas','celica','laville','moren','yue','natalya','preyta','kahlii']
const peel=['thane','annette','lumburr','baldum','zip','tee-mee','alice','arum']
export function analyze(state,focus,heroes,perspective){
 const find=id=>heroes.find(h=>h.id===id)
 const h=find(focus)
 const excluded=new Set([...Object.values(state.blue),...Object.values(state.red),...state.bans.blue,...state.bans.red].map(heroGroup))
 const isRed=perspective?perspective==='red':Object.values(state.red).includes(focus)&&!Object.values(state.blue).includes(focus)
 const ourIds=Object.values(isRed?state.red:state.blue)
 const enemyIds=Object.values(isRed?state.blue:state.red)
 const enemy=new Set(enemyIds)
 const valid=id=>id!==focus&&!excluded.has(heroGroup(id))&&!!find(id)
 const out=[]
 const add=(kind,id,reason,force=false)=>{
   if(!find(id)||id===focus||(!force&&!valid(id))||out.some(x=>x.kind===kind&&x.id===id))return
   out.push({kind,id,reason})
 }
 if(h){
   for(const [a,b,reason] of combos){const partner=a===focus?b:b===focus?a:null;if(partner)add('pair',partner,reason,ourIds.includes(partner))}
   if(diversSet.has(focus)) for(const id of locks){
     const locked=enemy.has(id)
     add(locked?'risk':'ban',id,locked?'อีกฝั่งล็อกตัวจับไว้แล้ว เก็บระยะและรอให้ใช้สกิลล็อกก่อนพุ่งเข้า':'ตัวจับล็อกขัดจังหวะฮีโร่ที่ต้องพุ่งเข้า พิจารณาแบนถ้าแผนพึ่งตัวล้วง',locked)
   }
   if(fragile.includes(focus)) {
     for(const id of divers.slice(0,4))add(enemy.has(id)?'risk':'ban',id,'ตัวล้วงเข้าถึงแนวหลังได้ ควรจัดตัวคุ้มหรือวางแผนยืนตำแหน่ง',enemy.has(id))
     for(const id of peel)add('pair',id,'ใช้ตัวคุมจังหวะหรือกันตัวล้วงเพื่อสร้างพื้นที่ให้แนวหลัง',ourIds.includes(id))
   }
   if(h.lane==='roam'||h.lane==='mid')for(const id of ['chaugnar','zip'])add(enemy.has(id)?'risk':'ban',id,'พิจารณาเมื่อแผนหลักต้องอาศัยการคุมหรือแยกเป้าหมาย',enemy.has(id))
   if(!out.some(x=>x.kind==='pair')){
      const lane=({jungle:'roam',dragon:'roam',roam:'dragon',slayer:'mid',mid:'slayer'})[h.lane]
      const partners=heroes.filter(a=>a.lane===lane&&valid(a.id)).slice(0,2)
      for(const a of partners)add('pair',a.id,'เติมตำแหน่งที่ช่วยให้ทีมมีคนเปิดจังหวะและคนทำดาเมจต่อ เป็นคำแนะนำตามบทบาท')
   }
 }
 const enemyDive=enemyIds.filter(id=>diversSet.has(id))
 const enemyPoke=enemyIds.filter(id=>poke.includes(id))
 const alerts=[]
 if(enemyDive.length>=2)alerts.push('คู่แข่งมีตัวเข้าถึงแนวหลังหลายตัว วางตัวคุ้มแครี่และเก็บสกิลหยุดตัวล้วงไว้')
 if(enemyPoke.length>=2)alerts.push('คู่แข่งมีโปกระยะไกลหลายตัว เลี่ยงการยืนเสียเลือดหน้าบ่อก่อนเริ่มไฟต์')
 if(enemyIds.some(id=>locks.includes(id))&&ourIds.some(id=>diversSet.has(id)))alerts.push('คู่แข่งมีตัวจับล็อก อย่าให้ตัวล้วงเป็นคนแรกที่เปิดไฟต์')
 if(ourIds.filter(id=>find(id)?.role==='เมจ').length>=3)alerts.push('ทีมมีเมจหลายตำแหน่ง ตรวจสมดุลดาเมจกายภาพและเวทก่อนล็อกดราฟต์')
 const bans=heroes.filter(h=>valid(h.id)&&h.ban!=null).sort((a,b)=>b.ban-a.ban)
 for(const x of bans.slice(0,4))add('meta',x.id,`อัตราแบน ${x.ban.toFixed(2)}% ในชุดข้อมูลแรงก์ ไม่ใช่ตัวแก้ทางโดยตรง`)
 return {rules:out,alerts}
}
export const timeLabel=s=>[Math.floor(Math.max(0,s)/60),Math.max(0,s)%60].map(x=>String(x).padStart(2,'0')).join(':')
export function objectiveCountdown(event,now){
 return event?Math.max(0,Math.ceil((event.at+event.seconds*1000-now)/1000)):null
}
export const OBJECTIVE_NOTICE_SECONDS=15
export const objectiveStatus=left=>left===null?'idle':left===0?'ready':left<=OBJECTIVE_NOTICE_SECONDS?'soon':'counting'
export function startObjective(state,id,now=Date.now()){
 const spec=OBJECTIVES.find(x=>x.id===id)
 if(!spec||!state.startedAt)throw new Error('เริ่มนาฬิกาแมตช์ก่อน')
 if(id==='legend'&&now-state.startedAt<15*60*1000)throw new Error('มอนสเตอร์ตำนานเริ่มนับหลังนาที 15')
 if(['slayer','dragon'].includes(id)&&now-state.startedAt>=15*60*1000)throw new Error('หลังนาที 15 ใช้ตัวจับเวลามอนสเตอร์ตำนานแทน')
 const seconds=state.durations[id]??spec.seconds
 if(!Number.isInteger(seconds)||seconds<1||seconds>1800)throw new Error('ตั้งเวลาเกิดใหม่ของจุดนี้ก่อน')
 if(objectiveCountdown(state.objectives[id],now)>0)throw new Error('จุดนี้กำลังนับอยู่ หากกดผิดให้กดย้อนรายการก่อน')
 return {...state,objectives:{...state.objectives,[id]:{at:now,seconds}}}
}
export function parseMeta(text,heroes,today=new Date().toISOString().slice(0,10)){
 const x=JSON.parse(text)
 const numeric=v=>typeof v==='number'&&v>=0&&v<=100&&Number.isFinite(v)
 if(!x||typeof x.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x.date)||Number.isNaN(Date.parse(x.date))||new Date(x.date).toISOString().slice(0,10)!==x.date||x.date>today)throw new Error('วันที่ข้อมูลต้องอยู่ในรูป YYYY-MM-DD และไม่อยู่ในอนาคต')
 if(typeof x.url!=='string'||x.url.length>350||new URL(x.url).protocol!=='https:')throw new Error('แหล่งข้อมูลต้องเป็น URL แบบ HTTPS')
 if(!Array.isArray(x.stats)||!x.stats.length||x.stats.length>heroes.length)throw new Error('ต้องมีรายการ stats ตามจำนวนฮีโร่')
 const seen=new Set()
 const stats=x.stats.map(r=>{
    if(!r||!heroes.some(h=>h.id===r.id)||seen.has(r.id)||![r.win,r.pick,r.ban].every(numeric))throw new Error('พบรหัสฮีโร่ซ้ำ ไม่รู้จัก หรือเปอร์เซ็นต์อยู่นอกช่วง 0–100')
    seen.add(r.id)
    return {id:r.id,win:r.win,pick:r.pick,ban:r.ban}
 })
 return {date:x.date,url:x.url,name:String(x.name||'ข้อมูลที่โค้ชนำเข้า').trim().slice(0,90),stats}
}
export function withMeta(heroes,meta){
 if(!meta)return heroes
 const byId=new Map(meta.stats.map(r=>[r.id,r]))
 return heroes.map(({win,pick,ban,...hero})=>({...hero,...byId.get(hero.id)}))
}
