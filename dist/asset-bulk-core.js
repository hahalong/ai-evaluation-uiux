/* Field mapping and validation for batches with an explicitly selected asset type. */
(function (root) {
  'use strict';

  const types = Object.fromEntries(assetGroups.flatMap(group => group.types));
  const field = (key, label, help, required = false, aliases = []) => ({ key, label, help, required, aliases });
  const sampleId = field('sample_id', '样本编号', '输入与参考使用同一编号。编号在本批内唯一。', true, ['id', '样本ID', '样本编号']);
  const name = field('name', '名称', '用来在资产列表识别这条草稿。', true, ['资产名称', '用例名称', '测试用例', '标题']);
  const source = field('source', '来源与用途', '填写原记录、获准文件引用或使用目的。留空时记录本批来源。', false, ['来源']);
  const objectType = (required = false) => field('object_type', '对象类型', '可填 Agent、模型或非 Agent 应用。', required, ['对象类型', '适用对象']);
  const specs = {
    dataset: {
      collection: true, nameLabel: '数据集名称', unit: '样本',
      result: '同批有效行合成一个数据集草稿。参考答案在「参考与金标」按样本编号导入。',
      fields: [
        sampleId,
        field('input', '样本输入', '填写文本、结构化输入或获准材料的引用。', true, ['输入', '内容']),
        field('group_id', '分组编号', '同来源、会话或文档的样本可用同一个组编号。', false, ['group', '分组'])
      ]
    },
    reference: {
      collection: true, nameLabel: '参考集名称', unit: '参考',
      result: '同批有效行合成一个参考集草稿。选择对应的数据集版本，按样本编号关联。',
      fields: [
        sampleId,
        field('expected', '参考答案或金标', '填写期望结果、标注或获准参考文件的引用。', true, ['参考答案', '期望结果', '预期结果', 'gold', 'answer', 'reference']),
        field('evidence', '参考依据', '填写来源页码、独立状态记录或标注依据。', false, ['依据', '证据'])
      ]
    },
    case: {
      unit: '用例', result: '每条有效记录生成一条评测用例草稿。保存后可编辑执行步骤和判定规则。',
      fields: [
        field('case_id', '用例编号', '建议保留原表编号。留空时按用例名称识别。', false, ['id', 'external_id', '案例编号', '测试用例编号']),
        name, objectType(true),
        field('input', '输入', '填写场景输入或样本引用。', false, ['样本输入', '业务输入']),
        field('precondition', '前置条件', '填写开始执行前应满足的状态。', false, ['初始状态']),
        field('steps', '步骤', '填写要执行的动作、顺序和观察点。', false, ['测试步骤', '操作步骤', '业务说明', 'description']),
        field('expected', '预期结果', '记录期望行为，草稿中再确认实际判定规则。', false, ['期望结果', '预期']),
        source
      ]
    }
  };

  function spec(kind) {
    if (!Object.hasOwn(types, kind)) throw Error('请从资产列表选择导入类型。');
    if (specs[kind]) return specs[kind];
    const technical = ['executor', 'adapter', 'scorer', 'check'].includes(kind);
    return {
      unit: '资产',
      result: technical
        ? '每条有效记录生成一条能力描述草稿。正式使用前完成实现登记、适用性验证和发布。'
        : '每条有效记录生成一条资产草稿。在资产详情补齐版本引用、验证与发布。',
      fields: [
        field('external_id', '来源编号', '用于识别同批记录。留空时按资产名称识别。', false, ['id', '资产编号']),
        name, source, objectType(),
        ...assetEntrySchemas[kind].map(([label, help], index) => field(label, label, help, index === 0))
      ]
    };
  }

  const typeHeaders = ['asset_type', '资产类型'];
  const asText = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value).trim();
  const normalize = value => asText(value).toLowerCase();
  const objectTypes = new Map([
    ['agent', 'Agent'], ['智能体', 'Agent'], ['model', '模型'], ['模型', '模型'],
    ['application', '非Agent应用'], ['非agent应用', '非Agent应用'], ['非 agent 应用', '非Agent应用'], ['应用（非 agent）', '非Agent应用']
  ]);

  function autoMap(fields, headers) {
    return Object.fromEntries(fields.map(definition => {
      const names = [definition.key, definition.label, ...definition.aliases].map(normalize);
      return [definition.key, headers.findIndex(header => names.includes(normalize(header)))];
    }));
  }

  function inspect(kind, rows, headerNumber, mapping) {
    const definition = spec(kind);
    const header = rows.find(row => row.number === headerNumber);
    if (!header) throw Error('请选择表头行。');
    const headers = header.values.map(asText);
    const typeColumns = headers.flatMap((label, index) => typeHeaders.includes(normalize(label)) ? [index] : []);
    const dataRows = rows.filter(row => row.number > headerNumber);
    const matchesType = value => normalize(value) === kind || value === types[kind];
    const typeLabel = value => Object.hasOwn(types, normalize(value)) ? types[normalize(value)] : value;
    const declarations = [...new Set(dataRows.flatMap(row => typeColumns.map(index => asText(row.values[index])).filter(Boolean)))];
    if (declarations.length && !declarations.some(matchesType)) {
      throw Error('文件声明为「' + declarations.map(typeLabel).join('、') + '」，本批导入「' + types[kind] + '」。请到对应资产列表导入。');
    }
    const fields = definition.fields.filter(item => Number.isInteger(mapping[item.key]) && mapping[item.key] >= 0 && headers[mapping[item.key]]);
    const missing = definition.fields.filter(item => item.required && !fields.includes(item));
    if (missing.length) throw Error('请映射必填字段 ' + missing.map(item => item.label).join('、') + '。');
    const selected = [...fields.map(item => mapping[item.key]), ...typeColumns];
    if (new Set(selected).size !== selected.length) throw Error('每个源列只对应一个字段。资产类型列用于核对导入类型。');
    if (header.formulas.some(index => selected.includes(index))) throw Error('所选表头含公式，请改用固定字段名。');
    if (kind === 'dataset' || kind === 'reference') {
      const dataset = kind === 'dataset';
      const other = dataset ? specs.reference.fields[1] : specs.dataset.fields[1];
      const chosenHeader = normalize(headers[mapping[dataset ? 'input' : 'expected']]);
      if ([other.key, other.label, ...other.aliases].map(normalize).includes(chosenHeader)) {
        throw Error('请分别映射样本输入和参考答案。所选列属于「' + types[dataset ? 'reference' : 'dataset'] + '」。');
      }
    }

    const rowsToSave = [], errors = [], seen = new Set();
    for (const row of dataRows) {
      if (!row.values.some(value => asText(value) !== '') && !row.formulas.length) continue;
      const values = Object.fromEntries(fields.map(item => [item.key, row.values[mapping[item.key]] ?? '']));
      const id = asText(values.sample_id ?? values.case_id ?? values.external_id) || asText(values.name);
      const reasons = [];
      if (row.formulas.some(index => selected.includes(index))) reasons.push('映射列含公式，请使用确认后的值');
      for (const index of typeColumns) {
        const declared = asText(row.values[index]);
        if (!declared) reasons.push('资产类型列为空，请填写 ' + kind);
        else if (!matchesType(declared)) reasons.push('声明为「' + typeLabel(declared) + '」，本批导入「' + types[kind] + '」');
      }
      const absent = definition.fields.filter(item => item.required && asText(values[item.key]) === '');
      if (absent.length) reasons.push('缺少 ' + absent.map(item => item.label).join('、'));
      if (asText(values.object_type)) {
        const objectTypeLabel = objectTypes.get(normalize(values.object_type));
        if (objectTypeLabel) values.object_type = objectTypeLabel;
        else reasons.push('对象类型应为 Agent、模型或非 Agent 应用');
      }
      if (seen.has(id)) reasons.push('本批编号重复');
      if (reasons.length) errors.push({ row: row.number, id, reasons });
      else {
        seen.add(id);
        rowsToSave.push({ row: row.number, id, values });
      }
    }
    const unused = headers.filter((label, index) => label && !selected.includes(index));
    return { rows: rowsToSave, errors, unused };
  }

  function textRows(source) {
    const { headers, rows } = CaseFileImport.parse(source);
    const firstRow = /^[\s\uFEFF]*[\[{]/.test(source) ? 0 : 1;
    return [
      { number: firstRow, values: headers, formulas: [] },
      ...rows.map((row, index) => ({ number: firstRow + index + 1, values: headers.map(header => row[header]), formulas: [] }))
    ];
  }

  function template(kind, format) {
    const keys = ['asset_type', ...spec(kind).fields.map(item => item.key)];
    if (format === 'json') {
      return JSON.stringify([Object.fromEntries(keys.map(key => [key, key === 'asset_type' ? kind : '']))], null, 2) + '\n';
    }
    const csv = row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(',');
    return '\uFEFF' + [csv(keys), csv(keys.map(key => key === 'asset_type' ? kind : ''))].join('\r\n') + '\r\n';
  }

  root.AssetBulkCore = { types, spec, autoMap, inspect, textRows, template, asText, typeHeaders };
})(window);
