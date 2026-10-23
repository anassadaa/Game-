import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const types = {
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

export async function packageCloudflare(inputDirectory, outputDirectory) {
  const root = resolve(inputDirectory),
    output = resolve(outputDirectory);
  const localFile = (url, from = root) => {
    if (/^(https?:|data:|\/\/)/i.test(url))
      throw new Error(`External asset cannot be packaged: ${url}`);
    const path = resolve(
      url.startsWith('/') ? root : from,
      url.startsWith('/') ? `.${url}` : url,
    );
    if (!path.startsWith(root + sep))
      throw new Error('Asset path leaves the build directory');
    return path;
  };
  let html = await readFile(resolve(root, 'index.html'), 'utf8');
  for (const match of [...html.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*>/g)]) {
    if (!/rel="stylesheet"/.test(match[0])) continue;
    const cssPath = localFile(match[1]);
    let css = await readFile(cssPath, 'utf8');
    for (const asset of [
      ...css.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g),
    ]) {
      if (asset[1].startsWith('data:')) continue;
      const path = localFile(asset[1], dirname(cssPath));
      const mime = types[extname(path)];
      if (!mime) throw new Error(`Unsupported inline asset: ${path}`);
      const data = await readFile(path);
      css = css.replace(
        asset[0],
        () => `url("data:${mime};base64,${data.toString('base64')}")`,
      );
    }
    html = html.replace(
      match[0],
      () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`,
    );
  }
  for (const match of [
    ...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g),
  ]) {
    const js = await readFile(localFile(match[1]), 'utf8');
    html = html.replace(
      match[0],
      () =>
        `<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>`,
    );
  }
  if (/(?:src|href)="\/assets\//.test(html))
    throw new Error('The build still has external asset references');
  const statics = {};
  for (const [name, mime] of [['manifest.webmanifest','application/manifest+json'],['sw.js','text/javascript; charset=utf-8'],['icon-192.png','image/png'],['icon-512.png','image/png'],['icon-maskable-512.png','image/png']]) {
    try { statics['/' + name] = [mime, (await readFile(resolve(root, name))).toString('base64')]; } catch { /* optional */ }
  }
  const release = createHash('sha256').update(html).digest('hex').slice(0, 20);
  const worker = `const HTML=${JSON.stringify(html)};\nconst RELEASE=${JSON.stringify(release)};\nconst STATIC=${JSON.stringify(statics)};\nexport default {async fetch(request){
    const pathname=new URL(request.url).pathname;
    if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    if(pathname==='/health')return Response.json({app:'touchline',release:RELEASE});
    if(STATIC[pathname]){const [t,b]=STATIC[pathname];const bin=Uint8Array.from(atob(b),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bin,{headers:{'Content-Type':t,'Cache-Control':pathname==='/sw.js'?'no-cache':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});}
    if(!['/','/index.html'].includes(pathname))return new Response('Not found',{status:404});
    const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','ETag':'"'+RELEASE+'"','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
    if(request.headers.get('if-none-match')===headers.ETag)return new Response(null,{status:304,headers});
    return new Response(request.method==='HEAD'?null:HTML,{headers});
  }};\n`;
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'index.html'), html);
  await writeFile(resolve(output, '_worker.js'), worker);
  return {
    release,
    htmlBytes: Buffer.byteLength(html),
    workerBytes: Buffer.byteLength(worker),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(
    JSON.stringify(
      await packageCloudflare(
        process.argv[2] ?? 'dist',
        process.argv[3] ?? 'cloudflare-dist',
      ),
    ),
  );
}
