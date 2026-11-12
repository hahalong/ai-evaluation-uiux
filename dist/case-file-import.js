/* Local file parsing only; no uploads or network calls. */
(function(root){
function objects(rows){if(!Array.isArray(rows)||rows.some(r=>!r||Array.isArray(r)||typeof r!=='object'))throw Error('每条用例必须是一个字段对象');if(rows.length>500)throw Error('交互稿每批最多500行');return{headers:[...new Set(rows.flatMap(Object.keys))],rows};}
function table(grid){if(!grid.length)return{headers:[],rows:[]};const headers=grid[0].map(x=>String(x??'').trim());if(headers.some(h=>!h)||new Set(headers).size!==headers.length)throw Error('表头不能为空或重复');const rows=grid.slice(1).filter(r=>r.some(v=>String(v??'').trim())).map((r,i)=>{if(r.length>headers.length)throw Error('第'+(i+2)+'行超出表头列数');return Object.fromEntries(headers.map((h,j)=>[h,r[j]??'']));});return objects(rows.length?rows:[]).rows.length?{headers,rows}: {headers,rows:[]};}
function parse(source){const text=String(source).replace(/^\uFEFF/,'');if(!text.trim())return{headers:[],rows:[]};if(text.trim().startsWith('['))return objects(JSON.parse(text));if(text.trim().startsWith('{')){try{const v=JSON.parse(text);return objects(v.cases||[v]);}catch(err){if(err.message==='每条用例必须是一个字段对象')throw err;return objects(text.split(/\r?\n/).filter(l=>l.trim()).map((l,i)=>{try{return JSON.parse(l);}catch{throw Error('JSONL第'+(i+1)+'行格式错误');}}));}}
const delimiter=text.split(/\r?\n/)[0].includes('\t')?'\t':',';let rows=[],row=[],value='',quoted=false;
for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v!==''))rows.push(row);row=[];value='';}else value+=c;}
if(quoted)throw Error('CSV引号未闭合');row.push(value);if(row.some(v=>v!==''))rows.push(row);if(!rows.length)return{headers:[],rows:[]};const n=rows[0].length;rows.slice(1).forEach((r,i)=>{if(r.length!==n)throw Error('第'+(i+2)+'行列数与表头不符');});return table(rows);}
async function unzip(buffer){const u=new Uint8Array(buffer),dv=new DataView(u.buffer,u.byteOffset,u.byteLength),decode=new TextDecoder();if(u.length>2*1024*1024)throw Error('交互稿单文件上限为2MB');let end=-1;for(let i=u.length-22;i>=Math.max(0,u.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){end=i;break;}if(end<0)throw Error('不是有效XLSX文件');const count=dv.getUint16(end+10,true);let off=dv.getUint32(end+16,true),sum=0;const result={};if(count>500)throw Error('工作簿资源数量过多');for(let i=0;i<count;i++){if(off+46>u.length||dv.getUint32(off,true)!==0x02014b50)throw Error('XLSX目录损坏');const flags=dv.getUint16(off+8,true),method=dv.getUint16(off+10,true),compressed=dv.getUint32(off+20,true),expanded=dv.getUint32(off+24,true),nameLen=dv.getUint16(off+28,true),extra=dv.getUint16(off+30,true),comment=dv.getUint16(off+32,true),local=dv.getUint32(off+42,true),name=decode.decode(u.slice(off+46,off+46+nameLen));off+=46+nameLen+extra+comment;if(flags&1)throw Error('不支持加密工作簿');sum+=expanded;if(sum>20*1024*1024)throw Error('工作簿展开超过20MB');if(local+30>u.length||dv.getUint32(local,true)!==0x04034b50)throw Error('XLSX文件结构损坏');const start=local+30+dv.getUint16(local+26,true)+dv.getUint16(local+28,true);if(start+compressed>u.length)throw Error('XLSX内容被截断');if(!/\.xml$|\.rels$/i.test(name))continue;if(name.includes('..'))throw Error('工作簿包含非法路径');let bytes=u.slice(start,start+compressed);if(method===8){if(typeof DecompressionStream==='undefined')throw Error('当前浏览器不支持XLSX解压，请使用CSV');const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();const chunks=[];let total=0;for(;;){const r=await reader.read();if(r.done)break;total+=r.value.length;if(total>expanded||total>20*1024*1024){await reader.cancel();throw Error('工作簿解压大小不一致');}chunks.push(r.value);}bytes=new Uint8Array(total);let n=0;for(const chunk of chunks){bytes.set(chunk,n);n+=chunk.length;}}else if(method!==0)throw Error('不支持此XLSX压缩格式');if(bytes.length!==expanded)throw Error('工作簿内容长度不一致');result[name]=decode.decode(bytes);}return result;}
function xml(text){if(!text||/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('工作簿XML内容无效');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('工作簿XML解析失败');return doc;}
const elements=(node,tag)=>[...node.getElementsByTagNameNS('*',tag)];
function column(address){const letters=(address||'').match(/^[A-Z]+/i)?.[0];if(!letters)throw Error('单元格缺少列标识');return [...letters.toUpperCase()].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;}
async function openWorkbook(buffer) {
  const files = await unzip(buffer);
  const workbook = xml(files['xl/workbook.xml']);
  const relationships = xml(files['xl/_rels/workbook.xml.rels']);
  const shared = files['xl/sharedStrings.xml'] ? elements(xml(files['xl/sharedStrings.xml']), 'si')
    .map(item => elements(item, 't').map(text => text.textContent).join('')) : [];
  const targets = new Map(elements(relationships, 'Relationship')
    .filter(rel => rel.getAttribute('TargetMode') !== 'External')
    .map(rel => [rel.getAttribute('Id'), rel.getAttribute('Target')]));
  const sheets = elements(workbook, 'sheet').flatMap(sheet => {
    const id = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sheet.getAttribute('r:id');
    const target = targets.get(id);
    if (!target) return [];
    const path = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    if (path.includes('..')) throw Error('工作表路径不受支持');
    return [{ name: sheet.getAttribute('name') || '工作表', path }];
  });
  return {
    names: sheets.map(sheet => sheet.name),
    read(name) {
      const sheet = sheets.find(item => item.name === name);
      if (!sheet) throw Error('请选择工作簿中的工作表');
      const rows = elements(xml(files[sheet.path]), 'row');
      if (rows.length > 501) throw Error('交互稿每张表最多500条用例');
      return rows.map((row, index) => {
        const values = [], formulas = [];
        for (const cell of elements(row, 'c')) {
          const i = column(cell.getAttribute('r'));
          if (i > 80) throw Error('工作表列数过多');
          const type = cell.getAttribute('t'), value = elements(cell, 'v')[0]?.textContent ?? '';
          if (elements(cell, 'f').length) formulas.push(i);
          values[i] = type === 's' ? (shared[Number(value)] ?? '') : type === 'inlineStr'
            ? elements(cell, 't').map(text => text.textContent).join('') : value;
        }
        return { number: Number(row.getAttribute('r')) || index + 1, values: Array.from(values, value => value ?? ''), formulas };
      });
    }
  };
}
async function xlsx(buffer) {
  const workbook = await openWorkbook(buffer);
  const sheets = workbook.names.flatMap(name => {
    const rows = workbook.read(name);
    if (rows.some(row => row.formulas.length)) throw Error('工作表含公式，请粘贴为值后导入，避免读取过期计算缓存');
    const result = table(rows.map(row => row.values));
    return result.rows.length ? [{ name, ...result }] : [];
  });
  if (!sheets.length) throw Error('没有找到包含表头和数据的工作表');
  return sheets;
}
const api={parse,table,unzip,xlsx,openWorkbook};root.CaseFileImport=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
