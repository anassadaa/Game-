#!/usr/bin/env python3
"""Bundle a web-only update into the verified v2.3 native shell, without signing.

Use the normal Gradle build when native code or Capacitor dependencies change.
The output requires the original Touchline key before it is installable.
"""
import argparse
import hashlib
from pathlib import Path
import re
import struct
import zipfile

BASE_SHA256 = 'a5c9f95b481b453e5cba80875c4d06ea5b742b2861e83bacff19d48b594dfd06'


def update_manifest(data):
    data = bytearray(data)
    u16 = lambda p: struct.unpack_from('<H', data, p)[0]
    u32 = lambda p: struct.unpack_from('<I', data, p)[0]
    strings, locations = [], []
    offset, changed = 8, set()

    def length(pos, utf8):
        first = data[pos] if utf8 else u16(pos)
        step, high = (1, 0x80) if utf8 else (2, 0x8000)
        if first & high:
            second = data[pos + step] if utf8 else u16(pos + step)
            return ((first & (high - 1)) << (8 * step)) | second, pos + step * 2
        return first, pos + step

    while offset < len(data):
        kind, header, size = struct.unpack_from('<HHI', data, offset)
        if size < header or not size:
            raise ValueError('Invalid binary XML chunk')
        if kind == 1:
            utf8 = bool(u32(offset + 16) & 256)
            for i in range(u32(offset + 8)):
                pos = offset + u32(offset + 20) + u32(offset + header + i * 4)
                if utf8:
                    _, pos = length(pos, True)
                count, pos = length(pos, utf8)
                encoding = 'utf-8' if utf8 else 'utf-16le'
                end = pos + count * (1 if utf8 else 2)
                strings.append(data[pos:end].decode(encoding))
                locations.append((pos, end, encoding))
        elif kind == 0x102 and strings[u32(offset + 20)] == 'manifest':
            start, stride, count = struct.unpack_from('<HHH', data, offset + 24)
            for i in range(count):
                pos = offset + 16 + start + stride * i
                name = strings[u32(pos + 4)]
                if name == 'versionCode':
                    if u32(pos + 16) != 14:
                        raise ValueError('Expected native build 14')
                    struct.pack_into('<I', data, pos + 16, 15)
                    changed.add(name)
                elif name == 'versionName':
                    index = u32(pos + 16)
                    if strings[index] != '2.3':
                        raise ValueError('Expected native version 2.3')
                    lo, hi, encoding = locations[index]
                    replacement = '2.4'.encode(encoding)
                    if len(replacement) != hi - lo:
                        raise ValueError('Version must preserve the binary XML string length')
                    data[lo:hi] = replacement
                    changed.add(name)
        offset += size
    if changed != {'versionCode', 'versionName'}:
        raise ValueError('Version fields were not found')
    return data


def put(archive, name, data, compression):
    info = zipfile.ZipInfo(name, (2026, 10, 25, 0, 0, 0))
    info.compress_type = compression
    if compression == zipfile.ZIP_STORED:
        alignment = 16384 if name.endswith('.so') else 4
        base = archive.fp.tell() + 30 + len(name.encode('utf-8'))
        pad = (-base) % alignment
        if pad:
            if pad < 4:
                pad += alignment
            info.extra = struct.pack('<HH', 0xd935, pad - 4) + bytes(pad - 4)
    archive.writestr(info, data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-apk', type=Path, required=True)
    parser.add_argument('--web-dir', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if hashlib.sha256(args.base_apk.read_bytes()).hexdigest() != BASE_SHA256:
        parser.error('Base APK does not match the verified Touchline 2.3 release')
    if not (args.web_dir / 'index.html').is_file():
        parser.error('Build the web app before packaging')
    if args.output.resolve() == args.base_apk.resolve():
        parser.error('Output must not overwrite the original APK')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.base_apk) as source, zipfile.ZipFile(args.output, 'w') as out:
        for entry in source.infolist():
            name = entry.filename
            web_asset = name.startswith('assets/public/') and name not in ('assets/public/cordova.js', 'assets/public/cordova_plugins.js')
            if web_asset or re.fullmatch(r'META-INF/(?:MANIFEST\.MF|[^/]+\.(?:SF|RSA|DSA|EC)|SIG-[^/]+)', name, re.I):
                continue
            data = source.read(name)
            if name == 'AndroidManifest.xml':
                data = update_manifest(data)
            put(out, name, data, entry.compress_type)
        for path in sorted(args.web_dir.rglob('*')):
            if path.is_file():
                put(out, 'assets/public/' + path.relative_to(args.web_dir).as_posix(), path.read_bytes(), zipfile.ZIP_DEFLATED)
    with zipfile.ZipFile(args.output) as result:
        if result.testzip():
            raise ValueError('APK integrity check failed')
    print(f'Unsigned Touchline 2.4/build 15: {args.output}')
    print('Sign with the original Touchline key before installing. No signing identity was substituted.')


if __name__ == '__main__':
    main()
