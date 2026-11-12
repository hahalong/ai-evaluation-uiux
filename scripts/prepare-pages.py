"""Prepare Pages from current editable source and unchanged V23 supporting assets."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import tarfile
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_SHA256 = "74d96665baf73d6fdb2d6bbe1183924a7161908b651c8c450a8c5a1eb492fbd9"


def restore_legacy(root, expected_sha256=SNAPSHOT_SHA256):
    """Restore missing public supporting files, never replace current source."""
    with zipfile.ZipFile(root / "sites-v23-bootstrap.zip") as bootstrap:
        manifest = json.loads(bootstrap.read("migration/sites-v23-manifest.json"))
    wanted = {}
    for item in manifest["files"]:
        relative = PurePosixPath(item["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise ValueError("Unsafe snapshot path")
        if relative.parts and relative.parts[0] == "dist":
            destination = root.joinpath(*relative.parts)
            if not destination.exists():
                wanted[item["path"]] = item
    if not wanted:
        return 0
    chunks = sorted(root.glob("sites-v23-chunk-*.bin"))
    if not chunks:
        raise FileNotFoundError("The checked-in V23 snapshot chunks are required")
    with tempfile.TemporaryFile() as archive:
        digest = hashlib.sha256()
        for chunk in chunks:
            with chunk.open("rb") as stream:
                while block := stream.read(1024 * 1024):
                    digest.update(block)
                    archive.write(block)
        if digest.hexdigest() != expected_sha256:
            raise ValueError("V23 snapshot checksum mismatch")
        archive.seek(0)
        with tarfile.open(fileobj=archive, mode="r:gz") as snapshot:
            members = {member.name.removeprefix("./"): member for member in snapshot.getmembers()}
            for relative, item in wanted.items():
                member = members.get(relative)
                if member is None or not member.isfile():
                    raise ValueError("Missing or non-file snapshot member: " + relative)
                content = snapshot.extractfile(member).read()
                if len(content) != item["bytes"] or hashlib.sha256(content).hexdigest() != item["sha256"]:
                    raise ValueError("Snapshot file checksum mismatch: " + relative)
                destination = root / relative
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(content)
    return len(wanted)


def main():
    restored = restore_legacy(ROOT)
    dist = ROOT / "dist"
    (dist / ".nojekyll").touch()
    alias = dist / "walkthrough" / "index.html"
    alias.parent.mkdir(exist_ok=True)
    alias.write_text('''<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><title>历史场景走查</title>
<script>location.replace('../walkthrough.html'+location.search+location.hash);</script>
<p><a href="../walkthrough.html">进入历史场景走查</a></p></html>
''', encoding="utf-8")
    print(f"Prepared current UI; restored {restored} unchanged V23 supporting files.")


if __name__ == "__main__":
    main()
