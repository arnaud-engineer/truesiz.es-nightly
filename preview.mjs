// SPDX-License-Identifier: MPL-2.0
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.dirname(fileURLToPath(import.meta.url));
const files = new Set(execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean));
for (const name of ['index.html','app.css','app.mjs']) files.add(name);
const manifest = JSON.parse(await fs.readFile(path.join(root,'gpt-engine/manifest.json')));
for (const row of manifest.files) files.add('gpt-engine/'+row.path);
files.add('gpt-engine/manifest.json');
files.delete('preview.mjs');
const types = { '.html':'text/html', '.css':'text/css', '.mjs':'text/javascript', '.js':'text/javascript',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.txt':'text/plain', '.mts':'text/plain' };
const port = Number(process.argv[2]??8788);
if (!Number.isSafeInteger(port) || port<1024 || port>65535) throw new TypeError('Invalid port');
http.createServer(async(req,res)=>{
  let relative;
  try { relative=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/, '')||'index.html'; }
  catch { res.writeHead(400);res.end();return; }
  if (relative.endsWith('/')) relative+='index.html';
  if (!['GET','HEAD'].includes(req.method) || !files.has(relative)) {res.writeHead(404);res.end();return;}
  try {
    const file=path.join(root,relative),real=await fs.realpath(file);
    if (!real.startsWith(await fs.realpath(root)+path.sep) || (await fs.lstat(file)).isSymbolicLink()) throw new Error('Unowned path');
    const bytes=await fs.readFile(file);
    res.writeHead(200,{'content-type':(types[path.extname(file)]??'text/plain')+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:bytes);
  } catch {res.writeHead(404);res.end();}
}).listen(port,'127.0.0.1',()=>console.log(`Nightly preview: http://127.0.0.1:${port}/`));
