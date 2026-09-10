/* icon_dump_server.js — tiny local receiver for browser-side icon captures.
 * POST http://127.0.0.1:8901/dump  body: {"<id>": "data:image/png;base64,...", ...}
 * Writes each to Bible_References/Items_Top100/ours/icon/<id>.png and exits
 * after a successful dump (single-shot). Dev-only tool, localhost only.
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'Bible_References', 'Items_Top100', 'ours', 'icon');
fs.mkdirSync(OUT, {recursive: true});

const srv = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS'){ res.writeHead(204); return res.end(); }
  if (req.method !== 'POST' || req.url !== '/dump'){ res.writeHead(404); return res.end('nope'); }
  let body = '';
  req.on('data', c => { body += c; if (body.length > 20e6) req.destroy(); });
  req.on('end', () => {
    try {
      const icons = JSON.parse(body);
      let n = 0;
      for (const [id, dataURL] of Object.entries(icons)){
        const m = /^data:image\/png;base64,(.+)$/.exec(dataURL);
        if (!m || !/^[a-z0-9_]+$/.test(id)) continue;
        fs.writeFileSync(path.join(OUT, id + '.png'), Buffer.from(m[1], 'base64'));
        n++;
      }
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('saved ' + n);
      console.log('saved', n, 'icons to', OUT);
      setTimeout(() => process.exit(0), 300);
    } catch (e) {
      res.writeHead(400); res.end('bad json: ' + e.message);
    }
  });
});
srv.listen(8901, '127.0.0.1', () => console.log('icon dump receiver on 127.0.0.1:8901'));
