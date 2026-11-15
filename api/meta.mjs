import {SOURCE} from '../src/domain.mjs'

// หน้า patch-note ของ Garena ไม่เผยแพร่อัตราชนะรายตัว จึงไม่มีการ parse ตาราง
// เหมือน RoVGuide อีกต่อไป — หน้านี้ตอบเฉพาะข้อมูล patch ที่ยืนยันได้จากทางการ
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'รองรับเฉพาะ GET'})}
 try{
  const r=await fetch(SOURCE.url,{signal:AbortSignal.timeout(8000),redirect:'error'})
  if(!r.ok)throw Error()
  res.setHeader('Cache-Control','public, s-maxage=1800, stale-while-revalidate=1800')
  return res.status(200).json({name:SOURCE.name,url:SOURCE.url,date:SOURCE.date,stats:[],note:'Garena ไม่เผยแพร่อัตราชนะแรงก์แบบสาธารณะ หน้านี้ยืนยันเฉพาะวันที่แพตช์'})
 }catch{
  return res.status(502).json({error:'อ่านข้อมูลจาก rov.in.th ไม่ได้ เก็บข้อมูลชุดเดิมไว้หรือใช้ไฟล์ JSON'})
 }
}
