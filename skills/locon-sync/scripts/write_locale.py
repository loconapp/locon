#!/usr/bin/env python3
"""Validate and write one flat locon locale JSON file.

Use as a CLI from any project directory:

    python3 write_locale.py --locale fr --input /tmp/fr.json \
      --assets src/i18n/assets --source de

Or import `write()` and pass the same values as a dictionary. The source file
defines key order and grouping; target-only CLDR plural categories stay beside
their family. Invalid parity, placeholders, duplicate JSON keys, and unsafe
locale names fail before the destination is touched.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import tempfile
from typing import Iterable

DEFAULT_ASSETS = pathlib.Path(os.environ.get('LOCON_ASSETS', 'src/i18n/assets'))
DEFAULT_SOURCE_LOCALE = os.environ.get('LOCON_SOURCE', 'en')

PLURAL = re.compile(r'_(zero|one|two|few|many|other)$')
PLURAL_CATEGORIES = ('zero', 'one', 'two', 'few', 'many', 'other')
LOCALE_NAME = re.compile(r'^[A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{1,8})*$')


class DuplicateKeyError(ValueError):
    """Raised when JSON would silently overwrite a translation key."""


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise DuplicateKeyError(f'duplicate key: {key}')
        result[key] = value
    return result


def _read_flat_asset(path: pathlib.Path) -> dict[str, str]:
    try:
        value = json.loads(
            path.read_text(encoding='utf-8'),
            object_pairs_hook=_unique_object,
        )
    except (OSError, json.JSONDecodeError, DuplicateKeyError) as error:
        raise SystemExit(f'{path}: {error}') from error

    if not isinstance(value, dict) or any(
        not isinstance(key, str) or not isinstance(item, str)
        for key, item in value.items()
    ):
        raise SystemExit(f'{path}: expected a flat JSON object with string values')
    return value


def _source_boundaries(path: pathlib.Path) -> set[str]:
    boundaries = set()
    previous = None
    for line in path.read_text(encoding='utf-8').splitlines():
        match = re.match(r'\s*"([^"]+)":', line)
        if match:
            previous = match.group(1)
        elif not line.strip() and previous:
            boundaries.add(previous)
    return boundaries


def _validate_locale(locale: str) -> None:
    if not LOCALE_NAME.fullmatch(locale):
        raise SystemExit(f'invalid locale name: {locale!r}')


def write(
    locale: str,
    values: dict[str, str],
    *,
    assets: pathlib.Path | str = DEFAULT_ASSETS,
    source_locale: str = DEFAULT_SOURCE_LOCALE,
    allow_implicit_count: Iterable[str] = (),
) -> None:
    """Validate `values` and atomically write `<assets>/<locale>.json`."""
    _validate_locale(locale)
    _validate_locale(source_locale)

    asset_dir = pathlib.Path(assets)
    source_path = asset_dir / f'{source_locale}.json'
    if not source_path.exists():
        raise SystemExit(f'source locale not found: {source_path}')

    source = _read_flat_asset(source_path)
    if not isinstance(values, dict) or any(
        not isinstance(key, str) or not isinstance(value, str)
        for key, value in values.items()
    ):
        raise SystemExit(f'{locale}: expected a dictionary with string values')

    families = {PLURAL.sub('', key) for key in source if PLURAL.search(key)}
    missing_other = [family for family in sorted(families) if f'{family}_other' not in source]
    if missing_other:
        raise SystemExit(
            f'{source_locale}: plural families must define an _other catch-all: '
            + ', '.join(missing_other)
        )

    missing = [key for key in source if key not in values]
    unknown = [
        key for key in values
        if key not in source and not (PLURAL.search(key) and PLURAL.sub('', key) in families)
    ]
    if missing:
        raise SystemExit(f'{locale}: missing {len(missing)} keys: {missing}')
    if unknown:
        raise SystemExit(f'{locale}: unknown keys: {unknown}')

    allowances = set(allow_implicit_count)
    used_allowances = set()

    for key, value in values.items():
        source_key = PLURAL.sub('_other', key) if PLURAL.search(key) else key
        if source_key not in source:
            continue
        want = set(re.findall(r'\{(\w+)\}', source[source_key]))
        got = set(re.findall(r'\{(\w+)\}', value))
        introduced = got - want
        dropped = want - got

        if introduced:
            raise SystemExit(f'{locale}.{key}: unknown placeholders {sorted(introduced)}')
        if dropped == {'count'} and key in allowances:
            used_allowances.add(key)
        elif dropped:
            suffix = (
                f'; pass allow_implicit_count={{\'{key}\'}} if the wording states the exact number'
                if 'count' in dropped else ''
            )
            raise SystemExit(f'{locale}.{key}: missing placeholders {sorted(dropped)}{suffix}')

    unused_allowances = allowances - used_allowances
    if unused_allowances:
        raise SystemExit(f'{locale}: unused allow_implicit_count keys: {sorted(unused_allowances)}')

    ordered = []
    for key in source:
        if key not in ordered:
            ordered.append(key)
        if PLURAL.search(key):
            base = PLURAL.sub('', key)
            for category in PLURAL_CATEGORIES:
                sibling = f'{base}_{category}'
                if sibling in values and sibling not in ordered:
                    ordered.append(sibling)

    boundaries = _source_boundaries(source_path)
    expanded_boundaries = set()
    for boundary in boundaries:
        if PLURAL.search(boundary):
            family = PLURAL.sub('', boundary)
            siblings = [key for key in ordered if PLURAL.search(key) and PLURAL.sub('', key) == family]
            if siblings:
                expanded_boundaries.add(siblings[-1])
        else:
            expanded_boundaries.add(boundary)

    lines = ['{']
    for index, key in enumerate(ordered):
        comma = '' if index == len(ordered) - 1 else ','
        lines.append(f'  {json.dumps(key)}: {json.dumps(values[key], ensure_ascii=False)}{comma}')
        if key in expanded_boundaries and index != len(ordered) - 1:
            lines.append('')
    lines.append('}')

    asset_dir.mkdir(parents=True, exist_ok=True)
    destination = asset_dir / f'{locale}.json'
    destination_mode = destination.stat().st_mode & 0o777 if destination.exists() else 0o644
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode='w',
            encoding='utf-8',
            dir=asset_dir,
            prefix=f'.{locale}.',
            suffix='.tmp',
            delete=False,
        ) as temporary:
            temporary.write('\n'.join(lines) + '\n')
            temporary_path = pathlib.Path(temporary.name)
        temporary_path.chmod(destination_mode)
        temporary_path.replace(destination)
    finally:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()

    print(f'{locale}.json: {len(values)} keys')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--locale', required=True, help='target BCP-47 locale and output filename')
    parser.add_argument('--input', required=True, type=pathlib.Path, help='flat JSON file with translated values')
    parser.add_argument('--assets', type=pathlib.Path, default=DEFAULT_ASSETS, help='asset directory')
    parser.add_argument('--source', default=DEFAULT_SOURCE_LOCALE, help='source locale (default: en)')
    parser.add_argument(
        '--allow-implicit-count',
        default='',
        help='comma-separated target keys intentionally omitting {count}',
    )
    args = parser.parse_args()
    _validate_locale(args.locale)
    _validate_locale(args.source)
    values = _read_flat_asset(args.input)
    allowances = [item.strip() for item in args.allow_implicit_count.split(',') if item.strip()]
    write(
        args.locale,
        values,
        assets=args.assets,
        source_locale=args.source,
        allow_implicit_count=allowances,
    )


if __name__ == '__main__':
    main()
