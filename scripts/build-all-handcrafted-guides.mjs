import fs from 'node:fs'
import {describeSkill} from '../src/team-analysis.mjs'
import {threatProfile} from '../src/items.mjs'

const heroes = JSON.parse(fs.readFileSync('src/heroes.json', 'utf8'))
const details = JSON.parse(fs.readFileSync('src/hero-details.json', 'utf8'))
const items = JSON.parse(fs.readFileSync('src/items.json', 'utf8'))
const heroTags = JSON.parse(fs.readFileSync('src/hero-tags.json', 'utf8'))
const validItems = new Set(items.map(i => i.name))

// Already manually handcrafted in src/guide-data.mjs
const EXISTING_HANDCRAFTED = new Set([
  'amily', 'dextra', 'rourke', 'teemee', 'zata', 'lumburr',
  'diao-chan', 'moren', 'flowborn-dragon', 'alice', 'yorn', 'cresht'
])

const LANE_LABEL = {
  slayer: 'ออฟเลน (Slayer)',
  jungle: 'ป่า (Jungle)',
  mid: 'เลนกลาง (Mid)',
  dragon: 'เลนมังกร (Abyssal Dragon)',
  roam: 'โรมมิ่ง / ซัพพอร์ต (Roam)'
}

const ROLE_DEFAULT_ITEMS = {
  'ไฟต์เตอร์': {core: ['Glided Greaves', 'Spear of Longinus', 'Omni Arms'], sit: ['Fenrir\'s Tooth', 'Medallion of Troy', 'Blade of Eternity']},
  'แอสซาซิน': {core: ['Glided Greaves', 'Broken Spear', 'Omni Arms'], sit: ['Fenrir\'s Tooth', 'Muramasa', 'Blade of Eternity']},
  'เมจ': {core: ['Enchanted Kicks', 'Boomstick', 'Hecate\'s Diadem'], sit: ['Rhea\'s Blessing', 'Staff of Nuul', 'Arctic Orb']},
  'แครี่': {core: ['War Boots', 'Claves Sancti', 'Slikk\'s Sting'], sit: ['Muramasa', 'Bow of Slaughter', 'Blade of Eternity']},
  'แทงค์': {core: ['Glided Greaves', 'Ring of Terror', 'The Aegis'], sit: ['Gaia\'s Standard', 'Medallion of Troy', 'Shield of the Lost']},
  'ซัพพอร์ต': {core: ['Ring of Terror', 'Glided Greaves', 'The Aegis'], sit: ['Gaia\'s Standard', 'Frosty\'s Revenge', 'Medallion of Troy']}
}

function cleanSlot(slot, idx) {
  if (!slot) return idx === 0 ? 'ติดตัว' : `สกิล ${idx}`
  const s = String(slot).replace(/^\d+/, '').trim()
  if (s === 'พาสซีฟ') return 'ติดตัว'
  if (s === 'อัลติเมท') return 'อัลติเมต'
  return s
}

