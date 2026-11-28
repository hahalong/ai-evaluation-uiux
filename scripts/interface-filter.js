(() => {
  const root = document.getElementById('interface-directory');
  if (!root) return;
  const field = id => root.querySelector('#iface-' + id);
  const q = field('query'), p = field('provider'), c = field('caller'), k = field('kind');
  const pp = field('product-provider'), pc = field('product-caller');
  const controls = [q, p, c, k, pp, pc];
  // Ignore typographical spacing at Chinese/English word boundaries, but retain
  // spaces after product IDs and between independent English search terms.
  const normalize = value => value.normalize('NFKC').toLowerCase()
    .replace(/([a-z])\s+(?=\p{Script=Han})/gu, '$1')
    .replace(/(\p{Script=Han})\s+(?=[a-z])/gu, '$1')
    .replace(/\s+/g, ' ').trim();
  const terms = value => normalize(value).split(' ').filter(Boolean);
  const rows = [...root.querySelectorAll('tr[data-iface]')].map(el => ({
    el, meta: JSON.parse(el.dataset.iface), text: normalize(el.textContent),
  }));
  function productMatch(value, ids, labels) {
    const searchable = normalize(labels.join(' '));
    return terms(value).every(term => /^p\d{2}$/.test(term)
      ? ids.some(id => id.toLowerCase() === term) : searchable.includes(term));
  }
  function apply() {
    let count = 0;
    for (const r of rows) {
      const allProducts = [...r.meta.product_providers, ...r.meta.product_callers];
      const show = (!p.value || r.meta.providers.includes(p.value))
        && (!c.value || r.meta.callers.includes(c.value))
        && (!k.value || (k.value === '非事件接口' ? r.meta.kind !== '消息事件' : r.meta.kind === k.value))
        && productMatch(pp.value, r.meta.product_providers, r.meta.product_provider_labels)
        && productMatch(pc.value, r.meta.product_callers, r.meta.product_caller_labels)
        && terms(q.value).every(term => /^p\d{2}$/.test(term)
          ? allProducts.some(id => id.toLowerCase() === term) : r.text.includes(term));
      r.el.hidden = !show;
      if (show) count++;
    }
    field('count').textContent = '显示 ' + count + ' / ' + rows.length + ' 条' + (controls.some(el => el.value.trim()) ? ' · 已应用筛选（条件取交集）' : ' · 全部接口');
    field('empty').hidden = count !== 0;
    root.querySelector('.iface-scroll').scrollTop = 0;
  }
  function clear() { controls.forEach(el => { el.value = ''; }); }
  for (const el of controls) {
    el.addEventListener('input', apply);
    el.addEventListener('change', apply);
    el.addEventListener('search', apply);
    el.addEventListener('compositionend', apply);
  }
  field('reset').addEventListener('click', () => { clear(); apply(); });
  root.querySelectorAll('[data-iface-module]').forEach(b => b.addEventListener('click', () => {
    clear();
    const role = b.dataset.ifaceRole;
    (role === 'provide' || role === 'publish' ? p : c).value = b.dataset.ifaceModule;
    k.value = role === 'publish' || role === 'subscribe' ? '消息事件' : '非事件接口';
    apply();
    root.querySelector('.iface-controls').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  root.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', () => {
    let target = document.getElementById(a.getAttribute('href').slice(1));
    // Related contracts can be outside the current product/type filter.
    if (target && target.dataset && target.dataset.iface && target.hidden) { clear(); apply(); }
    while (target) {
      if (target.tagName === 'DETAILS') target.open = true;
      target = target.parentElement;
    }
  }));
  apply();
})();
