import test from 'node:test'
import assert from 'node:assert/strict'
import {HANDCRAFTED_GUIDES, getHeroGuide} from '../src/guide-data.mjs'
import rawHeroes from '../src/heroes.json' with {type:'json'}
import rawDetails from '../src/hero-details.json' with {type:'json'}

test('handcrafted guides cover Amily and Dextra with practical skill advice', () => {
  assert.ok(HANDCRAFTED_GUIDES.amily, 'Amily guide exists')
  assert.ok(HANDCRAFTED_GUIDES.dextra, 'Dextra guide exists')

  // Check Amily skill 2 practical note
  const amilyS2 = HANDCRAFTED_GUIDES.amily.skills.find(s => s.slot === 'สกิล 2')
  assert.ok(amilyS2, 'Amily skill 2 defined')
  assert.match(amilyS2.practical, /เตะไปข้างหน้า 2 ครั้ง/i)
  assert.match(amilyS2.practical, /การโจมตีปกติครั้งถัดไปจะพุ่งเข้าหาเป้าหมาย/i)

  // Check Amily combos and gear separation
  assert.ok(HANDCRAFTED_GUIDES.amily.combos.length >= 2, 'Amily has at least 2 combos')
  assert.ok(HANDCRAFTED_GUIDES.amily.playItems.core.length > 0, 'Amily has core items')
  assert.ok(HANDCRAFTED_GUIDES.amily.counterItems.items.length > 0, 'Amily has counter items')
  assert.match(HANDCRAFTED_GUIDES.amily.counterItems.tactics, /ตัดฮีล/i)

  // Check Dextra practical notes
  const dextraUlt = HANDCRAFTED_GUIDES.dextra.skills.find(s => s.slot === 'อัลติเมต')
  assert.ok(dextraUlt, 'Dextra ult defined')
  assert.match(dextraUlt.practical, /แปลงเป็นการฟื้นฟูเลือด/i)

  assert.ok(HANDCRAFTED_GUIDES.dextra.combos.length >= 2, 'Dextra has at least 2 combos')
  assert.ok(HANDCRAFTED_GUIDES.dextra.playItems.core.length > 0, 'Dextra has core items')
  assert.ok(HANDCRAFTED_GUIDES.dextra.counterItems.items.length > 0, 'Dextra has counter items')
  assert.match(HANDCRAFTED_GUIDES.dextra.counterItems.tactics, /ตัดเลือด/i)
})

test('getHeroGuide works for all 130 heroes without throwing or missing essential fields', () => {
  assert.equal(rawHeroes.length, 130)

  for (const hero of rawHeroes) {
    const guide = getHeroGuide(hero, rawDetails, rawHeroes)
    assert.ok(guide, `Guide generated for ${hero.id}`)
    assert.equal(guide.isHandcrafted, true, `Handcrafted guide exists for ${hero.id}`)
    assert.ok(guide.identity, `Identity exists for ${hero.id}`)
    assert.ok(guide.skills, `Skills exist for ${hero.id}`)
    assert.ok(guide.combos, `Combos exist for ${hero.id}`)
    assert.ok(guide.phases.early, `Early phase exists for ${hero.id}`)
    assert.ok(guide.phases.mid, `Mid phase exists for ${hero.id}`)
    assert.ok(guide.phases.late, `Late phase exists for ${hero.id}`)
    assert.ok(guide.playItems.core.length > 0, `Core play items exist for ${hero.id}`)
    assert.ok(guide.counterItems.items.length > 0, `Counter items exist for ${hero.id}`)
  }
})
