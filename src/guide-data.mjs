// Hero guide repository and dynamic guide builder.
// Contains deep handcrafted guides (Amily, Dextra, etc.) and fallback synthesis for all 130 heroes.
import {describeSkill} from './team-analysis.mjs'
import {recommendItems,threatProfile} from './items.mjs'
import {rank} from './matchup.mjs'
import {LANES} from './domain.mjs'
import heroTags from './hero-tags.json' with {type:'json'}

export const HANDCRAFTED_GUIDES = {
  amily: {
    identity: 'ไฟต์เตอร์ดวล 1v1 ป่า/ออฟเลน ดาเมจเดี่ยวรุนแรงขึ้น 50% ฟื้นฟูเลือดและมานาได้เอง',
    overview: 'Amily เป็นไฟต์เตอร์ระยะประชิดที่เก่งที่สุดเมื่อดวลตัวต่อตัว สกิลติดตัวเพิ่มพลังโจมตีมหาศาลหากโจมตีโดนเป้าหมายเดียว สกิล 1 ปามีดชิ่งช่วยชะลอศัตรูและฟื้นฟูเลือด สกิล 2 เตะสองจังหวะงัดศัตรูลอยพร้อมพุ่งฟันเสริมดาเมจ และอัลติเมตแปลงร่างระเบิดไฟลดความเสียหายที่ได้รับ',
    skills: [
      {
        slot: 'ติดตัว',
        name: 'Duel',
        practical: 'เมื่อการโจมตีปกติหรือสกิล 2 โดนเป้าหมายเพียงตัวเดียว จะสร้างความเสียหายเพิ่มขึ้น 50% ทันที ทริกสำคัญ: เวลาเทรดในเลน พยายามล่อศัตรูให้ออกห่างจากครีปเพื่อให้ติดเงื่อนไขเป้าหมายเดี่ยว'
      },
      {
        slot: 'สกิล 1',
        name: 'Kickblade',
        practical: 'ปามีดบินชิ่งศัตรูสูงสุด 4 ครั้ง ทำดาเมจกายภาพและลดความเร็วเคลื่อนที่ 50% เมื่อมีดบินกลับมาจะฟื้นฟูเลือด 10% ของ HP สูงสุด + ลดคูลดาวน์สกิลนี้ลง 30% และเพิ่มความเร็วเคลื่อนที่ ใช้สำหรับตอดเลือดจากระยะปลอดภัยและกดรีเลือดเรื่อย ๆ ระหว่างยืนเลน'
      },
      {
        slot: 'สกิล 2',
        name: 'Combo',
        practical: 'เตะไปข้างหน้า 2 ครั้ง ครั้งที่สองจะทำให้ศัตรูลอยขึ้น หลังจากกดสกิลนี้ "การโจมตีปกติครั้งถัดไปจะพุ่งเข้าหาเป้าหมายและทำดาเมจกายภาพเพิ่ม" (ต้องกดปุ่มตีธรรมดาเอง ไม่ใช่พุ่งอัตโนมัติ) และเมื่ออยู่นอกการต่อสู้จะฟื้นฟู HP และมานา 1% ต่อวินาที พร้อมวิ่งเร็วขึ้น'
      },
      {
        slot: 'อัลติเมต',
        name: 'Enrage',
        practical: 'หลังร่าย 1 วินาที Amily จะระเบิดพลังแปลงร่าง ทำดาเมจเวทรอบตัว เพิ่มพลังโจมตีอย่างมาก ลดความเสียหายที่ได้รับลง (Damage Block) และวิ่งเร็วขึ้นต่อเนื่อง 8 วินาที กดล่วงหน้าก่อนเข้าปะทะ 1 จังหวะเพื่อให้ร่างทำงานตอนถึงตัวศัตรู'
      }
    ],
    combos: [
      {
        name: 'คอมโบเทรดสั้น (เลน 1v1)',
        steps: ['สกิล 1 (ปามีดสโลว์)', 'สกิล 2 (เตะ 2 จังหวะงัดลอย)', 'กดโจมตีปกติ (พุ่งฟันเสริมดาเมจ)', 'เดินถอยออกมารอคูลดาวน์'],
        tip: 'ใช้เมื่ออีกฝั่งยืนเดี่ยว ไม่ติดครีป ดาเมจพาสซีฟจะทำงานเต็มที่ 50%'
      },
      {
        name: 'คอมโบออลอิน / ไฟต์เต็มสูบ',
        steps: ['สกิล 1 (ชะลอเป้าหมาย)', 'กดอัลติเมต (สกิล 3) ระหว่างเดินเข้า', 'สกิล 2 (งัดลอย)', 'โจมตีปกติ (พุ่งฟัน)', 'ไล่ตีปกติ + ซ้ำสกิล 1 เมื่อคูลดาวน์กลับมา'],
        tip: 'กดอัลติเมตก่อนเข้า 1 วินาที จะทำให้ระเบิดเวทและบัฟลดดาเมจพร้อมใช้ทันทีที่ถึงตัว'
      }
    ],
    phases: {
      early: 'ต้นเกมเน้นดวล 1v1 ในเลน ใช้สกิล 1 ตอดเลือดและฟื้นฟู HP ไม่ต้องกลับบ้านบ่อย หากศัตรูแยกตัวจากครีป ให้กดสกิล 2 งัดแล้วพุ่งฟันเทรดเลือด',
      mid: 'กลางเกมเดินตัดเลน ดักพุ่มไม้ในป่า ดวล 1v1 ชนะไฟต์เตอร์และแอสซาซินส่วนใหญ่ เมื่อเพื่อนเปิดไฟต์ ให้หาจังหวะอ้อมเข้าล้วงเมจหรือแครี่',
      late: 'ท้ายเกมห้ามวิ่งเปิดหน้าชน 5v5 เป็นตัวแรก เพราะเสี่ยงโดนรุม CC จนตาย ให้รอตัวเปิดทีมเราเข้าก่อน แล้วเปิดอัลติเมตพุ่งเข้าเก็บแนวหลังจากด้านข้าง'
    },
    runesText: 'Onslaught x10 (พลังโจมตี/เจาะเกราะ) · Spirit x10 (ความเร็วโจมตี/ความเร็วเคลื่อนที่) · Dragon\'s Claw x10 (พลังโจมตี/เจาะเกราะ)',
    enchantmentsText: 'สายหลัก Lokheim: Shadow Blade → Deadly Claw → Desperate Duel (สู้ยืดเยื้อฟื้นฟู HP) หรือ Devil\'s Awakening (รีคูลดาวน์หลังเปิดอัลติ)',
    playItems: {
      core: ['Spear of Longinus', 'Glided Greaves', 'Omni Arms'],
      situational: ['Fenrir\'s Tooth', 'Shield of the Lost', 'Medallion of Troy', 'Blade of Eternity'],
      notes: 'เน้นพลังโจมตี เจาะเกราะ และลดคูลดาวน์ เพื่อให้สกิล 1 และ 2 ใช้งานได้ต่อเนื่อง'
    },
    counterItems: {
      items: ['Curse of Death', 'Soul Scroll', 'Shield of the Lost', 'The Aegis'],
      tactics: 'ออกไอเทมตัดฮีลเพื่อล้างผลฟื้นฟูจากสกิล 1 และติดตัวของ Amily, ห้ามดวล 1v1 คนเดียวในพื้นที่โล่ง, ดึงไฟต์ให้อยู่ใกล้ครีปหรือเพื่อนร่วมทีมเพื่อปิดพาสซีฟดาเมจเดี่ยว 50% ของ Amily'
    }
  },
  dextra: {
    identity: 'ไฟต์เตอร์แลกเลือดสายชน อัลติเมตแปลงดาเมจที่ได้รับเป็นเลือด ยิ่งเลือดน้อยยิ่งสู้ตาย',
    overview: 'Dextra เป็นไฟต์เตอร์เลนดาร์กสเลเยอร์ที่มีความทนทานสูงมาก มีสกิล 1 วิ่งเร็วต้านสโลว์ สกิล 2 กวาดรอบตัวฟื้นฟูเลือดตามจำนวนเป้าหมาย และมีอัลติเมตที่เปลี่ยนดาเมจทั้งหมดที่ได้รับเป็นการฟื้นฟูเลือด ทำให้สามารถพลิกไฟต์จากการใกล้ตายกลับมาเลือดเต็มหลอดได้',
    skills: [
      {
        slot: 'ติดตัว',
        name: 'Blood Curse',
        practical: 'ทุกครั้งที่โจมตีปกติหรือสกิลโดนฮีโร่ศัตรู จะได้รับสแต็กพลังโจมตี (สูงสุด 8 สแต็ก) และเพิ่มความเร็วโจมตี ยิ่งสู้ยืดเยื้อดาเมจยิ่งเพิ่มขึ้น (ประสานสกิลพิเศษกับ Sinestrea เมื่ออยู่ในทีมเดียวกัน)'
      },
      {
        slot: 'สกิล 1',
        name: 'Saw Storm',
        practical: 'กดใช้เพื่อเร่งความเร็วเคลื่อนที่และต้านทานสถานะสโลว์ การโจมตีปกติครั้งถัดไประหว่างวิ่งจะพุ่งฟันหมุนรอบตัว ทำดาเมจกายภาพและลดความเร็วศัตรู 50% ใช้สำหรับเข้าประชิดตัวแครี่/เมจ หรือใช้หนีเมื่อถูกรุม'
      },
      {
        slot: 'สกิล 2',
        name: 'Saw Cut',
        practical: 'ควงเลื่อยฟาดรอบตัว ทำดาเมจกายภาพ และ "ฟื้นฟูเลือดตามจำนวนศัตรูที่โดน" (ฮีโร่ศัตรูให้ผลฟื้นฟูสูงกว่ามินเนี่ยน) ยิ่งยืนกลางวงล้อมศัตรูหลายตัว เลือดยิ่งเด้งเยอะ'
      },
      {
        slot: 'อัลติเมต',
        name: 'Demon\'s Gift',
        practical: 'เข้าสู่สภาวะตื่นรู้ 3 วินาที ในช่วงนี้ "ดาเมจทั้งหมดที่ Dextra ได้รับจะถูกแปลงเป็นการฟื้นฟูเลือดแทน" กดเมื่อเลือดเหลือประมาณ 20-30% หรือตอนที่ศัตรูกำลังรุมปล่อยสกิลชุดใหญ่ใส่ ห้ามกดตอนเลือดเต็ม'
      }
    ],
    combos: [
      {
        name: 'คอมโบเข้าปะทะและดูดเลือด',
        steps: ['สกิล 1 (วิ่งเร็วเข้าประชิด)', 'โจมตีปกติ (พุ่งหมุนฟันสโลว์)', 'สกิล 2 (ฟาดควงเลื่อยดูดเลือด)', 'โจมตีปกติต่อเนื่องสะสมสแต็กพาสซีฟ'],
        tip: 'ใช้สกิล 2 ขณะที่อยู่ติดศัตรูและมินเนี่ยนเพื่อดึงค่าฮีลสูงสุด'
      },
      {
        name: 'คอมโบล่อซื้อและพลิกสถานการณ์ (Bait & Reverse)',
        steps: ['เข้าปะทะยอมแลกเลือดจนเหลือต่ำกว่า 30%', 'กดอัลติเมต (สกิล 3) ในจังหวะที่ศัตรูปล่อยสกิลเบิร์สต์', 'เลือดจะเด้งกลับมาเต็มหลอด', 'สกิล 2 ดูดเลือดซ้ำ + ไล่ตีปกติ'],
        tip: 'ระวังการโดน Hard CC (เช่น แช่แข็ง, สตั้นยึด) จนกดอัลติเมตไม่ทัน ให้สังเกตจังหวะ CC ของศัตรู'
      }
    ],
    phases: {
      early: 'ต้นเกมยืนเลนอย่างดุดัน สกิล 1 ช่วยให้เข้าถึงตัวและหนีแก๊งได้ดี เลเวล 4 ได้เปรียบการดวลเลนอย่างมากเพราะมีอัลติเมตชุบชีวิตเทียม',
      mid: 'กลางเกมเป็นตัวเปิดไฟต์ชั้นดีหรือตัวชนแนวหน้า วิ่งนำหน้าเพื่อนเข้าไปรับดาเมจชุดแรกของศัตรู แล้วกดอัลติเมตสวนเพื่อดูดซับดาเมจทั้งหมด',
      late: 'ท้ายเกมเน้นเป็นแนวหน้าตัดจังหวะ ระวังศัตรูหยุดตีตอนเปิดอัลติเมต และระวังไอเทมตัดฮีลของอีกฝั่งที่จะลดปริมาณเลือดที่แปลงกลับมา'
    },
    runesText: 'Awake / Rampage x10 (อัตราคริ/ความเร็วโจมตี) · Throne / Spirit x10 · Dragon\'s Claw x10 (พลังโจมตี/เจาะเกราะ)',
    enchantmentsText: 'สายหลัก Lokheim: Devourer → Deadly Claw → Desperate Duel (เพิ่มการฟื้นฟูและดาเมจยืดเยื้อ)',
    playItems: {
      core: ['Glided Greaves', 'Fafnir\'s Talon', 'Mail of Pain'],
      situational: ['Omni Arms', 'Medallion of Troy', 'Blade of Eternity', 'Frost Cape'],
      notes: 'เน้นความอึด ความเร็วโจมตี และการดูดเลือด เพื่อเสริมการยืนระยะในไฟต์'
    },
    counterItems: {
      items: ['Curse of Death', 'Soul Scroll', 'Glided Greaves'],
      tactics: 'ออกไอเทมตัดเลือดเป็นอันดับแรกเพื่อตัดการฮีลของสกิล 2 และอัลติเมต, เมื่อเห็น Dextra เปิดอัลติเมต (มีเอฟเฟกต์รอบตัว) "ให้หยุดตีทันที" แล้วถอยออกมา 3 วินาที อย่าปล่อยสกิลใหญ่ใส่, ใช้ฮีโร่สายสตั้นต่อเนื่อง (Hard CC) ล็อกตัวก่อนเลือดลดถึงขีดอัลติ'
    }
  }
}

