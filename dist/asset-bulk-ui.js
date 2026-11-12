/* Import from an asset list. Only mapped, validated records are stored in drafts. */
(() => {
  'use strict';

  const Bulk = AssetBulkCore, UI = EvalUI, C = EvaluationCore, h = esc;
  const flowTypes = { Agent: 'AGENT', 模型: 'MODEL', 非Agent应用: 'APPLICATION' };
  const button = (text, action, value = '', primary = false) =>
    `<button type="button" class="btn${primary ? ' primary' : ''}" data-ab="${action}" data-value="${h(value)}">${text}</button>`;
  const option = (value, label, selected) =>
    `<option value="${h(value)}"${String(value) === String(selected) ? ' selected' : ''}>${h(label)}</option>`;

  let batch;
  function currentBatch() {
    const kind = Object.hasOwn(Bulk.types, S.assetType) ? S.assetType : 'dataset';
    if (batch?.kind !== kind) {
      const pasted = kind === 'dataset' ? S.v2.import?.raw || '' : '';
      batch = { kind, mode: pasted ? 'paste' : 'file', name: '', pasted, datasetRef: '', busy: false };
    }
    return batch;
  }

  function guide(kind, spec) {
    const rows = [
      ['asset_type', '模板保留此列', '填写 ' + kind + '。已有文件缺少此列时，以当前资产页面选择的类型导入。'],
      ...spec.fields.map(field => [h(field.label), field.required ? '必填' : '可选', h(field.help)])
    ];
    return section('导入模板与说明', `<div class="pad stack"><p>${h(spec.result)}</p>
      <div class="flex wrap">${button('下载 CSV 模板', 'template', 'csv')}${button('下载 JSON 模板', 'template', 'json')}</div>
      <details><summary>查看字段说明</summary>${table(['字段', '填写要求', '怎么填写'], rows)}</details></div>`);
  }

  function page() {
    const state = currentBatch();
    const type = Bulk.types[state.kind], spec = Bulk.spec(state.kind);
    const returnButton = label => window.NavigationUI?.importReturnButton(state.kind, label) || btn(label, 'asset-type', state.kind);
    const routes = returnButton('返回' + type) +
      (state.kind === 'case' ? btn('含环境标签的工作簿', 'go', 'flow-import') : '');
    return head('批量导入 · ' + h(type), '本批导入类型为「' + h(type) + '」。先核对字段和记录，再保存草稿。', routes) +
      (state.error ? `<div class="notice warn" role="alert">${h(state.error)}</div>` : '') +
      (state.receipt ? `<div class="notice success" role="status">${h(state.receipt)} ${returnButton('查看资产列表')}</div>` : '') +
      guide(state.kind, spec) +
      section('选择来源', `<div class="pad stack">
        <div class="flex wrap">${button('上传文件', 'mode', 'file', state.mode === 'file')}${button('粘贴表格或 JSON', 'mode', 'paste', state.mode === 'paste')}</div>
        ${state.mode === 'file' ? `<label class="field">上传 Excel、CSV、TSV、JSON 或 JSONL
          <input class="input" type="file" data-ab-file accept=".xlsx,.csv,.tsv,.json,.jsonl"${state.busy ? ' disabled' : ''}></label>`
        : `<label class="field">粘贴内容<textarea class="input" rows="6" data-ab-field="pasted" placeholder="第一行为列名。可粘贴 Excel、飞书表格或 JSON。">${h(state.pasted)}</textarea></label>
          <div>${button('读取粘贴内容', 'paste', '', true)}</div>`}
        ${state.label ? `<p class="small muted">已读取 ${h(state.label)}</p>` : ''}
      </div>`) +
      (state.rows ? mappingSection(state, spec) : '') +
      (state.preview ? previewSection(state, spec) : '');
  }

  function mappingSection(state, spec) {
    const header = state.rows.find(row => row.number === state.header);
    const headers = header?.values || [];
    const columns = headers.flatMap((value, index) => {
      const label = Bulk.asText(value);
      return label && !Bulk.typeHeaders.includes(label.toLowerCase()) ? [{ index, label }] : [];
    });
    const sheetControls = state.book ? `<div class="pz-fields">
      <label class="field">工作表<select class="input" data-ab-field="sheet">${state.book.names.map(name => option(name, name, state.sheet)).join('')}</select></label>
      <label class="field">表头行<select class="input" data-ab-field="header">${state.rows.slice(0, 40).map(row => option(row.number, '第 ' + row.number + ' 行', state.header)).join('')}</select></label>
    </div>` : '';
    const collectionControls = spec.collection ? `<label class="field">${spec.nameLabel}
      <input class="input" data-ab-field="name" value="${h(state.name)}" required></label>` : '';
    const referenceControl = state.kind === 'reference' ? `<label class="field">对应数据集版本
      <select class="input" data-ab-field="datasetRef">${option('', '稍后在草稿关联', state.datasetRef)}${UI.core.list().filter(asset =>
      asset.kind === 'dataset' && asset.contentSet?.member_kind !== 'case'
    ).map(asset => option(C.key(asset), asset.name + ' · ' + C.key(asset), state.datasetRef)).join('')}</select></label>` : '';
    const mappings = spec.fields.map(field => `<label class="field">${h(field.label)}${field.required ? ' *' : ''}
      <select class="input" data-ab-map="${h(field.key)}">
        ${option(-1, '不导入此字段', state.mapping[field.key])}${columns.map(column =>
          option(column.index, column.label, state.mapping[field.key])
        ).join('')}
      </select></label>`);
    return section('核对字段映射', `<div class="pad stack">${sheetControls}${collectionControls}${referenceControl}
      <div class="pz-fields">${mappings.join('')}</div><div>${button('预览并检查', 'preview', '', true)}</div>
    </div>`);
  }

  function previewSection(state, spec) {
    const result = state.preview;
    const rows = result.rows.slice(0, 8).map(record => {
      const fields = Object.entries(record.values).filter(([key]) => !['external_id', 'sample_id', 'case_id'].includes(key));
      const summary = fields.map(([key, value]) => [spec.fields.find(field => field.key === key).label, Bulk.asText(value)])
        .filter(([, value]) => value !== '').map(([label, value]) => h(label) + ' ' + h(value.slice(0, 100)) + (value.length > 100 ? '…' : ''));
      return [h(record.row), h(record.id), summary.join('<br>')];
    });
    const destination = spec.collection ? (state.name.trim() || '待填写名称') + ' · 1 份草稿' : result.rows.length + ' 条草稿';
    return section('核对导入结果', `<div class="pad stack">
      <div class="notice ${result.errors.length ? 'warn' : 'success'}" role="status">${h(Bulk.types[state.kind])} · 有效 ${result.rows.length} 条 · 隔离 ${result.errors.length} 条${result.rows.length ? ' · <span data-ab-destination>' + h(destination) + '</span>' : ''}</div>
      ${rows.length ? table(['记录位置', '编号或名称', '将保存的内容'], rows) : '<p>请修正文件或映射后重新预览。</p>'}
      ${result.rows.length > rows.length ? `<p class="small muted">显示前 ${rows.length} 条有效记录。</p>` : ''}
      ${result.errors.length ? `<details open><summary>查看隔离记录</summary>${table(['记录位置', '编号或名称', '原因'], result.errors.map(record => [
        h(record.row), h(record.id), h(record.reasons.join('、'))
      ]))}</details>` : ''}
      ${result.unused.length ? `<p class="small muted">本批未使用的列 ${h(result.unused.join('、'))}</p>` : ''}
      ${result.rows.length && !state.busy ? button('保存有效记录为草稿', 'save', '', true) : ''}
    </div>`);
  }

  function loadRows(state, rows) {
    const hasValues = rows.some(row => row.values.some(value => Bulk.asText(value) !== ''));
    if (!hasValues && !state.book) throw Error('来源中没有可读记录。');
    const fields = Bulk.spec(state.kind).fields;
    const header = rows.slice(0, 40).find(row => {
      const mapping = Bulk.autoMap(fields, row.values);
      return fields.every(field => !field.required || mapping[field.key] >= 0);
    }) || rows[0];
    state.rows = rows;
    if (!header) {
      Object.assign(state, { header: null, mapping: {}, preview: null });
      return;
    }
    setHeader(state, header.number);
  }

  function setHeader(state, number) {
    state.header = number;
    state.mapping = Bulk.autoMap(Bulk.spec(state.kind).fields, state.rows.find(row => row.number === number).values);
    state.preview = null;
  }

  function inspect(state) {
    const result = Bulk.inspect(state.kind, state.rows, state.header, state.mapping);
    if (state.kind === 'reference' && state.datasetRef) {
      const dataset = UI.core.find(state.datasetRef);
      if (!dataset || C.key(dataset) !== state.datasetRef || dataset.kind !== 'dataset') throw Error('请选择有效的数据集版本。');
      const members = new Set((dataset.contentSet?.members || []).map(String));
      if (members.size) {
        result.rows = result.rows.filter(record => {
          if (members.has(record.id)) return true;
          result.errors.push({ row: record.row, id: record.id, reasons: ['所选数据集版本没有此样本编号'] });
          return false;
        });
      }
    }
    return result;
  }

  function clearSource(state) {
    Object.assign(state, { rows: null, preview: null, label: '', book: null, sheet: '', error: '', receipt: '' });
  }

  function collectionSpec(state, records) {
    const dataset = state.kind === 'dataset';
    const data = JSON.stringify(records.map(record => ({ ...record.values, sample_id: record.id })), null, 2);
    const [content, link, rules] = assetEntrySchemas[state.kind].map(([label]) => label);
    const fields = dataset
      ? { [content]: data, [link]: '样本编号、输入与可选分组。', [rules]: '本批检查了编号唯一性与必填字段，分组策略可在草稿补充。' }
      : { [content]: data, [link]: state.datasetRef ? '按样本编号关联 ' + state.datasetRef : '按样本编号关联，待补数据集版本。',
        [rules]: '参考依据记录在各样本行。供评分或授权复核。' };
    return {
      name: state.name.trim(),
      source: state.label,
      count: records.length + ' 条',
      assetSpec: { fields },
      contentSet: dataset ? { member_kind: 'sample', members: records.map(record => record.id) } : undefined,
      references: state.datasetRef ? [state.datasetRef] : []
    };
  }

  async function fingerprint(parts) {
    const bytes = new TextEncoder().encode(JSON.stringify(parts));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function saveDrafts(state) {
    if (!guard('engineer')) return;
    const { kind, label, sheet, name, datasetRef } = state;
    const result = inspect(state);
    if (!result.rows.length) throw Error('请先确认至少一条有效记录。');
    const collection = Bulk.spec(kind).collection;
    if (collection && !name.trim()) throw Error('请填写' + Bulk.spec(kind).nameLabel + '。');
    const groups = collection ? [result.rows] : result.rows.map(record => [record]);
    const entries = await Promise.all(groups.map(async records => ({
      records,
      key: await fingerprint([kind, collection ? name.trim() : '', kind === 'reference' ? datasetRef : '', records.map(record => record.values)])
    })));
    const origin = { source: label, sheet: sheet || '', importedAt: new Date().toISOString() };
    const created = kind === 'case' ? saveCases(entries, origin) : saveAssets({ kind, label, name, datasetRef }, entries, origin);
    const skipped = entries.length - created;
    const unit = collection ? ' 份' : ' 条';
    state.receipt = Bulk.types[kind] + '草稿已保存 ' + created + unit + (skipped ? '，已跳过 ' + skipped + unit + '相同内容。' : '。');
    state.preview = null;
  }

  function saveCases(entries, origin) {
    const plaza = PlazaReview.state(), flow = EvaluationFlow.init(plaza);
    const existing = new Set(flow.cases.map(item => item.bulkImport?.key));
    const before = flow.cases.length;
    try {
      for (const { key, records: [record] } of entries) {
        if (existing.has(key)) continue;
        const values = record.values;
        const draft = EvaluationFlow.draft(flow, { name: Bulk.asText(values.name), type: flowTypes[values.object_type],
          description: Bulk.asText(values.steps) });
        draft.input = Bulk.asText(values.input);
        draft.initial = Bulk.asText(values.precondition);
        draft.source = Bulk.asText(values.source) || origin.source + ' · 记录 ' + record.row;
        draft.bulkImport = { ...origin, key, id: record.id, row: record.row, expected: Bulk.asText(values.expected) };
        existing.add(key);
      }
      PlazaReview.persist({ checkConflict: true });
    } catch (error) {
      flow.cases.splice(before);
      throw error;
    }
    return flow.cases.length - before;
  }

  function saveAssets(state, entries, origin) {
    const { kind } = state, core = UI.core;
    const existing = new Set(core.list().filter(asset => asset.kind === kind).map(asset => asset.config?.bulkImport?.key));
    const added = [];
    try {
      for (const { key, records } of entries) {
        if (existing.has(key)) continue;
        const row = records[0], values = row.values;
        const { references, ...data } = Bulk.spec(kind).collection ? collectionSpec(state, records) : {
          name: Bulk.asText(values.name),
          source: Bulk.asText(values.source) || origin.source + ' · 记录 ' + row.row,
          targets: values.object_type ? [values.object_type] : [],
          assetSpec: { fields: Object.fromEntries(assetEntrySchemas[kind].map(([label]) => [label, Bulk.asText(values[label])])) }
        };
        const group = assetGroups.findIndex(group => group.types.some(([assetKind]) => assetKind === kind));
        const asset = core.adopt({ ...data, id: core.id('AS-IMPORT'), version: 'r1', kind, group, type: Bulk.types[kind],
          targets: data.targets || [], governanceDomain: ['dataset', 'reference'].includes(kind) ? '开发' : undefined,
          config: { references, bulkImport: { ...origin, key, records: records.map(record => ({ row: record.row, id: record.id })) } }
        });
        added.push(C.key(asset));
        existing.add(key);
      }
      if (!UI.commit()) throw Error('资产列表已在其他窗口更新，请刷新后重试。');
    } catch (error) {
      for (const key of added) delete core.db.assets[key];
      S.customAssets = core.list().filter(asset => !assets.some(seed => C.key(seed) === C.key(asset)));
      throw error;
    }
    return added.length;
  }

  function downloadTemplate(kind, format) {
    const mime = format === 'json' ? 'application/json' : 'text/csv;charset=utf-8';
    const url = URL.createObjectURL(new Blob([Bulk.template(kind, format)], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = Bulk.types[kind].replace(/[\\/]/g, '') + '-批量导入模板.' + format;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function repaint(state) {
    if (S.route === 'import' && state === batch) render();
  }

  document.addEventListener('click', async event => {
    const control = event.target.closest('[data-ab]');
    if (!control || S.route !== 'import') return;
    const state = currentBatch(), { ab: action, value } = control.dataset;
    if (state.busy) return;
    state.error = '';
    try {
      switch (action) {
        case 'mode':
          if (state.mode !== value) {
            clearSource(state);
            state.mode = value;
          }
          break;
        case 'template': downloadTemplate(state.kind, value); return;
        case 'paste':
          clearSource(state);
          if (new Blob([state.pasted]).size > 2 * 1024 * 1024) throw Error('粘贴内容上限为 2 MB。');
          loadRows(state, Bulk.textRows(state.pasted));
          state.label = '粘贴导入';
          break;
        case 'preview': state.preview = inspect(state); break;
        case 'save':
          state.busy = true;
          repaint(state);
          try { await saveDrafts(state); } finally { state.busy = false; }
          break;
      }
    } catch (error) {
      state.error = error.name === 'QuotaExceededError' ? '浏览器存储空间不足，请缩小本批次后重试。' : error.message;
    }
    repaint(state);
  });

  document.addEventListener('input', event => {
    if (S.route !== 'import') return;
    const state = currentBatch(), key = event.target.dataset.abField;
    if (state.busy) return;
    if (key === 'name' || key === 'pasted') state[key] = event.target.value;
    if (key === 'name') {
      const destination = document.querySelector('[data-ab-destination]');
      if (destination) destination.textContent = (state.name.trim() || '待填写名称') + ' · 1 份草稿';
    }
    if (key === 'pasted' && state.rows) {
      clearSource(state);
      document.querySelector('[data-ab="preview"]')?.setAttribute('disabled', '');
      document.querySelector('[data-ab="save"]')?.setAttribute('disabled', '');
    }
  });

  document.addEventListener('change', async event => {
    if (S.route !== 'import') return;
    const state = currentBatch(), input = event.target;
    if (input.dataset.abMap === undefined && input.dataset.abField === undefined && input.dataset.abFile === undefined) return;
    if (state.busy) return;
    state.error = '';
    try {
      if (input.dataset.abMap !== undefined) {
        state.mapping[input.dataset.abMap] = Number(input.value);
        state.preview = null;
      } else if (input.dataset.abField === 'sheet') {
        state.sheet = input.value;
        Object.assign(state, { rows: [], header: null, mapping: {}, preview: null });
        loadRows(state, state.book.read(state.sheet));
      } else if (input.dataset.abField === 'header') {
        setHeader(state, Number(input.value));
      } else if (input.dataset.abField === 'datasetRef') {
        state.datasetRef = input.value;
        state.preview = null;
      } else if (input.dataset.abFile !== undefined && input.files?.length) {
        clearSource(state);
        const file = input.files[0];
        state.busy = true;
        repaint(state);
        try {
          if (file.size > 2 * 1024 * 1024) throw Error('单个文件上限为 2 MB。');
          if (/\.xlsx$/i.test(file.name)) {
            const book = await CaseFileImport.openWorkbook(await file.arrayBuffer());
            if (!book.names.length) throw Error('工作簿没有可用工作表。');
            state.book = book;
            state.sheet = book.names[0];
            state.rows = [];
            state.label = file.name;
            loadRows(state, book.read(state.sheet));
          } else if (/\.(csv|tsv|json|jsonl)$/i.test(file.name)) {
            loadRows(state, Bulk.textRows(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())));
            state.label = file.name;
          } else throw Error('请选择 XLSX、CSV、TSV、JSON 或 JSONL 文件。');
          if (!state.name.trim()) state.name = file.name.replace(/\.[^.]+$/, '');
        } finally { state.busy = false; }
      } else return;
    } catch (error) {
      state.error = error.message;
    }
    repaint(state);
  });

  window.AssetBulkUI = {
    caseMeta(caseDraft) {
      const item = caseDraft.bulkImport;
      if (!item) return '';
      const { panel, kv } = PlazaReview.helpers;
      return panel('批量导入记录', kv([
        ['来源编号', h(item.id)], ['文件与记录', h([item.source, item.sheet, item.row].filter(Boolean).join(' · '))],
        ['原表预期', h(item.expected || '待补齐')]
      ]));
    }
  };
  pages.import = page;
  if (S.route === 'import') render();
})();
