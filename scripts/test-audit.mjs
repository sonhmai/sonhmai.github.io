import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const run = () => spawnSync(process.execPath,['scripts/audit-migration.mjs'],{encoding:'utf8'});
for (const [file,mutate,message] of [
  ['src/content/posts/twophasecommit.md', bytes=>Buffer.concat([bytes,Buffer.from('\nUnintended content change.\n')]),'Article content changed'],
  ['dist/files/paper1.pdf', bytes=>Buffer.concat([bytes,Buffer.from('changed')]),'Asset changed'],
  ['dist/about.html', bytes=>Buffer.from(bytes.toString().replaceAll('/about/','/missing/')),'Wrong redirect'],
]) {
  const original=fs.readFileSync(file);
  try {
    fs.writeFileSync(file,mutate(original));
    const result=run();
    assert.notEqual(result.status,0,`Audit missed mutation in ${file}`);
    assert(result.stderr.includes(message),`Unexpected failure for ${file}: ${result.stderr}`);
    console.log(`Detected ${message.toLowerCase()}.`);
  } finally { fs.writeFileSync(file,original); }
}
const clean=run();
assert.equal(clean.status,0,clean.stderr);
console.log(clean.stdout.trim());
