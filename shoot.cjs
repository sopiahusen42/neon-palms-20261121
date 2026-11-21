const puppeteer = require('/home/administrator/.local/tools/shotter/node_modules/puppeteer');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = process.cwd() + '/game';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg' };
const srv = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  fs.readFile(path.join(ROOT, p), (e,b)=>{
    if (e) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(p)] || 'application/octet-stream'});
    res.end(b);
  });
});
(async ()=>{
  await new Promise(r=>srv.listen(8113, r));
  const browser = await puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-dev-shm-usage','--font-render-hinting=none'] });
  const page = await browser.newPage();
  await page.setViewport({ width:1280, height:720, deviceScaleFactor:1 });
  const errs=[]; page.on('pageerror',e=>errs.push(e.message));
  for (const [mode,name] of [['cover','01-cover.jpg'],['chase','02-chase.jpg'],['foot','03-foot.jpg'],['title','04-title.jpg']]) {
    await page.goto(`http://localhost:8113/?shot=${mode}&seed=1`, { waitUntil:'load' });
    await page.waitForFunction("document.getElementById('shot-info').textContent.length > 0", { timeout:15000 });
    console.log(mode, await page.$eval('#shot-info', el=>el.textContent));
    await new Promise(r=>setTimeout(r,150));
    await page.screenshot({ path:'screenshots/'+name, type:'jpeg', quality:92 });
  }
  console.log('errors:', errs.length?errs:'none');
  await browser.close(); srv.close();
})().catch(e=>{console.error(e);process.exit(1);});
