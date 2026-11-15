import test from 'node:test'
import assert from 'node:assert/strict'
import {TEAM_GROUPS,TEAM_GROUP_KEY,loadGroupRosters,defaultProfiles} from '../src/domain.mjs'

const fakeStorage=(initial={})=>{
  const map=new Map(Object.entries(initial))
  return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),map}
}

test('legacy rw-players-1 migrates into mixed roster, female stays default',()=>{
  const legacy=defaultProfiles().map((p,i)=>({...p,name:'คนที่ '+(i+1)}))
  const s=fakeStorage({'rw-players-1':JSON.stringify(legacy)})
  const {group,rosters}=loadGroupRosters(s)
  assert.equal(group,null)
  assert.deepEqual(rosters.mixed,legacy)
  assert.equal(JSON.parse(s.getItem('rw-players-mixed')).length,5)
  assert.deepEqual(rosters.female,defaultProfiles())
  assert(rosters.female.every(p=>p.name===''))
})

test('persisted group choice is returned on next load',()=>{
  const s=fakeStorage({[TEAM_GROUP_KEY]:JSON.stringify('female')})
  assert.equal(loadGroupRosters(s).group,'female')
})

test('unknown or corrupt group value falls back to no group',()=>{
  assert.equal(loadGroupRosters(fakeStorage({[TEAM_GROUP_KEY]:'"nope"'})).group,null)
  assert.equal(loadGroupRosters(fakeStorage({[TEAM_GROUP_KEY]:'{bad json'})).group,null)
  assert.equal(loadGroupRosters(fakeStorage()).group,null)
})

test('groups have independent rosters stored under separate keys',()=>{
  const s=fakeStorage()
  const mixed=defaultProfiles().map(p=>({...p,name:'M'+p.slot}))
  const female=defaultProfiles().map(p=>({...p,name:'F'+p.slot}))
  s.setItem('rw-players-mixed',JSON.stringify(mixed))
  s.setItem('rw-players-female',JSON.stringify(female))
  const {rosters}=loadGroupRosters(s)
  assert.equal(rosters.mixed[0].name,'M1')
  assert.equal(rosters.female[0].name,'F1')
  assert.notDeepEqual(rosters.mixed,rosters.female)
  assert.equal(TEAM_GROUPS.length,2)
})
