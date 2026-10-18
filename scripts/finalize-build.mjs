import fs from 'node:fs';
import path from 'node:path';
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(`${dir}/${entry.name}`):[`${dir}/${entry.name}`]);
for (const file of walk('dist').filter(file => /\.(html|xml)\/index\.html$/.test(file))) {
  const target = path.dirname(file);
  const html = fs.readFileSync(file, 'utf8');
  fs.rmSync(target, { recursive: true });
  fs.writeFileSync(target, html.replaceAll(`${target.slice(4)}/`, target.slice(4)));
}
fs.copyFileSync('dist/rss.xml', 'dist/feed.xml');
fs.copyFileSync('dist/sitemap-index.xml', 'dist/sitemap.xml');
for(const file of walk('dist').filter(file=> /sitemap.*\.xml$/.test(file))) {
  fs.writeFileSync(file, fs.readFileSync(file,'utf8').replaceAll('.html/','.html'));
}
