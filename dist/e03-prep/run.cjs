/* Run with Node.js. No packages or network dependencies. */
const fs = require('node:fs');
const path = require('node:path');
const {createHash}=require('node:crypto');

const dependencies=['../a84-v2-fixtures.js','../a84-metric-engine.js'];
const sources=['contract.js','adapter.js','executor.js','scorer.js','fixtures.js','suite.js','run.cjs'];
const sha = value=>createHash('sha256').update(value).digest('hex');
const files=Object.fromEntries([...dependencies,...sources].map(file=>[file,sha(fs.readFileSync(path.join(__dirname,file)))]));
const build={fingerprint:sha(JSON.stringify(files)),files};
const buildPath=path.join(__dirname,'build.js');
const buildSource='/* Built from the delivered source and fixtures. */\nglobalThis.E03PreparationBuild = '+JSON.stringify(build,null,2)+';\n';
if(process.argv.includes('--build')) fs.writeFileSync(buildPath,buildSource);
if(!fs.existsSync(buildPath) || fs.readFileSync(buildPath,'utf8')!==buildSource){
  console.error('制品摘要与交付记录不一致。请使用完整的固定版本包。');
  process.exit(1);
}
globalThis.window=globalThis;
for(const source of [...dependencies,'contract.js','adapter.js','executor.js','scorer.js','fixtures.js','build.js','suite.js']){
  require(path.join(__dirname,source));
}
const report=E03Preparation.verify();
for(const item of report.checks){
  console.log((item.ok?'PASS':'FAIL')+'  '+item.name+'  '+item.actual);
}
const outIndex=process.argv.indexOf('--out');
if(outIndex>=0){
  const dest=path.resolve(process.argv[outIndex+1]);
  fs.mkdirSync(dest,{recursive:true});
  const data={
    'e03-qualification.json':report,
    'samples.json':{caseId:'E03',source:'宠物出行 V2 第 153 行',rows:E03PreparationFixtures.samples},
    'independent-gold.json':E03PreparationFixtures.reference,
    'dispatch-TEMP-02.json':report.trace?.dispatch,
    'raw-TEMP-02.json':report.trace?.job.artifact?.raw,
    'evidence-TEMP-02.json':report.trace?.job.artifact?.evidence,
    'score-TEMP-02.json':report.trace?.score
  };
  for(const [name,value] of Object.entries(data)){
    if(value!==undefined) fs.writeFileSync(path.join(dest,name),JSON.stringify(value,null,2)+'\n');
  }
  console.log('联调报告 '+report.reportId+' → '+dest);
}
if(!report.ok)process.exitCode=1;
