import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.mp4':'video/mp4','.m4a':'audio/mp4','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.md':'text/plain; charset=utf-8','.woff2':'font/woff2','.ogg':'audio/ogg','.js':'text/javascript; charset=utf-8'};
http.createServer((req,res)=>{
  let decoded;try{decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const relative=decoded==='/'?'video-a/index.html':decoded.replace(/^\//,'');
  const file=path.resolve(root,relative);
  if(!file.startsWith(path.resolve(root)+path.sep)||relative.split(/[\\/]/).some(s=>s.startsWith('.'))){res.writeHead(403).end();return;}
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const {size}=fs.statSync(file),type=types[path.extname(file)]||'application/octet-stream';
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;if(start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`}).end();return;}res.writeHead(206,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
  else{res.writeHead(200,{'Content-Type':type,'Content-Length':size,'Accept-Ranges':'bytes','Cache-Control':'no-cache'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);}
}).listen(4188,'127.0.0.1',()=>console.log('Bracket A preview: http://127.0.0.1:4188/video-a/index.html'));
