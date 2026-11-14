import {readFileSync} from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {fresh,defaultProfiles,selectHero,occupied,analyze,startObjective,objectiveCountdown,parseMeta,withMeta} from '../src/domain.mjs'
const heroes=JSON.parse(readFileSync(new URL('../src/heroes.json',import.meta.url),'utf8'))
const base=()=>fresh()
test('verified directory snapshot contains 130 unique entries with five lanes',()=>{
 assert.equal(heroes.length,130)
 assert.equal(new Set(heroes.map(h=>h.id)).size,130)
 assert.equal(new Set(heroes.map(h=>h.lane)).size,5)
 assert.equal(heroes.filter(h=>h.ban!=null).length,130)
 assert.equal(defaultProfiles().length,5)
})
test('draft accepts picks on both sides, rejects duplicate and banned heroes',()=>{
 let s=selectHero(base(),{side:'blue',lane:'jungle'},'aoi')
 s=selectHero(s,{side:'red',lane:'mid'},'yue')
 s=selectHero(s,{side:'blue',ban:true},'aleister')
 assert.equal(s.red.mid,'yue')
 assert.equal(occupied(s,'aoi',{side:'blue',lane:'jungle'}),false)
 assert.throws(()=>selectHero(s,{side:'red',lane:'jungle'},'aoi'),/ถูกเลือก/)
 assert.throws(()=>selectHero(s,{side:'red',lane:'jungle'},'aleister'),/ถูกเลือก/)
})
test('Flowborn variants cannot be drafted twice and cannot bypass a ban',()=>{
 const s=selectHero(base(),{side:'blue',ban:true},'flowborn-mid')
 assert.equal(occupied(s,'flowborn-dragon'),true)
})
test('ban array obeys six per side',()=>{
 let s=base()
 for(const h of heroes.slice(0,6))s=selectHero(s,{side:'blue',ban:true},h.id)
 assert.throws(()=>selectHero(s,{side:'blue',ban:true},heroes[7].id),/เต็มแล้ว/)
})
test('suggestions keep ally partners and separate enemy locks from bans',()=>{
 const s={...base(),blue:{dragon:'hayate',roam:'annette'},red:{mid:'aleister'}}
 const rows=analyze(s,'hayate',heroes).rules
 assert(rows.some(r=>r.kind==='pair'&&r.id==='annette'))
 assert(rows.some(r=>r.kind==='risk'&&r.id==='aleister'))
 assert(rows.some(r=>r.kind==='ban'&&r.id==='arum'))
 assert(!rows.some(r=>r.kind==='ban'&&r.id==='aleister'))
})
test('enemy lineup produces instant tactical alerts',()=>{
 const s={...base(),blue:{jungle:'nakroth'},red:{mid:'aleister',jungle:'aoi',slayer:'yan'}}
 assert.equal(analyze(s,'nakroth',heroes).alerts.length,2)
})
test('timer validates settings, phase and duplicate kill event',()=>{
 const s={...base(),startedAt:1000,durations:{dragon:120}}
 assert.throws(()=>startObjective(base(),'dragon',1000),/เริ่ม/)
 assert.throws(()=>startObjective(s,'red-home',1000),/ตั้งเวลา/)
 assert.throws(()=>startObjective(s,'legend',1000),/15/)
 const run=startObjective(s,'dragon',6000)
 assert.equal(objectiveCountdown(run.objectives.dragon,6000),120)
 assert.equal(objectiveCountdown(run.objectives.dragon,36000),90)
 assert.equal(objectiveCountdown(run.objectives.dragon,128000),0)
 assert.throws(()=>startObjective(run,'dragon',6100),/กำลังนับ/)
 assert.throws(()=>startObjective(run,'dragon',910000),/ตำนาน/)
 assert.equal(startObjective(s,'legend',910000).objectives.legend.seconds,180)
})
test('meta import requires valid dates, source and real known rows and removes mixed old stats',()=>{
 const sample={date:'2026-11-10',url:'https://example.com/meta',stats:[{id:'yue',win:49,pick:14,ban:61}]}
 const load=(input)=>parseMeta(JSON.stringify(input),heroes,'2026-11-13')
 assert.throws(()=>load({...sample,date:'2026-02-31'}))
 assert.throws(()=>load({...sample,date:'2026-11-14'}))
 assert.throws(()=>load({...sample,url:'javascript:void(0)'}))
 assert.throws(()=>load({...sample,stats:[...sample.stats,...sample.stats]}))
 assert.equal(withMeta(heroes,load(sample)).find(h=>h.id==='yue').ban,61)
 assert.equal(withMeta(heroes,load(sample)).find(h=>h.id==='zata').ban,undefined)
})

test('pre-lock advice uses the intended team and keeps a committed enemy lock out of bans',()=>{
 const original={...base(),blue:{mid:'aleister'}}
 const prospective=selectHero(original,{side:'red',lane:'dragon'},'hayate')
 assert.equal(original.red.dragon,undefined)
 const advice=analyze(prospective,'hayate',heroes,'red').rules
 assert(advice.some(a=>a.kind==='risk'&&a.id==='aleister'))
 assert(!advice.some(a=>a.kind==='ban'&&a.id==='aleister'))
 assert(advice.some(a=>a.kind==='ban'&&a.id==='arum'))
})

test('objective cue enters its 15-second warning window then becomes ready',async()=>{
 const {objectiveStatus}=await import('../src/domain.mjs')
 assert.equal(objectiveStatus(null),'idle')
 assert.equal(objectiveStatus(16),'counting')
 assert.equal(objectiveStatus(15),'soon')
 assert.equal(objectiveStatus(1),'soon')
 assert.equal(objectiveStatus(0),'ready')
})

test('hero dossier data covers the roster with traceable sources and known Hayate recommendations',()=>{
 const all=JSON.parse(readFileSync(new URL('../src/hero-details.json',import.meta.url),'utf8'))
 assert.equal(Object.keys(all).length,heroes.length)
 assert(heroes.every(h=>all[h.id]?.skills?.length&&all[h.id]?.guide.startsWith('https://rovguide.com/th/heroes/')))
 assert.equal(all.hayate.runes.map(r=>r.name).join('|'),"Awake|Spirit|Dragon's Claw")
 assert.equal(all.hayate.spells[0].name,'Flicker')
 assert.equal(all.hayate.builds[0].items.length,6)
 assert(all.hayate.garena==='https://www.rov.in.th/hero/hayate')
})
