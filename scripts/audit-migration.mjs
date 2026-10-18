import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const inventory = JSON.parse(fs.readFileSync('docs/migration-inventory.json','utf8'));
const redirects = JSON.parse(fs.readFileSync('src/data/redirects.json','utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const outputFile = url => {
  const clean = decodeURIComponent(url).replace(/^\//,'');
  return [`dist/${clean}`,`dist/${clean.replace(/\/$/,'')}/index.html`].find(file => fs.existsSync(file) && fs.statSync(file).isFile());
};
const body = raw => raw.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,'');
for(const item of inventory.content) {
  assert.equal(digest(fs.readFileSync(item.source)), item.sha256,`Original source changed: ${item.source}`);
  assert.equal(digest(execFileSync('git',['show',`${inventory.baseline}:${item.source}`])),item.sha256,`Baseline mismatch: ${item.source}`);
  if(item.kind==='article'||item.kind==='paper-note') {
    let expected=body(fs.readFileSync(item.source,'utf8'));
    for(const change of item.rewrites) expected=expected.replaceAll(change.from,change.to);
    assert.equal(body(fs.readFileSync(item.target,'utf8')).trim(),expected.trim(),`Article content changed: ${item.source}`);
    const html=fs.readFileSync(outputFile(item.url),'utf8');
    assert(html.includes('data-pagefind-body'),`Article not indexed: ${item.url}`);
    assert(html.includes(`https://sonhmai.github.io${item.url}`),`Canonical missing: ${item.url}`);
  } else if(item.kind!=='draft') {
    assert.equal(digest(fs.readFileSync(item.target)),item.sha256,`Archived content changed: ${item.source}`);
  }
  if(item.url) assert(outputFile(item.url),`Missing published URL: ${item.url}`);
}
for(const item of inventory.assets) {
  assert.equal(digest(fs.readFileSync(item.source)),item.sha256,`Source asset changed: ${item.source}`);
  assert.equal(digest(fs.readFileSync(outputFile(item.url))),item.sha256,`Asset changed: ${item.url}`);
}
for(const [from,to] of Object.entries(redirects)) {
  const file=outputFile(from);
  assert(file,`Missing redirect: ${from}`);
  if (from === '/feed.xml') assert.equal(fs.readFileSync(file,'utf8'), fs.readFileSync('dist/rss.xml','utf8'), 'Feed alias changed');
  else assert(fs.readFileSync(file,'utf8').includes(to),`Wrong redirect: ${from}`);
  if (/\.(html|xml)$/.test(from)) assert(fs.statSync(`dist${from}`).isFile(), `File URL became a directory: ${from}`);
  assert(outputFile(to),`Missing redirect target: ${to}`);
}
assert.equal(fs.readFileSync('dist/sitemap.xml','utf8'),fs.readFileSync('dist/sitemap-index.xml','utf8'),'Old sitemap URL missing');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(`${dir}/${entry.name}`):[`${dir}/${entry.name}`]);
const htmlFiles=walk('dist').filter(file=>file.endsWith('.html')&&!file.startsWith('dist/legacy/')&&!file.startsWith('dist/talkmap/'));
for(const file of htmlFiles) {
  const html=fs.readFileSync(file,'utf8');
  assert(!/google-analytics.com|GoogleAnalyticsObject|UA-\d+/.test(html),`Obsolete analytics: ${file}`);
  for(const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)) {
    assert(outputFile(match[1]),`Broken internal link ${match[1]} in ${file}`);
  }
}
assert(!fs.existsSync('dist/legacy/_drafts'), 'Drafts must remain unpublished');
console.log(`Verified ${inventory.content.length} content sources, ${inventory.assets.length} assets, ${Object.keys(redirects).length} redirects, and ${htmlFiles.length} HTML pages.`);
