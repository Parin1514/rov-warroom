// Guards what the playbook UI and the DB seed both rely on: every pair yields a
// usable plan, the score matches the counter engine, skill names in the text are
// real, and the schema's phase keys/limits hold for every generated row.
import test from 'node:test'
import assert from 'node:assert/strict'
import {playbook,keySkills} from '../src/playbook.mjs'
import {counterScore,verdict,BANDS} from '../src/matchup.mjs'
import det from '../src/hero-details.json' with {type:'json'}
import heroesRaw from '../src/heroes.json' with {type:'json'}
import tags from '../src/hero-tags.json' with {type:'json'}

const heroes=Array.isArray(heroesRaw)?heroesRaw:Object.values(heroesRaw)
const byId=new Map(heroes.map(h=>[h.id,h]))
const opts={details:det,tags}
const all=()=>heroes.flatMap(a=>heroes.filter(b=>b.id!==a.id).map(b=>[a,b]))

test('no plan for self or missing heroes',()=>{
  const h=heroes[0]
  assert.equal(playbook(h,h,opts),null)
  assert.equal(playbook(null,h,opts),null)
})

test('every pair has a plan, a late-game line, and at least two lines total',()=>{
  for(const [a,b] of all()){
    const p=playbook(a,b,opts)
    assert.ok(p.plan,a.id+' vs '+b.id)
    assert.ok(p.phases.late.length>=1,a.id+' vs '+b.id)
    const n=Object.values(p.phases).reduce((s,l)=>s+l.length,0)
    assert.ok(n>=2,a.id+' vs '+b.id+' has '+n)
  }
})

test('score and band match the counter engine',()=>{
  for(const [a,b] of all().slice(0,2000)){
    const p=playbook(a,b,opts)
    const s=counterScore({...a,...tags[a.id]},{...b,...tags[b.id]}).score
    assert.equal(p.score,s)
    assert.equal(p.band,verdict(s).id)
  }
})

test('playbook is the mirror of the reverse matchup',()=>{
  const a=byId.get('violet'),b=byId.get('aoi')
  assert.equal(playbook(a,b,opts).score,-playbook(b,a,opts).score)
})

test('skill names quoted in the text exist in the enemy data',()=>{
  const a=byId.get('violet'),b=byId.get('aoi')
  const text=Object.values(playbook(a,b,opts).phases).flat().join('\n')
  const names=det.aoi.skills.map(s=>s.name)
  const quoted=names.filter(n=>text.includes(n))
  assert.ok(quoted.length>=1,'expected at least one real aoi skill name')
  assert.ok(!/\d+อัลติเมท/.test(text),'slot digit prefix leaked into text')
})

test('keySkills dedupes and finds the ultimate',()=>{
  const k=keySkills(det.aoi)
  assert.ok(k.ult&&/อัลติเมท/.test(k.ult.slot))
  assert.equal(new Set(k.all.map(s=>s.slot+s.name)).size,k.all.length)
  assert.deepEqual(keySkills(undefined).all,[])
})

test('missing enemy details is reported, not hidden',()=>{
  const a=byId.get('violet'),b=byId.get('aoi')
  const p=playbook(a,b,{details:{},tags})
  assert.ok(p.missing.some(m=>m.includes('ยังไม่มีข้อมูลสกิล')))
})

test('every seeded row fits the war_counter_guides constraints',()=>{
  const keys=new Set(['early','mid','late','fight','avoid'])
  let rows=0
  for(const [a,b] of all()){
    const p=playbook(a,b,opts)
    if(Math.abs(p.score)<BANDS.good)continue
    rows++
    assert.ok(p.score>=-99&&p.score<=99)
    assert.ok(p.edges.length<=8&&p.items.length<=6)
    assert.ok(Object.keys(p.phases).every(k=>keys.has(k)))
    const json=JSON.stringify({plan:p.plan,...p.phases})
    assert.ok(Buffer.byteLength(json)<=6000,a.id+' vs '+b.id+' '+Buffer.byteLength(json)+' bytes')
  }
  assert.ok(rows>0)
})
