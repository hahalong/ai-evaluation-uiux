const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

test('Pages restores verified supporting files without overwriting current UI', () => {
  const script = `
import hashlib, importlib.util, io, json, tarfile, tempfile, zipfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('pages', 'scripts/prepare-pages.py')
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)
with tempfile.TemporaryDirectory() as folder:
    root = Path(folder)
    (root/'dist').mkdir()
    (root/'dist/index.html').write_bytes(b'current UI')
    content = {'dist/index.html': b'old UI', 'dist/demos/example.txt': b'old evidence'}
    manifest = {'files': [{'path': p, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest()} for p,b in content.items()]}
    with zipfile.ZipFile(root/'sites-v23-bootstrap.zip', 'w') as z:
        z.writestr('migration/sites-v23-manifest.json', json.dumps(manifest))
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w:gz') as t:
        for p,b in content.items():
            info = tarfile.TarInfo('./'+p)
            info.size = len(b)
            t.addfile(info, io.BytesIO(b))
    archive = buffer.getvalue()
    middle = len(archive)//2
    (root/'sites-v23-chunk-00.bin').write_bytes(archive[:middle])
    (root/'sites-v23-chunk-01.bin').write_bytes(archive[middle:])
    try:
        pages.restore_legacy(root, 'wrong-checksum')
        raise AssertionError('Corrupt snapshot accepted')
    except ValueError:
        pass
    assert not (root/'dist/demos/example.txt').exists()
    checksum = hashlib.sha256(archive).hexdigest()
    assert pages.restore_legacy(root, checksum) == 1
    assert (root/'dist/index.html').read_bytes() == b'current UI'
    assert (root/'dist/demos/example.txt').read_bytes() == b'old evidence'
    assert pages.restore_legacy(root, checksum) == 0
`;
  const result = spawnSync('python3', ['-c', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