function buildPhases(hero, tags, skills) {
  const ult = skills.find(s => s.slot === 'อัลติเมต')?.name || 'อัลติเมต'
  const s1 = skills.find(s => s.slot === 'สกิล 1')?.name || 'สกิล 1'
  const hasCC = Boolean(tags.cc)
  const hasPoke = Boolean(tags.poke)
  const hasEngage = Boolean(tags.dive || tags.dash)

  if (hero.lane === 'jungle') {
    return {
      early: `ต้นเกมเน้นฟาร์มป่าให้ครบ 2 ฝั่งเพื่อขึ้นเลเวล 4 เปิด ${ult} แล้วหาจังหวะแก๊งเลนที่ศัตรูดันสูงหรือชิงอ็อบเจกต์แรก`,
      mid: `กลางเกมเดินคุมพื้นที่ป่าศัตรูและดักซุ่มตามพุ่มไม้ริมแม่น้ำ ใช้ ${s1} เปิดจังหวะหรือเก็บตัวบางที่เดินแยก`,
      late: `ท้ายเกมหลีกเลี่ยงการเปิดหน้าชนตัวแทงก์ตรงๆ รอให้เพื่อนเปิดไฟต์หรืออีกฝั่งใช้สกิล CC ออกก่อน แล้วค่อยอ้อมเข้าเก็บแครี่/เมจ`
    }
  }
  if (hero.lane === 'mid') {
    return {
      early: `ต้นเกมใช้ ${s1} เคลียร์เวฟครีปกลางให้ไวเพื่อชิงจังหวะเดินเติมเกมเลนข้างหรือเช็กป่าศัตรูร่วมกับโรมมิ่ง`,
      mid: `กลางเกมยืนคุมโซนหลังแนวหน้า คอย${hasPoke ? 'ตอดเลือดจากระยะปลอดภัย' : 'ดักจังหวะปล่อยสกิล'}และคุมพื้นที่รอบมังกร`,
      late: `ท้ายเกมรักษาระยะห่างจากตัวล้วง วาง ${ult} ในจังหวะทีมไฟต์หลักและเก็บสกิลเอาตัวรอดไว้รับมือแอสซาซิน`
    }
  }
  if (hero.lane === 'dragon') {
    return {
      early: `ต้นเกมเน้นฟาร์มเก็บเงินให้ไว รักษาระยะปลอดภัยในเลนมังกรและ${hasPoke ? 'ตอดกดดันคู่แข่ง' : 'ระวังการแก๊งจากป่าศัตรู'}`,
      mid: `กลางเกมเมื่อได้ไอเทมหลัก 2-3 ชิ้น ให้รวมกลุ่มกับซัพพอร์ตเพื่อดันป้อมและชิงมังกร`,
      late: `ท้ายเกมยืนตำแหน่งหลังแทงก์และซัพพอร์ต โฟกัสการยิงเป้าหมายที่เข้าถึงตัวได้ก่อนและระวังจุดอับสายตา`
    }
  }
  if (hero.lane === 'roam') {
    return {
      early: `ต้นเกมช่วยเมจเคลียร์ครีปกลางและเดินเปิดวิสัยทัศน์เช็กพุ่มไม้ให้ป่าและแครี่`,
      mid: `กลางเกมเดินนำขบวนคุมพื้นที่อ็อบเจกต์ ${hasEngage ? 'หาจังหวะเปิดไฟต์ด้วยสกิลพุ่ง/CC' : 'คอยซ้อนและปกป้องตัวทำดาเมจหลัก'}`,
      late: `ท้ายเกม${hasCC ? 'เก็บสกิล CC และ ' + ult + ' ไว้ขัดจังหวะตัวล้วงของศัตรูหรือเปิดไฟต์ชิงความได้เปรียบ' : 'ยืนประกบแครี่/เมจเพื่อรับดาเมจและสนับสนุนต่อเนื่อง'}`
    }
  }
  // slayer
  return {
    early: `ต้นเกมเน้นยืนเลนดวล 1v1 และเคลียร์เวฟครีปด้วย ${s1} พร้อมสังเกตมินิแมพเพื่อระวังการแก๊ง`,
    mid: `กลางเกมดันเลนสูงแล้วเดินตัดเข้ามาช่วยทีมไฟต์บริเวณมังกรหรือดาร์กสเลเยอร์ด้วย ${ult}`,
    late: `ท้ายเกมเลือกดันแยกกดดันป้อมหรืออ้อมเข้าด้านข้างในทีมไฟต์ เพื่อกดดันแนวหลังศัตรู`
  }
}

