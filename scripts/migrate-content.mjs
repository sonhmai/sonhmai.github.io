import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parse, stringify } from 'yaml';
const matter = raw => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match ? { data: parse(match[1]), content: raw.slice(match[0].length) } : { data: {}, content: raw };
};
matter.stringify = (body, data) => `---\n${stringify(data)}---\n${body}`;

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data); };
const copy = (source, target) => { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); };
const contentDirs = ['_posts', '_pages', '_papers', '_publications', '_portfolio', '_talks', '_teaching', '_drafts'];
const sources = contentDirs.flatMap(walk).filter(file => /\.(md|html|markdown)$/.test(file));
const inventory = [];
const routes = {};
const redirects = { '/software/': '/writing/', '/year-archive/': '/writing/', '/posts/': '/writing/', '/wordpress/blog-posts/': '/writing/', '/feed.xml': '/rss.xml', '/about.html': '/about/' };
const archives = [];
for (const source of sources) {
  const raw = fs.readFileSync(source, 'utf8');
  const { data, content } = matter(raw);
  const isPost = source.startsWith('_posts/');
  const isPaper = source.startsWith('_papers/');
  let url = data.permalink;
  if (!url && isPost) url = `/${path.basename(source, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '')}/`;
  if (!url && /^_(portfolio|talks|teaching)\//.test(source)) url = `/${source.split('/')[0].slice(1)}/${path.basename(source).replace(/\.[^.]+$/, '')}/`;
  if (isPost || isPaper) {
    const id = isPaper ? path.basename(path.dirname(source)).replaceAll('_','-') : path.basename(source,'.md').replace(/^\d{4}-\d{2}-\d{2}-/,'').toLowerCase();
    if (isPaper) url = `/papers/${id}/`;
    const title = data.title || content.match(/^# (.+)$/m)?.[1];
    if (!title) throw new Error(`Missing title in ${source}`);
    const savedAt = execFileSync('git', ['log','-1','--format=%aI','--',source], { encoding:'utf8' }).trim();
    const date = data.date ? new Date(data.date).toISOString() : new Date(savedAt).toISOString();
    let body = content;
    const rewrites = [];
    const rewrite = (from,to) => { if(body.includes(from)) { body=body.replaceAll(from,to); rewrites.push({from,to}); } };
    if(isPost) rewrite('](SparkCRC/', '](/SparkCRC/');
    if(source.endsWith('TwoPhaseCommit.md')) {
      for (const name of ['img.png','img_1.png','img_2.png','img_3.png','img_4.png']) {
        rewrite(`![${name}](${name})`, `<figure class="missing-figure"><figcaption>Figure unavailable in the original source: ${name}</figcaption></figure>`);
      }
    }
    if(isPaper) {
      for(const asset of walk(path.dirname(source)).filter(file => !file.endsWith('.md'))) {
        const name=path.basename(asset);
        rewrite(`./${name}`, `/papers-assets/${path.basename(path.dirname(source))}/${name}`);
        rewrite(`](${name})`, `](/papers-assets/${path.basename(path.dirname(source))}/${name})`);
      }
      rewrite('[!img](./building_s3_running_time_txns.png)', '![Transaction running time](/papers-assets/building_db_on_s3/table3_building_s3_running_time_txns.png)');
    }
    const front = { title, pubDatetime: date, description: isPaper ? `Reading notes on ${title.replace(/^# /,'')}.` : `Notes on ${title}.`, tags: data.tags || [isPaper ? 'paper-notes' : 'software'], canonicalURL: `https://sonhmai.github.io${url}`, ...(isPaper ? { note: true } : {}) };
    const target = `src/content/posts/${id}.md`;
    write(target, matter.stringify(body,front));
    routes[id]=url;
    redirects[`/posts/${id}/`]=url;
    inventory.push({source,target,url,kind:isPaper?'paper-note':'article',sha256:hash(source),rewrites,dateBasis:isPaper?'Last source commit timestamp, not publication date':'Original front matter'});
  } else {
    const target=`public/legacy/${source}.txt`;
    if (!source.startsWith('_drafts/')) copy(source,target);
    if(url && !['/','/404.html','/about/','/tags/','/software/','/year-archive/','/sitemap/'].includes(url)) archives.push({url,title:data.title || path.basename(source),source:`/legacy/${source}.txt`});
    for(const alias of [data.redirect_from].flat().filter(Boolean)) {
      if(alias !== '/about/') redirects[alias] = url === '/' ? '/about/' : url;
    }
    inventory.push({source,url:url||null,kind:source.startsWith('_drafts/')?'draft':'legacy-page',sha256:hash(source),target:source.startsWith('_drafts/') ? source : target});
  }
}
const assetDirs=['images','files','assets','talkmap','_papers','_posts'];
const assets=assetDirs.flatMap(walk).filter(file => !/\.(md|markdown|html)$/.test(file) || file.startsWith('talkmap/')).map(source=>{
  const url = source.startsWith('_papers/') ? `/papers-assets/${source.slice(8)}` : source.startsWith('_posts/') ? `/${source.slice(7)}` : `/${source}`;
  copy(source,`public${url}`);
  return {source,url,sha256:hash(source)};
});
write('src/data/post-routes.json',JSON.stringify(routes,null,2)+'\n');
write('src/data/legacy-pages.json',JSON.stringify(archives,null,2)+'\n');
write('src/data/redirects.json',JSON.stringify(redirects,null,2)+'\n');
write('docs/migration-inventory.json',JSON.stringify({baseline:'7a1cd79',themeRevision:'35cfa7fbe0b897306d27670d3819e55d5205f3dd',content:inventory,assets,knownMissingImages:['/TwoPhaseCommit/img.png','/TwoPhaseCommit/img_1.png','/TwoPhaseCommit/img_2.png','/TwoPhaseCommit/img_3.png','/TwoPhaseCommit/img_4.png']},null,2)+'\n');
console.log(`Inventoried ${inventory.length} content files and ${assets.length} assets. Migrated ${Object.keys(routes).length} articles and notes.`);
