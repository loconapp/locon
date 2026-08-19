"""Writes a locon locale file, deriving its shape from the source locale.

Generating rather than hand-editing is what makes key parity, key order and
placeholder integrity structural instead of a matter of care. The file refuses
to write anything that violates an invariant, so a bad translation batch fails
loudly at generation time rather than silently at runtime.

Usage:

    import os
    os.environ['LOCON_ASSETS'] = 'src/i18n/assets'   # optional
    os.environ['LOCON_SOURCE'] = 'de'                # optional, default 'en'

    from write_locale import write
    write('fr', {'greeting': 'Bonjour', 'day_one': '{count} jour', ...})
"""

import json
import os
import pathlib
import re
import sys

ASSETS = pathlib.Path(os.environ.get('LOCON_ASSETS', 'src/i18n/assets'))
SOURCE_LOCALE = os.environ.get('LOCON_SOURCE', 'en')

PLURAL = re.compile(r'_(zero|one|two|few|many|other)$')
# Categories that already state the number, so repeating {count} would read as
# "1 one day". These may omit it; no category may ever add a placeholder.
IMPLIES_COUNT = re.compile(r'_(zero|one|two)$')

_source_path = ASSETS / f'{SOURCE_LOCALE}.json'
if not _source_path.exists():
    sys.exit(f'source locale not found: {_source_path}')

SOURCE = json.loads(_source_path.read_text())

# Blank-line grouping is mirrored from the source so the files stay diffable
# side by side — reviewing 30 locales is hard enough without shuffled layout.
BOUNDARIES = set()
_prev = None
for _line in _source_path.read_text().splitlines():
    _match = re.match(r'\s*"([^"]+)":', _line)
    if _match:
        _prev = _match.group(1)
    elif not _line.strip() and _prev:
        BOUNDARIES.add(_prev)

FAMILIES = {PLURAL.sub('', k) for k in SOURCE if PLURAL.search(k)}


def write(locale: str, values: dict) -> None:
    """Validate `values` against the source locale and write `<locale>.json`."""
    missing = [k for k in SOURCE if k not in values]
    # A locale may add plural categories the source language does not inflect:
    # Polish and Russian need _few and _many, Arabic needs all six.
    unknown = [
        k for k in values
        if k not in SOURCE and not (PLURAL.search(k) and PLURAL.sub('', k) in FAMILIES)
    ]
    if missing:
        sys.exit(f'{locale}: missing {len(missing)} keys: {missing}')
    if unknown:
        sys.exit(f'{locale}: unknown keys: {unknown}')

    for key, value in values.items():
        source_key = key if key in SOURCE else PLURAL.sub('_other', key)
        if source_key not in SOURCE:
            continue
        want = set(re.findall(r'\{(\w+)\}', SOURCE[source_key]))
        got = set(re.findall(r'\{(\w+)\}', value))
        if got - want:
            sys.exit(f'{locale}.{key}: unknown placeholders {sorted(got - want)}')
        dropped = want - got
        if dropped and not (dropped == {'count'} and IMPLIES_COUNT.search(key)):
            sys.exit(f'{locale}.{key}: missing placeholders {sorted(dropped)}')

    # Source order, with any extra plural categories beside their family.
    ordered = []
    for key in SOURCE:
        ordered.append(key)
        if PLURAL.search(key):
            base = PLURAL.sub('', key)
            for category in ('zero', 'two', 'few', 'many'):
                sibling = f'{base}_{category}'
                if sibling in values and sibling not in ordered:
                    ordered.append(sibling)

    lines = ['{']
    for index, key in enumerate(ordered):
        comma = '' if index == len(ordered) - 1 else ','
        lines.append(f'  {json.dumps(key)}: {json.dumps(values[key], ensure_ascii=False)}{comma}')
        if key in BOUNDARIES and index != len(ordered) - 1:
            lines.append('')
    lines.append('}')

    (ASSETS / f'{locale}.json').write_text('\n'.join(lines) + '\n')
    print(f'{locale}.json: {len(values)} keys')