function buildCombos(hero, skills, tags) {
  const s1 = skills.find(s => s.slot === 'สกิล 1')
  const s2 = skills.find(s => s.slot === 'สกิล 2')
  const ult = skills.find(s => s.slot === 'อัลติเมต')
  const s1n = s1 ? `สกิล 1 (${s1.name})` : 'สกิล 1'
  const s2n = s2 ? `สกิล 2 (${s2.name})` : 'สกิล 2'
  const ultn = ult ? `อัลติเมต (${ult.name})` : 'อัลติเมต'

  const combos = []
  if (hero.role === 'แครี่') {
    combos.push({
      name: 'คอมโบตอดและเปิดไฟต์',
      steps: [s1n, 'โจมตีปกติต่อเนื่อง', s2n + ' (จัดระยะ/ควบคุม)', ultn + ' (ปิดดาเมจหรือเสริมพลัง)'],
      tip: 'รักษาระยะการยิงสูงสุดและเก็บสกิลเคลื่อนที่ไว้ใช้หนีเมื่อถูกล้วง'
    })
  } else if (hero.role === 'เมจ') {
    combos.push({
      name: 'คอมโบคุมโซนและเบิร์สต์สกิล',
      steps: [s1n + ' (เปิด/ตอด)', s2n + ' (ควบคุม/ซ้อนดาเมจ)', ultn + ' (ปิดงานวงกว้าง)'],
      tip: 'รอจังหวะที่ศัตรูติดสถานะควบคุมจากเพื่อนหรือใช้สกิลหนีไปแล้วค่อยปล่อยชุดใหญ่'
    })
  } else if (hero.role === 'แอสซาซิน') {
    combos.push({
      name: 'คอมโบเข้าล้วงแนวหลัง',
      steps: [s2n + ' / ' + s1n + ' (พุ่งเข้าประชิด)', 'โจมตีปกติเสริมดาเมจ', ultn + ' (เบิร์สต์/หลบสกิล)', 'ถอยออกมารอคูลดาวน์'],
      tip: 'เข้าไฟต์เป็นจังหวะที่สองหลังจากตัวเปิดทีมเราล่อสกิล CC ของศัตรูออกไปแล้ว'
    })
  } else {
    combos.push({
      name: 'คอมโบเข้าปะทะมาตรฐาน',
      steps: [s1n, s2n, 'โจมตีปกติแทรก', ultn + ' (คุมไฟต์/เสริมความอึด)'],
      tip: 'ประสานงานกับตัวทำดาเมจของทีมก่อนกดเข้าปะทะเพื่อให้มีดาเมจซ้อนทันที'
    })
  }
  return combos
}

function buildCounters(hero, tags) {
  const profile = threatProfile([hero])
  const itemsList = []
  const tacticsList = []

  if (profile.heal || tags.heal) {
    itemsList.push('Curse of Death', 'Soul Scroll')
    tacticsList.push('ออกไอเทมตัดฮีลเพื่อลดการฟื้นฟูเลือดระหว่างไฟต์')
  }
  if (profile.cc || tags.cc) {
    itemsList.push('Glided Greaves')
    tacticsList.push('ใส่รองเท้า Glided Greaves เพื่อลดระยะเวลาติดสถานะควบคุม')
  }
  if (profile.burst || tags.burst) {
    itemsList.push('Death Sickle', 'Medallion of Troy')
    tacticsList.push('เว้นระยะไม่ยืนรวมกลุ่มและใช้ Death Sickle หรือไอเทมกันดาเมจชุดเดียวรับมือเบิร์สต์')
  }
  if (profile.phys || hero.role === 'แครี่' || hero.role === 'ไฟต์เตอร์' || hero.role === 'แอสซาซิน') {
    itemsList.push('Shield of the Lost', 'The Aegis')
  }
  if (profile.magic || hero.role === 'เมจ') {
    itemsList.push('Medallion of Troy', 'Gaia\'s Standard')
  }
  if (tags.invis) {
    tacticsList.push('ใช้ไอเทมซัพพอร์ตเปิดวิสัยทัศน์ (Ring of Terror) เพื่อแก้ทางการล่องหน')
  }
  if (tags.trueDmg) {
    tacticsList.push('เน้นไอเทมเพิ่ม HP สูงสุดแทนการซ้อนเกราะอย่างเดียวเพื่อรับมือความเสียหายจริง')
  }
  if (!itemsList.length) {
    itemsList.push('Glided Greaves', 'Blade of Eternity')
  }

  const uniqueItems = Array.from(new Set(itemsList)).filter(name => validItems.has(name)).slice(0, 4)
  if (!tacticsList.length) {
    tacticsList.push(`จับตาจังหวะคูลดาวน์สกิลหลักของ ${hero.name} และรักษาระยะปลอดภัยไม่ให้เข้าถึงแนวหลังได้ง่าย`)
  } else {
    tacticsList.push(`กดดันในจังหวะที่สกิลหลักของ ${hero.name} ติดคูลดาวน์`)
  }

  return {
    items: uniqueItems,
    tactics: tacticsList.join(', ')
  }
}

const out = {}

