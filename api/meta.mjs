import catalog from '../src/heroes.json' with {type:'json'}
import {SOURCE} from '../src/domain.mjs'

export function fromDirectory(html){
 const date=html.match(/<time\s+datetime="(\d{4}-\d\d-\d\d)"/i)?.[1]
 const table=html.match(/<table\s+aria-labelledby="ranked-heading"[^>]*>([\s\S]*?)<\/table>/i)?.[1]
 if(!date||!table)throw new Error('unrecognized source')
 const map=new Map(catalog.map(h=>[h.sourceSlug,h.id]))
 const out=new Map()
 for(const [,row] of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)){
  const slug=row.match(/href="\/th\/heroes\/([\w'-]+)"/)?.[1]
  const id=map.get(slug)
  const values=Array.from(row.matchAll(/>([0-9.]+)%</g),x=>Number(x[1]))
  if(id&&values.length===3&&values.every(x=>Number.isFinite(x)&&x>=0&&x<=100)){
   const [win,pick,ban]=values
   out.set(id,{id,win,pick,ban})
  }
 }
 if(out.size<100)throw new Error('source missing rows')
 return {name:SOURCE.name,url:SOURCE.url,date,stats:[...out.values()]}
}
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'รองรับเฉพาะ GET'})}
 try{
  const r=await fetch(SOURCE.url,{signal:AbortSignal.timeout(8000),redirect:'error'})
  if(!r.ok)throw Error()
  const data=fromDirectory(await r.text())
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800')
  return res.status(200).json(data)
 }catch{
  return res.status(502).json({error:'อ่านสถิติจาก RoVGuide ไม่ได้ เก็บข้อมูลชุดเดิมไว้หรือใช้ไฟล์ JSON'})
 }
}
