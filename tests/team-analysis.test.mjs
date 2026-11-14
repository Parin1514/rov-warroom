import test from 'node:test'
import assert from 'node:assert/strict'
import heroes from '../src/heroes.json' with {type:'json'}
import tags from '../src/hero-tags.json' with {type:'json'}
import details from '../src/hero-details.json' with {type:'json'}
import {describeSkill, cleanSlot, analyzeTeamDraft} from '../src/team-analysis.mjs'

const byId = new Map(heroes.map(h => [h.id, h]))

test('cleanSlot strips leading numbers', () => {
  assert.equal(cleanSlot('3อัลติเมท'), 'อัลติเมท')
  assert.equal(cleanSlot('สกิล 1'), 'สกิล 1')
  assert.equal(cleanSlot('พาสซีฟ'), 'พาสซีฟ')
})

test('describeSkill generates factual descriptions from verified tags', () => {
  const floS1 = details.florentino.skills.find(s => s.name === 'Blossom')
  const desc = describeSkill(floS1)
  assert.match(desc, /กายภาพ/)
  assert.match(desc, /สตั้น/)

  const malochS1 = details.maloch.skills.find(s => s.name === 'Cleave')
  const mDesc = describeSkill(malochS1)
  assert.match(mDesc, /จริง/)
  assert.match(mDesc, /ฟื้นฟู/)
})

test('describeSkill covers all 130 heroes skills without crashing or throwing', () => {
  for (const [hId, d] of Object.entries(details)) {
    for (const s of d.skills || []) {
      const txt = describeSkill(s)
      assert.ok(txt.length > 0, `Skill ${s.name} of ${hId} should have description`)
    }
  }
})

test('analyzeTeamDraft handles empty team', () => {
  const result = analyzeTeamDraft([], [], { byId, details, tags })
  assert.equal(result.count, 0)
  assert.equal(result.focus, null)
  assert.equal(result.strengths.length, 0)
  assert.equal(result.weaknesses.length, 0)
})

test('analyzeTeamDraft analyzes full demo team correctly', () => {
  const team = ['florentino', 'nakroth', 'yue', 'hayate', 'annette']
  const result = analyzeTeamDraft(team, [], { byId, details, tags })
  
  assert.equal(result.count, 5)
  assert.ok(result.focus)
  assert.ok(result.strengths.length >= 2, 'Should have multiple strengths')
  
  // Checks damage balance strength
  const hasDmgBalance = result.strengths.some(s => s.title.includes('สมดุลดาเมจ'))
  assert.ok(hasDmgBalance, 'Should detect physical + magic balance')

  // Checks CC strength
  const hasCC = result.strengths.some(s => s.title.includes('สกิลควบคุม'))
  assert.ok(hasCC, 'Should detect crowd control skills')

  // Weakness: lacks pure tank
  const hasFragileOrTank = result.weaknesses.some(w => w.title.includes('แนวหลัง') || w.title.includes('ขาด'))
  assert.ok(hasFragileOrTank)
})

test('analyzeTeamDraft detects all-magic weakness', () => {
  const team = ['yue', 'krixi', 'natalya']
  const result = analyzeTeamDraft(team, [], { byId, details, tags })
  const magicWeakness = result.weaknesses.find(w => w.title.includes('เวทซ้อนทับ') || w.title.includes('ขาดแนวหน้า'))
  assert.ok(magicWeakness, 'Should detect heavy magic vulnerability')
})

test('analyzeTeamDraft detects no-frontline weakness', () => {
  const team = ['yue', 'telannas', 'alice']
  const result = analyzeTeamDraft(team, [], { byId, details, tags })
  const frontlineWeakness = result.weaknesses.find(w => w.title.includes('ขาดแนวหน้า'))
  assert.ok(frontlineWeakness, 'Should flag missing frontline')
})