/**
 * Build a structured guide for any hero.
 * Uses handcrafted data if available; otherwise synthesizes factual guide from verified sources.
 */
export function getHeroGuide(hero, details = {}, allHeroes = []) {
  if (!hero) return null

  const handcrafted = HANDCRAFTED_GUIDES[hero.id]
  const d = details[hero.id] || {}
  const laneObj = LANES.find(l => l.id === hero.lane)
  const laneLabel = laneObj ? laneObj.label : hero.lane

  if (handcrafted) {
    const rawSkills = d.skills || []
    const mappedSkills = handcrafted.skills.map((s, idx) => {
      const match = rawSkills.find(rs => rs.name === s.name || rs.slot?.includes(s.slot)) || rawSkills[idx]
      return {
        slot: s.slot,
        name: s.name,
        icon: match?.icon || null,
        tags: match?.tags || [],
        cooldown: match?.cooldown || '',
        cost: match?.cost || '',
        practical: s.practical
      }
    })

    const beatsLoses = rank(hero.id, allHeroes, heroTags, 4)

    return {
      id: hero.id,
      name: hero.name,
      variant: hero.variant,
      lane: laneLabel,
      role: hero.role,
      isHandcrafted: true,
      identity: handcrafted.identity,
      overview: handcrafted.overview,
      skills: mappedSkills.length ? mappedSkills : rawSkills.map(s => ({...s, practical: describeSkill(s)})),
      combos: handcrafted.combos,
      phases: handcrafted.phases,
      runesText: handcrafted.runesText,
      runes: d.runes || [],
      enchantmentsText: handcrafted.enchantmentsText,
      enchantments: d.enchantments || [],
      playItems: {
        core: handcrafted.playItems.core,
        situational: handcrafted.playItems.situational,
        notes: handcrafted.playItems.notes,
        fullBuild: d.builds?.[0]?.items || []
      },
      counterItems: handcrafted.counterItems,
      matchups: beatsLoses,
      garena: d.garena || ('https://www.rov.in.th/hero/' + (hero.sourceSlug || hero.id))
    }
  }

  // Synthesized fallback for the remaining 128 heroes
  const rawSkills = d.skills || []
  const mappedSkills = rawSkills.map((s, i) => ({
    slot: s.slot?.replace(/^\d+/, '') || (i === 0 ? 'ติดตัว' : 'สกิล ' + i),
    name: s.name,
    icon: s.icon,
    tags: s.tags || [],
    cooldown: s.cooldown || '',
    cost: s.cost || '',
    practical: describeSkill(s)
  }))

  const profile = threatProfile([hero])
  const counterItemList = []
  if (profile.heal) counterItemList.push('Curse of Death', 'Soul Scroll')
  if (profile.cc) counterItemList.push('Glided Greaves')
  if (profile.burst) counterItemList.push('Death Sickle', 'Medallion of Troy')
  if (profile.phys) counterItemList.push('Shield of the Lost', 'The Aegis')
  if (profile.magic) counterItemList.push('Medallion of Troy', 'Gaia\'s Standard')
  if (!counterItemList.length) counterItemList.push('Glided Greaves', 'Blade of Eternity')
  const uniqCounterItems = Array.from(new Set(counterItemList))

  const baseItems = d.builds?.[0]?.items?.map(i => i.name) || []
  const coreItems = baseItems.slice(0, 3)
  const sitItems = baseItems.slice(3)

  const beatsLoses = rank(hero.id, allHeroes, heroTags, 4)

  return {
    id: hero.id,
    name: hero.name,
    variant: hero.variant,
    lane: laneLabel,
    role: hero.role,
    isHandcrafted: false,
    identity: `${hero.role} ประจำเลน ${laneLabel}${d.specialty ? ' · จุดเด่น ' + d.specialty : ''}`,
    overview: `สถิติแรงก์ไทย: อัตราชนะ ${hero.win != null ? hero.win.toFixed(2) + '%' : '—'} · อัตราเลือก ${hero.pick != null ? hero.pick.toFixed(2) + '%' : '—'} · อัตราแบน ${hero.ban != null ? hero.ban.toFixed(2) + '%' : '—'}`,
    skills: mappedSkills,
    combos: [
      {
        name: 'จังหวะการใช้สกิลตามลำดับ',
        steps: mappedSkills.map(s => `${s.slot}: ${s.name}`),
        tip: 'ปรับเปลี่ยนตามสถานะศัตรูและคูลดาวน์'
      }
    ],
    phases: {
      early: 'ต้นเกมรักษาเลน เคลียร์เวฟอย่างปลอดภัย และระวังการแก๊งจากป่าศัตรู',
      mid: 'กลางเกมประสานงานกับเพื่อนร่วมทีม คุมพื้นที่มังกรและดาร์กสเลเยอร์',
      late: 'ท้ายเกมยืนตำแหน่งตามบทบาทของทีม ระวังการถูกจับแยกหรือถูกดักพุ่ม'
    },
    runesText: d.runes?.length ? d.runes.map(r => r.name).join(' / ') : 'ชุดรูนแนะนำตามบทบาท ' + hero.role,
    runes: d.runes || [],
    enchantmentsText: d.enchantments?.length ? d.enchantments.map(g => g.map(e => e.name).join(' → ')).join(' / ') : 'ชุดพลังแฝงแนะนำตามบทบาท ' + hero.role,
    enchantments: d.enchantments || [],
    playItems: {
      core: coreItems.length ? coreItems : ['Glided Greaves'],
      situational: sitItems.length ? sitItems : ['Blade of Eternity'],
      notes: d.builds?.[0]?.name ? `อ้างอิงจากชุด ${d.builds[0].name}` : 'ปรับเปลี่ยนตามความต้องการของเกม',
      fullBuild: d.builds?.[0]?.items || []
    },
    counterItems: {
      items: uniqCounterItems,
      tactics: `ประเมินจากลักษณะการทำดาเมจและสกิลของ ${hero.name}: ระวังจังหวะสกิลสำคัญและเว้นระยะปลอดภัย`
    },
    matchups: beatsLoses,
    garena: d.garena || ('https://www.rov.in.th/hero/' + (hero.sourceSlug || hero.id))
  }
}
