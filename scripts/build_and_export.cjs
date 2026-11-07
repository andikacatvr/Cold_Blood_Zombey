const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 1. Static file server
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/builder.html';
  const filePath = path.join(__dirname, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found: ' + reqPath);
  }
});

server.listen(8999, async () => {
  console.log('Static server listening on http://127.0.0.1:8999');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = exec(`"${chromePath}" --headless --remote-debugging-port=9288 --disable-gpu --window-size=1280,720 "http://127.0.0.1:8999/builder.html"`);

  await new Promise(r => setTimeout(r, 2000));

  http.get('http://127.0.0.1:9288/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', async () => {
      const list = JSON.parse(data);
      const page = list.find(p => p.type === 'page' && p.url.includes('8999'));
      if (!page) {
        console.error('Page not found in Chrome CDP!');
        proc.kill();
        server.close();
        process.exit(1);
      }

      const ws = new WebSocket(page.webSocketDebuggerUrl);
      let id = 1;
      function send(method, params = {}) {
        return new Promise(resolve => {
          const reqId = id++;
          const handler = (event) => {
            const resp = JSON.parse(event.data);
            if (resp.id === reqId) {
              ws.removeEventListener('message', handler);
              resolve(resp.result);
            }
          };
          ws.addEventListener('message', handler);
          ws.send(JSON.stringify({ id: reqId, method, params }));
        });
      }

      ws.addEventListener('open', async () => {
        await send('Runtime.enable');
        await send('Console.enable');

        console.log('Connected to CDP. Waiting for GLB export...');

        let attempts = 0;
        let exportedBase64 = null;

        while (attempts < 30) {
          await new Promise(r => setTimeout(r, 1000));
          attempts++;

          const check = await send('Runtime.evaluate', {
            expression: 'window.__EXPORTED_GLB_BASE64 || null'
          });

          if (check && check.result && check.result.value) {
            exportedBase64 = check.result.value;
            console.log(`GLB generated successfully after ${attempts}s!`);
            break;
          }

          const statusCheck = await send('Runtime.evaluate', {
            expression: 'document.getElementById("status") ? document.getElementById("status").innerText : "no status"'
          });
          console.log(`[Status ${attempts}s]:`, statusCheck && statusCheck.result ? statusCheck.result.value : '');
        }

        if (exportedBase64) {
          const glbBuffer = Buffer.from(exportedBase64, 'base64');
          console.log(`Exported GLB Buffer size: ${glbBuffer.length} bytes`);

          // Ensure directory exists
          if (!fs.existsSync('public/models')) {
            fs.mkdirSync('public/models', { recursive: true });
          }

          fs.writeFileSync('lady_mithrill.glb', glbBuffer);
          fs.writeFileSync('public/models/lady_mithrill.glb', glbBuffer);
          console.log('Successfully saved lady_mithrill.glb and public/models/lady_mithrill.glb!');
        } else {
          console.error('Failed to export GLB within timeout.');
        }

        ws.close();
        proc.kill();
        server.close();
        process.exit(exportedBase64 ? 0 : 1);
      });
    });
  });
});

