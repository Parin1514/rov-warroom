// Verified team draft analysis engine and skill describer.
// Grounded strictly in hero-details.json (Garena skills) and hero-tags.json.
// No invented win rates, no hallucinated abilities.

export function cleanSlot(slot) {
  return String(slot || '').replace(/^\d+/, '');
}

/**
 * Generates an accurate, verified Thai description for any skill
 * strictly based on verified tags, slot, cooldown, and cost.
 */
export function describeSkill(s) {
  if (!s) return '';
  const slot = cleanSlot(s.slot);
  const tags = s.tags || [];
  const parts = [];

  const isPassive = slot.includes('พาสซีฟ') || slot.includes('ติดตัว');

  // Mobility
  if (tags.includes('เคลื่อนที่') || tags.includes('วาร์ป')) {
    parts.push(tags.includes('วาร์ป') ? 'วาร์ปเปลี่ยนตำแหน่ง' : 'สกิลเคลื่อนที่ (พุ่ง/กลิ้ง)');
  }

  // Damage
  const dmg = [];
  if (tags.includes('กายภาพ')) dmg.push('กายภาพ');
  if (tags.includes('เวท')) dmg.push('เวท');
  if (tags.includes('จริง')) dmg.push('จริง (ไม่สนเกราะ)');
  if (tags.includes('ความเสียหายผสม')) dmg.push('ผสม');
  if (dmg.length) {
    const aoe = tags.includes('ความเสียหายหมู่') ? 'วงกว้าง ' : '';
    parts.push((isPassive ? 'สร้างความเสียหาย' : 'โจมตีทำความเสียหาย') + aoe + dmg.join('+'));
  }

  // Crowd Control
  const cc = [];
  if (tags.includes('สตั้น') || tags.includes('สตั๊น')) cc.push('สตั้นหยุดเป้าหมาย');
  if (tags.includes('แช่แข็ง')) cc.push('แช่แข็ง');
  if (tags.includes('ลอยขึ้น')) cc.push('ยกศัตรูลอยขึ้น');
  if (tags.includes('ผลักถอยหลัง')) cc.push('ผลักศัตรูกระเด็น');
  if (tags.includes('ล็อคตัว')) cc.push('จับล็อกเป้าหมาย');
  if (tags.includes('ยั่วยุ')) cc.push('ยั่วยุบังคับตี');
  if (tags.includes('ลดความเร็ว')) cc.push('สโลว์ลดความเร็ว');
  if (tags.includes('ใบ้')) cc.push('ใบ้ห้ามใช้สกิล');
  if (cc.length) parts.push('มีผล ' + cc.join(' / '));

  // Defense / Utility
  const util = [];
  if (tags.includes('ไม่ตกเป็นเป้าหมาย')) util.push('ไม่ตกเป็นเป้าหมาย (อมตะชั่วขณะ)');
  if (tags.includes('ต้านสถานะ') || tags.includes('กันสถานะ')) util.push('ต้านทานสถานะผิดปกติ (Iron Body)');
  if (tags.includes('ป้องกัน') || tags.includes('ลดความเสียหาย')) util.push('มอบโล่ป้องกัน/ลดความเสียหาย');
  if (tags.includes('ฮีล') || tags.includes('ฟื้นฟู')) util.push('ฟื้นฟูพลังชีวิต');
  if (tags.includes('ดูดกลืน')) util.push('ดูดเลือดฟื้นฟู');
  if (tags.includes('ล่องหน')) util.push('พรางตัว/ล่องหน');
  if (tags.includes('เปิดแผนที่')) util.push('เปิดวิสัยทัศน์/เผยตำแหน่ง');
  if (tags.includes('เพิ่มความเร็ว')) util.push('เพิ่มความเร็วเคลื่อนที่');
  if (tags.includes('ป้องกันตาย')) util.push('ป้องกันการตายเมื่อพลังชีวิตหมด');
  if (util.length) parts.push(util.join(', '));

  let text = parts.join(' พร้อม');
  if (!text) {
    text = (isPassive ? 'สกิลติดตัว' : 'สกิลใช้งาน') + ' (' + (tags.join(', ') || 'ไม่มีแท็กระบุ') + ')';
  }

  const stats = [];
  if (s.cooldown) stats.push('คูลดาวน์ ' + s.cooldown);
  if (s.cost !== undefined && s.cost !== null && s.cost !== '') {
    stats.push(s.cost === 0 || s.cost === '0' ? 'ไม่ใช้ทรัพยากร' : 'ใช้ ' + s.cost);
  }
  if (stats.length) text += ' [' + stats.join(' | ') + ']';

  return text;
}

