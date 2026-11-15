import test from 'node:test'
import assert from 'node:assert/strict'
import {recommendItems} from '../src/items.mjs'
import heroes from '../src/heroes.json' with {type:'json'}
const hero=id=>heroes.find(h=>h.id===id)

test('anti-heal recommendations match damage type, not lifesteal',()=>{
 const enemies=[hero('taara'),hero('mganga')]
 const mage=recommendItems(hero('mganga'),enemies,50)
 const carry=recommendItems(hero('violet'),enemies,50)
 assert(mage.some(i=>i.name==='Soul Scroll'))
 assert(!mage.some(i=>i.name==='Curse of Death'))
 assert(carry.some(i=>i.name==='Curse of Death'))
 assert(!carry.some(i=>i.name==='Soul Scroll'))
 assert(!carry.some(i=>i.name==='Bow of Slaughter'&&/ลดการฟื้นฟู/.test(i.why)))
})

test('situational items never recommend removed, unverified or wrong-role items',()=>{
 const enemies=['taara','aoi','hayate','mganga','aleister'].map(hero)
 for(const h of heroes)for(const i of recommendItems(h,enemies,50)){
  assert(!["Hyoga's Edge",'Ring of Terror','Poseidon Emblem','Soul Strom Badge'].includes(i.name),h.id+' '+i.name)
  assert(!['Leviathan','Soulreaver',"Loki's Curse",'Firestorm Bow','Mr. Stabby'].includes(i.name),'jungle items need an explicit jungle build')
 }
 assert.deepEqual(recommendItems(null,enemies),[])
})
