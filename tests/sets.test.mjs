// Guards the properties the UI relies on: sets are always usable, never
// duplicated, and every item name actually exists in the verified catalogue.
import test from 'node:test'
import assert from 'node:assert/strict'
import {buildSets,setToText} from '../src/sets.mjs'
import {byName,recommendItems,threatProfile} from '../src/items.mjs'
import det from '../src/hero-details.json' with {type:'json'}
import heroesRaw from '../src/heroes.json' with {type:'json'}
import tags from '../src/hero-tags.json' with {type:'json'}

const heroes=Array.isArray(heroesRaw)?heroesRaw:Object.values(heroesRaw)
const enemies=['aoi','hayate','thane']

test('every hero gets at least three selectable sets',()=>{
  const thin=heroes.filter(h=>buildSets(h,enemies,det[h.id]?.builds?.[0],tags[h.id]||{}).length<3)
  assert.deepEqual(thin.map(h=>h.id),[])
})

test('no hero produces two identical sets',()=>{
  for(const h of heroes){
    const names=buildSets(h,enemies,det[h.id]?.builds?.[0],tags[h.id]||{})
      .map(s=>s.items.map(i=>i.name).join('|'))
    assert.equal(new Set(names).size,names.length,h.id)
  }
})

test('every recommended item exists in the verified catalogue',()=>{
  for(const h of heroes){
    for(const s of buildSets(h,enemies,det[h.id]?.builds?.[0],tags[h.id]||{})){
      for(const it of s.items)assert.ok(byName.has(it.name),h.id+' → '+it.name)
    }
  }
})

test('sets never repeat an item inside one set',()=>{
  for(const h of heroes){
    for(const s of buildSets(h,enemies,det[h.id]?.builds?.[0],tags[h.id]||{})){
      const names=s.items.map(i=>i.name)
      assert.equal(new Set(names).size,names.length,h.id+' / '+s.id)
    }
  }
})

test('the base set stays the untouched verified build',()=>{
  // Pick a hero whose verified build has no repeated item, so no dedupe applies.
  const h=heroes.find(x=>{
    const items=(det[x.id]?.builds?.[0]?.items||[]).map(i=>i.name)
    return items.length>=4&&new Set(items).size===items.length&&items.every(n=>byName.has(n))
  })
  const base=buildSets(h,enemies,det[h.id].builds[0],tags[h.id]||{}).find(s=>s.id==='base')
  assert.deepEqual(base.items.map(i=>i.name),det[h.id].builds[0].items.map(i=>i.name))
})

test('enemy lineup changes the sets, an empty one still returns sets',()=>{
  // Use a hero with a verified build so the base set exists on both sides.
  const h=heroes.find(x=>det[x.id]?.builds?.length)
  const solo=buildSets(h,[],det[h.id].builds[0],tags[h.id]||{})
  const vsTeam=buildSets(h,enemies,det[h.id].builds[0],tags[h.id]||{})
  assert.ok(solo.length>=3)
  assert.ok(vsTeam.length>=3)
  // A lineup must actually move the recommendation, not just reorder tabs.
  const changed=vsTeam.some(s=>{
    const twin=solo.find(x=>x.id===s.id)
    return !twin||twin.items.map(i=>i.name).join('|')!==s.items.map(i=>i.name).join('|')
  })
  assert.ok(changed,'enemy lineup did not change any set')
})

test('null hero returns no sets instead of throwing',()=>{
  assert.deepEqual(buildSets(null,enemies,null,{}),[])
})

test('copy text names the hero, the set body and every item',()=>{
  const h=heroes.find(x=>det[x.id]?.builds?.length)
  const set=buildSets(h,enemies,det[h.id].builds[0],tags[h.id]||{})[0]
  const text=setToText(h,set,'โรม')
  assert.match(text,new RegExp(h.name))
  assert.match(text,new RegExp(set.name))
  for(const it of set.items)assert.match(text,new RegExp(it.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
})

test('threat profile only counts verified tags',()=>{
  const p=threatProfile(enemies.map(id=>heroes.find(h=>h.id===id)).filter(Boolean))
  for(const v of Object.values(p))assert.ok(Number.isInteger(v)&&v>=0&&v<=enemies.length)
})

test('recommendations are ordered by score and capped',()=>{
  const h=heroes.find(x=>det[x.id]?.builds?.length)
  const rows=recommendItems(h,enemies.map(id=>heroes.find(x=>x.id===id)).filter(Boolean),5)
  assert.ok(rows.length<=5)
  for(let i=1;i<rows.length;i++)assert.ok(rows[i-1].score>=rows[i].score)
  for(const r of rows)assert.ok(byName.has(r.name))
})