const CC_TAGS = ['สตั้น', 'สตั๊น', 'ลอยขึ้น', 'ผลักถอยหลัง', 'ควบคุม', 'แช่แข็ง', 'ล็อคตัว', 'ยั่วยุ', 'ดูด'];
const HARD_CC = ['สตั้น', 'สตั๊น', 'ลอยขึ้น', 'แช่แข็ง', 'ล็อคตัว', 'ยั่วยุ'];
const MOVE_TAGS = ['เคลื่อนที่', 'วาร์ป', 'ไม่ตกเป็นเป้าหมาย'];

/**
 * Analyzes the composition of our team (or any team draft)
 * returns:
 *   - count: number of heroes drafted
 *   - focus: { title, desc, tag }
 *   - strengths: [ { title, desc } ]
 *   - weaknesses: [ { title, desc, fix } ]
 */
export function analyzeTeamDraft(teamIds, enemyIds = [], { byId, details = {}, tags = {} } = {}) {
  const ids = (teamIds || []).filter(Boolean);
  const getHero = (id) => (byId instanceof Map ? byId.get(id) : byId?.[id]);
  const heroes = ids.map(getHero).filter(Boolean);
  const enemies = (enemyIds || []).filter(Boolean).map(getHero).filter(Boolean);

  if (heroes.length === 0) {
    return {
      count: 0,
      focus: null,
      strengths: [],
      weaknesses: []
    };
  }

  // Profile data extraction
  const ccSkills = [];
  const hardCCSkills = [];
  const moveSkills = [];
  let physCount = 0;
  let magicCount = 0;
  const trueDmgHeroes = [];
  const tankyHeroes = [];
  const diveHeroes = [];
  const dashHeroes = [];
  const pokeHeroes = [];
  const healHeroes = [];
  const fragileHeroes = [];

  for (const h of heroes) {
    const t = tags[h.id] || {};
    const d = details[h.id] || {};
    const skills = d.skills || [];

    if (t.phys > 0 || h.role === 'แครี่' || h.role === 'ไฟต์เตอร์') physCount++;
    if (t.magic > 0 || h.role === 'เมจ') magicCount++;
    if (t.trueDmg) trueDmgHeroes.push(h);
    if (t.tanky || h.role === 'แทงค์' || h.role === 'ไฟต์เตอร์') tankyHeroes.push(h);
    if (t.dive || (h.role === 'แอสซาซิน' && t.dash)) diveHeroes.push(h);
    if (t.dash) dashHeroes.push(h);
    if (t.poke || (d.specialty && d.specialty.includes('ระยะไกล'))) pokeHeroes.push(h);
    if (t.heal || t.sustain || h.role === 'ซัพพอร์ต') healHeroes.push(h);
    if ((h.role === 'แครี่' || h.role === 'เมจ') && !t.dash) fragileHeroes.push(h);

    for (const s of skills) {
      const sTags = s.tags || [];
      const isCC = sTags.some((x) => CC_TAGS.includes(x));
      const isHard = sTags.some((x) => HARD_CC.includes(x));
      const isMove = sTags.some((x) => MOVE_TAGS.includes(x));
      const slot = cleanSlot(s.slot);
      if (isCC) ccSkills.push({ hero: h.name, heroId: h.id, slot, name: s.name, isHard, tags: sTags });
      if (isHard) hardCCSkills.push({ hero: h.name, heroId: h.id, slot, name: s.name, tags: sTags });
      if (isMove) moveSkills.push({ hero: h.name, heroId: h.id, slot, name: s.name, tags: sTags });
    }
  }

  // 1. FOCUS (ดราฟต์ทีมเน้น)
  let focus = null;
  if (heroes.length === 1) {
    const solo = heroes[0];
    focus = {
      title: `แกนนำ: ${solo.name} (${solo.role})`,
      desc: `เริ่มดราฟต์รอบ ${solo.name} ในเลน ${solo.lane} แนะนำเติมแนวหน้าและตัวเปิดไฟต์เพื่อสร้างพื้นที่เล่น`,
      tag: 'เดี่ยว'
    };
  } else if (diveHeroes.length >= 2 || (diveHeroes.length >= 1 && dashHeroes.length >= 3)) {
    focus = {
      title: 'เน้นล้วงและเบิร์สต์แนวหลัง (Dive & Burst)',
      desc: `ทีมมีตัวเข้าทำเร็ว (${diveHeroes.map((h) => h.name).join(', ')}) โฟกัสกำจัดแครี่หรือเมจศัตรูในจังหวะเดียว เหมาะชิงจังหวะสโนว์บอล`,
      tag: 'ล้วงแนวหลัง'
    };
  } else if (pokeHeroes.length >= 2) {
    focus = {
      title: 'เน้นโป๊กและคุมระยะ (Poke & Siege)',
      desc: `ทีมมีตัวทำดาเมจระยะไกล (${pokeHeroes.map((h) => h.name).join(', ')}) โซนพื้นที่หน้าป้อมและกดดันก่อนเริ่มไฟต์ เลี่ยงการปะทะประชิดตัว`,
      tag: 'คุมระยะ'
    };
  } else if (ccSkills.length >= 4 && tankyHeroes.length >= 2) {
    focus = {
      title: 'เน้นทีมไฟต์และควบคุมเป็นกลุ่ม (Teamfight & AoE CC)',
      desc: 'ทีมมีตัวรับดาเมจและสกิลควบคุมหนาแน่น เหมาะกับการรวมตัวไฟต์ 5v5 ชิงมังกรและดาร์กลอร์ดสเลเยอร์',
      tag: 'ทีมไฟต์'
    };
  } else if (healHeroes.length >= 2 && tankyHeroes.length >= 2) {
    focus = {
      title: 'เน้นยืนระยะและไฟต์ยืดเยื้อ (Sustain & Brawl)',
      desc: 'ทีมมีการฟื้นฟูและการต้านทานสูง แลกดาเมจยาวและยื้อไฟต์ได้เปรียบ',
      tag: 'ยืนระยะ'
    };
  } else if (dashHeroes.length >= 3 && tankyHeroes.length >= 1) {
    focus = {
      title: 'เน้นความคล่องตัวและแยกดัน (Mobility & Split Push)',
      desc: `ทีมเคลื่อนที่เร็ว (${dashHeroes.map((h) => h.name).join(', ')}) หมุนแผนที่ช่วยเลนและแยกดันป้อมได้ดี ถอยหนีและตั้งรับได้ไว`,
      tag: 'คล่องตัว'
    };
  } else {
    focus = {
      title: 'ดราฟต์สมดุลมาตรฐาน (Standard Balanced)',
      desc: 'โครงสร้างตำแหน่งสมดุล มีทั้งแนวหน้า ตัวทำดาเมจ และตัวควบคุมตามตำแหน่งหลัก',
      tag: 'สมดุล'
    };
  }

  // 2. STRENGTHS (จุดแข็ง)
  const strengths = [];

  // CC
  if (ccSkills.length >= 3) {
    const sample = ccSkills.slice(0, 3).map((s) => `${s.hero} [${s.slot} ${s.name}]`).join(', ');
    strengths.push({
      title: `สกิลควบคุมหนาแน่น (${ccSkills.length} สกิล)`,
      desc: `มีสกิลหยุดและตัดจังหวะจาก ${sample}${ccSkills.length > 3 ? ` และอีก ${ccSkills.length - 3} สกิล` : ''}`
    });
  } else if (ccSkills.length >= 1) {
    const sample = ccSkills.map((s) => `${s.hero} [${s.slot} ${s.name}]`).join(', ');
    strengths.push({
      title: `มีสกิลควบคุม (${ccSkills.length} สกิล)`,
      desc: `มีสกิลตัดจังหวะจาก ${sample}`
    });
  }

  // Damage balance
  if (physCount >= 1 && magicCount >= 1) {
    strengths.push({
      title: `สมดุลดาเมจ (กายภาพ ${physCount} / เวท ${magicCount})`,
      desc: 'ดาเมจผสมสองฝั่ง ทำให้ศัตรูออกเกราะป้องกันประเภทเดียวแก้ทางไม่ได้'
    });
  }

  // True damage
  if (trueDmgHeroes.length > 0) {
    strengths.push({
      title: `มีดาเมจจริงเจาะเกราะ (${trueDmgHeroes.map((h) => h.name).join(', ')})`,
      desc: 'ดาเมจจริงไม่ถูกลดทอนด้วยเกราะกายภาพหรือต้านเวท ช่วยล้มตัวหนาของศัตรูได้รวดเร็ว'
    });
  }

  // Mobility
  if (dashHeroes.length >= 3) {
    strengths.push({
      title: `ความคล่องตัวสูง (${dashHeroes.length} ตัว)`,
      desc: `มีสกิลพุ่งหรือเคลื่อนที่เข้าออกไฟต์ได้ไว: ${dashHeroes.map((h) => h.name).join(', ')}`
    });
  }

  // Frontline
  if (tankyHeroes.length >= 2) {
    strengths.push({
      title: `แนวหน้าแข็งแกร่ง (${tankyHeroes.map((h) => h.name).join(', ')})`,
      desc: 'มีไฟต์เตอร์/แทงค์คอยยืนโซน รับดาเมจ และเปิดวิสัยทัศน์ในพุ่มไม้'
    });
  }

  // Poke
  if (pokeHeroes.length >= 1 && !strengths.some((s) => s.title.includes('ระยะ'))) {
    strengths.push({
      title: `มีระยะกดดัน (${pokeHeroes.map((h) => h.name).join(', ')})`,
      desc: 'ตอดเลือดศัตรูก่อนเข้าไฟต์ ช่วยให้ทีมชิงพื้นที่เป้าหมายใหญ่ได้ง่าย'
    });
  }

  // Fallback strength if only 1 hero
  if (strengths.length === 0 && heroes.length === 1) {
    const solo = heroes[0];
    strengths.push({
      title: `จุดเด่นเฉพาะตัวของ ${solo.name}`,
      desc: `ตำแหน่ง ${solo.lane} บทบาท ${solo.role}`
    });
  }

  // 3. WEAKNESSES (จุดอ่อน)
  const weaknesses = [];

  // No frontline
  if (tankyHeroes.length === 0 && heroes.length >= 2) {
    weaknesses.push({
      title: 'ขาดแนวหน้ารับดาเมจ (ไม่มีแทงค์/ไฟต์เตอร์)',
      desc: 'ทีมไม่มีตัวยืนชนรับสกิล หากโดนศัตรูเปิดไฟต์หรือโดนสกิลหมู่ แนวหลังจะแตกทันที',
      fix: 'แนะนำเลือกแทงค์หรือไฟต์เตอร์ตัวหนาในตำแหน่งที่เหลือ'
    });
  }

  // No Hard CC
  if (hardCCSkills.length === 0 && heroes.length >= 2) {
    weaknesses.push({
      title: 'ขาดสกิลควบคุมแข็ง (ไม่มีสตั้น/ล็อกตัว)',
      desc: 'ไม่มีสกิลหยุดชะงักเด็ดขาด ทำให้หยุดฮีโร่ตัวพุ่งหรือล้วงของศัตรูได้ยาก',
      fix: 'แนะนำเสริมฮีโร่ที่มีสตั้น แช่แข็ง หรือจับล็อกเป้าหมาย'
    });
  }

  // One-sided damage
  if (magicCount === 0 && heroes.length >= 3) {
    weaknesses.push({
      title: 'ดาเมจกายภาพล้วน (ขาดดาเมจเวท)',
      desc: 'ศัตรูออกเกราะกายภาพ (Shield of the Lost, Mail of Pain) แก้ทางได้ทั้งทีม',
      fix: 'จำเป็นต้องเลือกเมจหรือตัวทำดาเมจเวทในช่องที่เหลือ'
    });
  } else if (magicCount >= 3) {
    weaknesses.push({
      title: `ดาเมจเวทซ้อนทับกันมากเกินไป (${magicCount} ตัว)`,
      desc: 'ศัตรูออกเกราะกันเวท (Medallion of Troy / Gaia\'s Standard) ชิ้นเดียวลดดาเมจได้ทั้งทีม',
      fix: 'ระวังสมดุลดาเมจกายภาพในช่องที่เหลือ'
    });
  }

  // Immobile carries
  if (fragileHeroes.length >= 1) {
    weaknesses.push({
      title: `แนวหลังขาดความคล่องตัว (${fragileHeroes.map((h) => h.name).join(', ')})`,
      desc: 'ไม่มีสกิลเคลื่อนที่หนี เสี่ยงโดนตัวล้วง/แอสซาซินของศัตรูเข้าถึงตัวและปิดงานได้ง่าย',
      fix: 'ต้องมีโรมมิ่งหรือแนวหน้าคอยโซนคุ้มกัน (Peel) ตลอดเวลา'
    });
  }

  // Low mobility team
  if (dashHeroes.length <= 1 && heroes.length >= 3) {
    weaknesses.push({
      title: 'ทีมความคล่องตัวต่ำ',
      desc: 'ฮีโร่ส่วนใหญ่ไม่มีสกิลพุ่ง หมุนแผนที่ช้าและถอนตัวจากไฟต์ที่เสียเปรียบได้ยาก',
      fix: 'ระวังการเดินในจุดที่ไม่มีวิสัยทัศน์ และเลี่ยงการโดนซุ่มโจมตี'
    });
  }

  // No anti-tank (true dmg / %hp) when draft nearly full
  if (trueDmgHeroes.length === 0 && heroes.length >= 4) {
    weaknesses.push({
      title: 'ขาดดาเมจจริงเจาะเกราะ',
      desc: 'ไม่มีสกิลดาเมจจริง หากเจอแทงค์ศัตรูที่ออกเกราะหนา จะปิดไฟต์ได้ช้าในเลทเกม',
      fix: 'แครี่และไฟต์เตอร์ต้องออกไอเทมเจาะเกราะ (Muramasa, Staff of Nuul) เป็นชิ้นหลัก'
    });
  }

  // Fallback weakness if only 1 hero
  if (weaknesses.length === 0 && heroes.length === 1) {
    weaknesses.push({
      title: 'ยังขาดอีก 4 ตำแหน่งในทีม',
      desc: 'ต้องเลือกให้ครบทุกเลนเพื่อประเมินความเข้ากันได้และการแก้ทางอย่างสมบูรณ์',
      fix: 'เลือกฮีโร่ในช่องเลนถัดไป'
    });
  }

  return {
    count: heroes.length,
    heroes,
    focus,
    strengths,
    weaknesses
  };
}
