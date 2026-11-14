import {defineConfig} from 'vite'
export default defineConfig({
 server:{host:'0.0.0.0',port:5199},
 build:{rollupOptions:{output:{manualChunks(id){
  if(id.includes('/node_modules/@supabase/'))return 'supabase'
  if(id.includes('/node_modules/react'))return 'react'
  if(id.endsWith('/src/heroes.json'))return 'catalog'
 }}}}
})