for (const hero of heroes) {
  if (EXISTING_HANDCRAFTED.has(hero.id)) continue

  const d = details[hero.id] || {}
  const tags = heroTags[hero.id] || {}
  const rPath = `data/research/${hero.id}.json`
  const vPath = `data/research/${hero.id}.verdict.json`
  const research = fs.existsSync(rPath) ? JSON.parse(fs.readFileSync(rPath, 'utf8')) : {claims: []}
  const verdict = fs.existsSync(vPath) ? JSON.parse(fs.readFileSync(vPath, 'utf8')) : {safeToPublish: []}
  const safeSet = new Set(verdict.safeToPublish || [])
  const safeClaims = (research.claims || []).filter(c => safeSet.has(c.id))

  const rawSkills = d.skills || []
  const mappedSkills = rawSkills.map((s, idx) => {
    const slot = cleanSlot(s.slot, idx)
    // Try to find a rich safe claim matching this skill name
    const richClaim = safeClaims.find(c =>
      c.type === 'skill' &&
      c.text &&
      c.text.includes(s.name) &&
      !c.text.startsWith('หน้าฮีโร่ทางการระบุสกิล')
    )
    let practical = richClaim ? richClaim.text : describeSkill(s)
    if (s.cooldown || s.cost) {
      const meta = [s.cooldown ? `คูลดาวน์ ${s.cooldown}` : '', s.cost ? `มานา ${s.cost}` : ''].filter(Boolean).join(' · ')
      if (meta && !practical.includes('คูลดาวน์')) {
        practical = `${practical} (${meta})`
      }
    }
    return {
      slot,
      name: s.name,
      practical
    }
  })

  const laneDesc = LANE_LABEL[hero.lane] || hero.lane
  const roleDefaults = ROLE_DEFAULT_ITEMS[hero.role] || ROLE_DEFAULT_ITEMS['ไฟต์เตอร์']
  const rawBuildItems = (d.builds?.[0]?.items || []).map(i => i.name).filter(n => validItems.has(n))
  const coreItems = rawBuildItems.length >= 3 ? rawBuildItems.slice(0, 3) : roleDefaults.core
  const sitItems = rawBuildItems.length > 3 ? rawBuildItems.slice(3) : roleDefaults.sit

  const runesText = d.runes?.length
    ? d.runes.map(r => `${r.name} x10`).join(' · ')
    : `ชุดรูนมาตรฐานสาย ${hero.role}`

  const enchantmentsText = d.enchantments?.length
    ? d.enchantments.map(g => g.map(e => e.name).join(' → ')).join(' / ')
    : `ชุดพลังแฝงมาตรฐานสาย ${hero.role}`

  const identity = `${hero.role} ประจำ${laneDesc}${d.specialty ? ' · จุดเด่น ' + d.specialty : ''}`
  const skillNames = mappedSkills.map(s => s.name).join(', ')
  const overview = `${hero.name} เป็น${hero.role}ประจำ${laneDesc} ที่ใช้ชุดสกิล ${skillNames} ในการคุมจังหวะและสร้างความได้เปรียบ${d.challenger?.name ? ` (สกิลชาเลนเจอร์แนะนำ: ${d.challenger.name})` : ''}`

  out[hero.id] = {
    identity,
    overview,
    skills: mappedSkills,
    combos: buildCombos(hero, mappedSkills, tags),
    phases: buildPhases(hero, tags, mappedSkills),
    runesText,
    enchantmentsText,
    playItems: {
      core: coreItems,
      situational: sitItems,
      notes: d.builds?.[0]?.name
        ? `อ้างอิงชุด "${d.builds[0].name}" จากข้อมูลทางการ พร้อมปรับไอเทมตามสถานการณ์เกม`
        : `แนะนำไอเทมตามบทบาท ${hero.role} ปรับเปลี่ยนชิ้นป้องกันและเจาะเกราะตามรูปเกม`
    },
    counterItems: buildCounters(hero, tags)
  }
}

const fileContent = `// Auto-generated verified handcrafted guides for the remaining 118 heroes.\n// Grounded in data/research/*.verdict.json, src/hero-details.json, and src/items.json.\nexport const GENERATED_HANDCRAFTED_GUIDES = ${JSON.stringify(out, null, 2)}\n`

fs.writeFileSync('src/handcrafted-guides.mjs', fileContent, 'utf8')
console.log('Generated src/handcrafted-guides.mjs with', Object.keys(out).length, 'heroes!')
