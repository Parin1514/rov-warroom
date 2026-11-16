import React,{useEffect,useMemo,useState,useRef} from 'react'
import {Activity,ArrowUpRight,BookOpen,Check,ChevronRight,Crosshair,Flame,Gem,Layers3,Search,Shield,Sparkles,Swords,Waves,Wind,Zap} from 'lucide-react'
import {LANES} from './domain.mjs'
import {getHeroGuide,HANDCRAFTED_GUIDES} from './guide-data.mjs'
import rawItems from './items.json' with {type:'json'}

const ITEM_ICONS = new Map(rawItems.map(i => [i.name, i.icon]))
const LANE_ICONS = {slayer:Shield,jungle:Flame,mid:Sparkles,dragon:Crosshair,roam:Waves}

function ItemBadge({name,extra}){
  const icon = ITEM_ICONS.get(name)
  return <div className="guide-item-badge esport-hover" title={name}>
    <span className="intel-icon">
      {icon ? <img src={icon} alt="" loading="lazy"/> : <Swords size={18}/>}
    </span>
    <div className="guide-item-meta">
      <b>{name}</b>
      {extra && <small>{extra}</small>}
    </div>
  </div>
}

export function HeroGuide({heroes,byId,Portrait,display,asDate,stamp}){
  const [selectedId,setSelectedId]=useState('amily')
  const [filterLane,setFilterLane]=useState('all')
  const [search,setSearch]=useState('')
  const [details,setDetails]=useState({})
  const guideTopRef=useRef(null)

  useEffect(()=>{
    let mounted=true
    import('./hero-details.json').then(m=>{
      if(mounted) setDetails(m.default||{})
    },()=>{})
    return ()=>{mounted=false}
  },[])

  const filteredHeroes=useMemo(()=>{
    return heroes.filter(h=>{
      const matchLane = filterLane==='all' || h.lane===filterLane
      const matchSearch = !search.trim() || display(h).toLowerCase().includes(search.trim().toLowerCase()) || h.id.toLowerCase().includes(search.trim().toLowerCase())
      return matchLane && matchSearch
    })
  },[heroes,filterLane,search,display])

  const activeHero = byId.get(selectedId) || heroes[0]
  const guide = useMemo(()=>{
    return getHeroGuide(activeHero, details, heroes)
  },[activeHero,details,heroes])

  function selectHero(id){
    setSelectedId(id)
    if(guideTopRef.current){
      guideTopRef.current.scrollIntoView({behavior:'smooth',block:'start'})
    }
  }

  return <section className="panel guide-panel" ref={guideTopRef}>
    <header className="section-head">
      <div>
        <h2><BookOpen/> คู่มือฮีโร่ RoV (Guide Mode)</h2>
        <p>คำอธิบายกลไกที่กดเล่นได้จริง · คอมโบ · ลำดับการเล่น · แยกไอเทมเมื่อเล่น vs เมื่อเจอ</p>
      </div>
      <div className="guide-quick-badges">
        <span className="guide-pill active"> Amily & Dextra มีคู่มือเจาะลึก </span>
        <span className="guide-pill"> ครอบคลุมทั้ง 130 ฮีโร่ </span>
      </div>
    </header>

    {/* Hero Selector Bar */}
    <div className="guide-controls">
      <div className="catalog-search guide-search-box">
        <Search size={16} aria-hidden="true"/>
        <input
          type="search"
          placeholder="ค้นหาชื่อฮีโร่เพื่ออ่านคู่มือ..."
          value={search}
          onChange={e=>setSearch(e.target.value)}
          aria-label="ค้นหาฮีโร่สำหรับอ่านคู่มือ"
        />
        {search && <button type="button" className="btn compact" onClick={()=>setSearch('')}>ล้าง</button>}
      </div>

      <div className="lane-filter guide-lanes" role="group" aria-label="กรองเลนคู่มือ">
        <button
          type="button"
          className={'chip '+(filterLane==='all'?'selected':'')}
          onClick={()=>setFilterLane('all')}
        >
          ทั้งหมด ({heroes.length})
        </button>
        {LANES.map(l=>{
          const Icon = LANE_ICONS[l.id] || Shield
          return <button
            key={l.id}
            type="button"
            className={'chip '+(filterLane===l.id?'selected':'')}
            onClick={()=>setFilterLane(l.id)}
          >
            <Icon size={14}/> {l.label}
          </button>
        })}
      </div>
    </div>

    {/* Horizontal hero scroll picker */}
    <div className="guide-hero-picker" aria-label="เลือกฮีโร่เพื่อดูคู่มือ">
      {filteredHeroes.map(h=>{
        const isSelected = h.id === activeHero?.id
        const isSpecial = !!HANDCRAFTED_GUIDES[h.id]
        return <button
          key={h.id}
          type="button"
          className={'guide-hero-tab esport-hover '+(isSelected?'selected':'')+(isSpecial?' handcrafted':'')}
          onClick={()=>selectHero(h.id)}
          aria-pressed={isSelected}
        >
          <Portrait hero={h} size="sm"/>
          <div className="guide-hero-tab-info">
            <b>{display(h)}</b>
            <small>{isSpecial ? '★ เจาะลึก' : LANES.find(l=>l.id===h.lane)?.label}</small>
          </div>
        </button>
      })}
    </div>

    {/* Guide Detailed Content */}
    {guide && <div className="guide-body" key={guide.id}>
      {/* 1. Hero Identity Banner */}
      <div className={'guide-hero-header '+(guide.isHandcrafted?'highlight-banner':'')}>
        <div className="guide-hero-main">
          <Portrait hero={activeHero} size="lg"/>
          <div>
            <div className="guide-title-row">
              <h3>{display(activeHero)}</h3>
              <span className="guide-tag lane">{guide.lane}</span>
              <span className="guide-tag role">{guide.role}</span>
              {guide.isHandcrafted ? (
                <span className="guide-tag verified">★ คู่มือเจาะลึกเฉพาะตัว</span>
              ) : (
                <span className="guide-tag auto">โครงสร้างอิงคลังทางการ</span>
              )}
            </div>
            <div className="guide-identity-box">
              <span className="identity-lead">[ภาพจำสั้น ๆ]</span>
              <p className="identity-text">{guide.identity}</p>
            </div>
            <p className="guide-overview-text">{guide.overview}</p>
          </div>
        </div>
      </div>

      {/* Grid: Skills & Combos */}
      <div className="guide-grid-2col">
        {/* Skills */}
        <section className="guide-card">
          <div className="card-head">
            <h4><Zap size={18}/> คำอธิบายสกิลและกลไกที่กดเล่นได้จริง</h4>
            <small>อ่านแล้วนำไปกดคอมโบได้จริงในแมตช์</small>
          </div>
          <div className="guide-skills-list">
            {guide.skills.map((s, idx)=>{
              return <div className="guide-skill-item" key={s.name+idx}>
                <div className="skill-item-head">
                  {s.icon ? (
                    <img src={s.icon} alt="" className="guide-skill-icon" loading="lazy"/>
                  ) : (
                    <div className="guide-skill-fallback"><Zap size={16}/></div>
                  )}
                  <div>
                    <b>{s.name}</b>
                    <span className="skill-slot-tag">{s.slot}</span>
                  </div>
                  {s.cooldown && <small className="skill-stat">คูลดาวน์ {s.cooldown}</small>}
                  {s.cost && <small className="skill-stat">ใช้ {s.cost}</small>}
                </div>
                <div className="skill-item-body">
                  <p className="skill-practical-note">{s.practical}</p>
                  {s.tags && s.tags.length > 0 && (
                    <div className="skill-tags">
                      {s.tags.map(t=><span key={t} className="skill-tag-pill">{t}</span>)}
                    </div>
                  )}
                </div>
              </div>
            })}
          </div>
        </section>

        {/* Combos */}
        <section className="guide-card">
          <div className="card-head">
            <h4><Swords size={18}/> ลำดับคอมโบสกิล (Combos)</h4>
            <small>สเต็ปการกดเพื่อรีดประสิทธิภาพสูงสุด</small>
          </div>
          <div className="guide-combos-list">
            {guide.combos.map((c, i)=>{
              return <div className="guide-combo-box" key={i}>
                <b>{c.name}</b>
                <ol className="combo-steps-list">
                  {c.steps.map((step, sIdx)=>(
                    <li key={sIdx}>
                      <span className="step-num">{sIdx+1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {c.tip && <p className="combo-tip">💡 <b>ทริก:</b> {c.tip}</p>}
              </div>
            })}
          </div>
        </section>
      </div>

      {/* Phases of Game */}
      <section className="guide-card">
        <div className="card-head">
          <h4><Activity size={18}/> วิธีเล่น ต้นเกม – กลางเกม – ท้ายเกม</h4>
          <small>จังหวะเดินเกม การคุมเลน และตำแหน่งในทีมไฟต์</small>
        </div>
        <div className="guide-phases-grid">
          <div className="phase-card early">
            <span className="phase-badge">ต้นเกม (Early Game)</span>
            <p>{guide.phases.early}</p>
          </div>
          <div className="phase-card mid">
            <span className="phase-badge">กลางเกม (Mid Game)</span>
            <p>{guide.phases.mid}</p>
          </div>
          <div className="phase-card late">
            <span className="phase-badge">ท้ายเกม (Late Game)</span>
            <p>{guide.phases.late}</p>
          </div>
        </div>
      </section>

      {/* Gear: 2 clearly separated columns (When playing vs When fighting against) */}
      <div className="guide-grid-2col">
        {/* Column 1: Play as this hero */}
        <section className="guide-card play-gear">
          <div className="card-head">
            <h4><Shield size={18}/> ออกอะไรเมื่อเล่นตัวนี้</h4>
            <small>ชุดไอเทมหลักและทางเลือกตามรูปเกม</small>
          </div>
          <div className="gear-group">
            <label className="gear-label">ไอเทมหลัก (Core Items):</label>
            <div className="gear-items-flex">
              {guide.playItems.core.map(name=>(
                <ItemBadge key={name} name={name} extra="ชิ้นหลัก"/>
              ))}
            </div>
          </div>
          <div className="gear-group">
            <label className="gear-label">ไอเทมตามสถานการณ์ (Situational):</label>
            <div className="gear-items-flex">
              {guide.playItems.situational.map(name=>(
                <ItemBadge key={name} name={name} extra="ปรับตามเกม"/>
              ))}
            </div>
          </div>
          {guide.playItems.notes && (
            <p className="gear-notes"><b>คำแนะนำ:</b> {guide.playItems.notes}</p>
          )}
          {guide.playItems.fullBuild && guide.playItems.fullBuild.length > 0 && (
            <div className="full-build-row">
              <small>ชุดแนะนำเต็ม 6 ชิ้น:</small>
              <div className="mini-item-icons">
                {guide.playItems.fullBuild.map((item, idx)=>(
                  <img key={idx} src={item.icon} alt={item.name} title={item.name} className="mini-icon"/>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Column 2: Countering this hero */}
        <section className="guide-card counter-gear">
          <div className="card-head">
            <h4><Crosshair size={18}/> ออกอะไรเมื่อเจอตัวนี้</h4>
            <small>ไอเทมแก้ทางและวิธีรับมือเมื่อต้องสู้ด้วย</small>
          </div>
          <div className="gear-group">
            <label className="gear-label">ไอเทมที่ควรออกเพื่อแก้ทาง:</label>
            <div className="gear-items-flex">
              {guide.counterItems.items.map(name=>(
                <ItemBadge key={name} name={name} extra="แก้ทางตัวนี้"/>
              ))}
            </div>
          </div>
          <div className="counter-tactics-box">
            <b>ยุทธวิธีรับมือในสนาม:</b>
            <p>{guide.counterItems.tactics}</p>
          </div>
        </section>
      </div>

      {/* Runes & Enchantments */}
      <section className="guide-card">
        <div className="card-head">
          <h4><Gem size={18}/> รูนและพลังแฝง</h4>
          <small>เซตที่เหมาะสมสำหรับสายการเล่น</small>
        </div>
        <div className="guide-runes-grid">
          <div className="runes-block">
            <b>ชุดรูน:</b>
            <p>{guide.runesText}</p>
            {guide.runes && guide.runes.length > 0 && (
              <div className="rune-tiles-row">
                {guide.runes.map((r, i)=>(
                  <span key={i} className={'rune-chip '+r.color}>
                    {r.icon && <img src={r.icon} alt="" loading="lazy"/>}
                    {r.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="enchantments-block">
            <b>แนวทางพลังแฝง:</b>
            <p>{guide.enchantmentsText}</p>
          </div>
        </div>
      </section>

      {/* Counter Matchups */}
      {guide.matchups && (
        <section className="guide-card">
          <div className="card-head">
            <h4><Crosshair size={18}/> สรุปคู่ชนะทางและคู่ที่ต้องระวัง</h4>
            <small>[การอนุมาน] ประเมินจากชุดสกิลและบทบาทในเกม</small>
          </div>
          <div className="guide-matchups-grid">
            <div className="matchup-col beats">
              <span className="matchup-header-tag good">ได้เปรียบ / มีเครื่องมือแก้</span>
              <div className="matchup-hero-list">
                {guide.matchups.beats?.map(row=>{
                  const op = byId.get(row.id)
                  if(!op) return null
                  return <button
                    key={row.id}
                    type="button"
                    className="matchup-btn esport-hover"
                    onClick={()=>selectHero(op.id)}
                    title={row.why}
                  >
                    <Portrait hero={op} size="sm"/>
                    <span>{display(op)}</span>
                    <small>{row.why ? (Array.isArray(row.why)?row.why[0]:row.why) : 'ได้เปรียบตามสกิล'}</small>
                  </button>
                })}
              </div>
            </div>
            <div className="matchup-col loses">
              <span className="matchup-header-tag risk">คู่ที่ต้องระวัง / เสียเปรียบ</span>
              <div className="matchup-hero-list">
                {guide.matchups.loses?.map(row=>{
                  const op = byId.get(row.id)
                  if(!op) return null
                  return <button
                    key={row.id}
                    type="button"
                    className="matchup-btn esport-hover"
                    onClick={()=>selectHero(op.id)}
                    title={row.why}
                  >
                    <Portrait hero={op} size="sm"/>
                    <span>{display(op)}</span>
                    <small>{row.why ? (Array.isArray(row.why)?row.why[0]:row.why) : 'เสียเปรียบตามสกิล'}</small>
                  </button>
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer Sources */}
      <div className="guide-footer-meta">
        <span>แหล่งข้อมูลยืนยัน:</span>
        <a href={guide.garena} target="_blank" rel="noreferrer">
          หน้าข้อมูล {display(activeHero)} ที่ rov.in.th <ArrowUpRight size={13}/>
        </a>
      </div>
    </div>}
  </section>
}
