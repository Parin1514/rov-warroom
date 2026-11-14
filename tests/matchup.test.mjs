import {readFileSync} from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {rank,counterScore,verdict,BANDS,answersTo,edgesFor,EDGES} from '../src/matchup.mjs'
import {recommendItems,threatProfile,byName} from '../src/items.mjs'

const heroes=JSON.parse(readFileSync(new URL('../src/heroes.json',import.meta.url),'utf8'))
const tags=JSON.parse(readFileSync(new URL('../src/hero-tags.json',import.meta.url),'utf8'))
const h2=id=>({...heroes.find(h=>h.id===id),...tags[id]})

test('every hero has derived tags and the tag file stays in sync with the roster',()=>{
 assert.equal(Object.keys(tags).length,heroes.length)
 assert(heroes.every(h=>tags[h.id]?.id===h.id))
 assert.equal(Object.keys(tags).filter(id=>tags[id].cc<0||tags[id].cc>2).length,0)
})

test('counter score is antisymmetric and zero against itself',()=>{
 for(const [a,b] of [['hayate','aoi'],['aleister','yue'],['thane','nakroth'],['annette','florentino']]){
   const ab=counterScore(h2(a),h2(b)),ba=counterScore(h2(b),h2(a))
   assert.equal(ab.score,-ba.score,`${a} vs ${b}`)
 }
 assert.equal(counterScore(h2('hayate'),h2('hayate')).score,0)
})

test('known rule pairs resolve in the verified-tag direction',()=>{
 // Aoi has control + dash + invis; Hayate is a ranged squishy with no control.
 assert(counterScore(h2('aoi'),h2('hayate')).score>0)
 assert(counterScore(h2('hayate'),h2('aoi')).score<0)
 // Aleister's control catches Hayate's dash.
 assert(counterScore(h2('aleister'),h2('hayate')).score>0)
 // Annette has no control but a knockback and mitigation; not a Hayate counter by lock.
 assert(counterScore(h2('hayate'),h2('annette')).score>=0)
 assert(edgesFor(h2('aleister'),h2('hayate')).some(e=>e.id==='lock'))
})

test('reasons come from the same edges that produce the score',()=>{
 const {score,why}=counterScore(h2('aleister'),h2('hayate'))
 assert(score>0&&why.length>0)
 assert(why.every(w=>typeof w==='string'&&w.length>8))
})

test('rank returns descending magnitudes capped by the limit',()=>{
 const r=rank('hayate',heroes,tags,5)
 assert.equal(r.beats.length,5)
 assert.equal(r.loses.length,5)
 assert(r.beats.every((x,i,a)=>i===0||a[i-1].score>=x.score))
 assert(r.loses.every((x,i,a)=>i===0||a[i-1].score<=x.score))
 assert(r.beats.every(x=>x.hero.id!=='hayate'))
})

test('verdict bands match the documented thresholds and stay symmetric',()=>{
 assert.equal(verdict(BANDS.win).id,'win')
 assert.equal(verdict(BANDS.good).id,'good')
 assert.equal(verdict(0).id,'even')
 assert.equal(verdict(BANDS.lose).id,'lose')
 assert.equal(verdict(-BANDS.win).id,'bad')
 assert.equal(verdict(-5).id,'even')
 assert(EDGES.every(e=>e.weight>0&&e.why.length>10))
})

test('answers only offer heroes outside the drafted pool and rank by total pressure',()=>{
 const pool=heroes.filter(h=>h.lane==='roam')
 const enemy=['hayate','yue','capheny']
 const rows=answersTo(enemy,pool,heroes,tags,5)
 assert(rows.length>0)
 assert(rows.every(r=>!enemy.includes(r.hero.id)))
 assert(rows.every(r=>r.hero.lane==='roam'))
 assert(rows.every((r,i,a)=>i===0||a[i-1].score>=r.score))
 assert(answersTo([],pool,heroes,tags,5).length===0)
})

test('item rules reference only catalogue items and answer a real threat',()=>{
 const enemy=['aoi','aleister','thane','yue','capheny'].map(h2)
 const threat=threatProfile(enemy)
 assert.equal(threat.cc,4)
 for(const id of ['hayate','annette','nakroth','yue','thane','florentino']){
   const rows=recommendItems(h2(id),enemy,6)
   assert(rows.length>0,id)
   assert(rows.length<=6)
   assert(rows.every(r=>byName.has(r.name)&&r.why.length>10&&r.cat))
   assert(rows.every((r,i,a)=>i===0||a[i-1].score>=r.score))
   assert.equal(new Set(rows.map(r=>r.name)).size,rows.length,'no duplicate items')
 }
})

test('item picks change with the enemy lineup',()=>{
 const tanky=['thane','florentino','baldum','grakk','omen'].map(h2)
 const squishy=['yue','natalya','kahlii','preyta','celica'].map(h2)
 const vsTank=recommendItems(h2('hayate'),tanky,6).map(r=>r.name)
 const vsSquishy=recommendItems(h2('hayate'),squishy,6).map(r=>r.name)
 assert.notDeepEqual(vsTank,vsSquishy)
})

import {poolReport} from '../src/matchup.mjs'

test('poolReport surfaces strong counters and uncovered threats in the lane',()=>{
  const entries=[{id:'florentino',lane:'slayer'},{id:'omen',lane:'slayer'}]
  const r=poolReport(entries,heroes,tags,5)
  assert.equal(r.length,1)
  assert.equal(r[0].lane,'slayer')
  assert.equal(r[0].mine.length,2)
  assert.ok(r[0].faced>20)
  assert.ok(r[0].covered>=1,'expected at least 1 strong counter')
  for(const s of r[0].strong){
    assert.ok(s.best.score>=24)
    assert.ok(entries.some(e=>e.id===s.best.hero.id))
  }
  for(const w of r[0].weak){
    assert.ok(w.beatsUs.length>=1)
  }
})

test('poolReport handles multi-lane entries separately',()=>{
  const entries=[{id:'florentino',lane:'slayer'},{id:'yue',lane:'mid'}]
  const r=poolReport(entries,heroes,tags,5)
  assert.equal(r.length,2)
  assert.deepEqual(r.map(x=>x.lane).sort(),['mid','slayer'])
})
