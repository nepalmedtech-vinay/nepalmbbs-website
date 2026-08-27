#!/usr/bin/env python3
"""Convert inline on* handlers to data attributes + a delegated dispatcher.

The point is Content-Security-Policy. A CSP without 'unsafe-inline' on
script-src is the single header that turns an HTML injection from a scripting
bug into a formatting bug, and every inline on* attribute in the markup forces
'unsafe-inline' back on, which disables the whole protection.

Every handler here has the same shape: a call to a global function with literal
arguments. So the conversion is mechanical, and doing it mechanically is the
point -- a hand-edit across 13 files silently drops one.

  onclick="selectCollege(this,'all')"
    -> data-act="click" data-do='[["selectCollege","@el","all"]]'

The dispatcher looks names up in an allow-list rather than reaching into
window[] with an attacker-influenced string. Under CSP an injected attribute is
the remaining lever, so the dispatcher must not be a way to call anything.
"""
import re, sys, json, pathlib

SRC = pathlib.Path(__file__).resolve().parent.parent / 'src'

ATTR = re.compile(r'\s+on([a-z]+)="([^"]*)"')
ENTER = re.compile(r"^if\(event\.key==='Enter'\)(.+)$")
CALL = re.compile(r'^([A-Za-z_$][\w$]*)\((.*)\)$')

EVENT = {'click': 'click', 'change': 'change', 'input': 'input', 'keypress': 'enter'}


def split_top(s, sep):
    """Split on sep, ignoring anything inside quotes or parentheses."""
    out, buf, depth, q = [], '', 0, None
    for ch in s:
        if q:
            buf += ch
            if ch == q:
                q = None
            continue
        if ch in '"\'':
            q = ch; buf += ch; continue
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == sep and depth == 0:
            out.append(buf); buf = ''
        else:
            buf += ch
    if buf.strip():
        out.append(buf)
    return [x.strip() for x in out if x.strip()]


def parse_arg(a):
    a = a.strip()
    if a == 'this':
        return '@el'
    if len(a) >= 2 and a[0] == a[-1] and a[0] in '"\'':
        return a[1:-1]
    if re.fullmatch(r'-?\d+(\.\d+)?', a):
        return float(a) if '.' in a else int(a)
    if a in ('true', 'false'):
        return a == 'true'
    raise ValueError('argument is not a literal: %r' % a)


def parse_body(body):
    """'setLang("en");closeMenu()' -> [['setLang','en'], ['closeMenu']]"""
    calls = []
    for part in split_top(body, ';'):
        m = CALL.match(part)
        if not m:
            raise ValueError('not a plain call: %r' % part)
        name, argsrc = m.group(1), m.group(2).strip()
        args = [parse_arg(a) for a in split_top(argsrc, ',')] if argsrc else []
        calls.append([name] + args)
    return calls


def main():
    names, converted, files = set(), 0, 0
    for path in sorted(SRC.rglob('*.astro')):
        text = original = path.read_text()

        # Astro expressions inside a handler would not survive this rewrite.
        for _, body in ATTR.findall(text):
            if '{' in body:
                sys.exit('%s: handler contains an expression, refusing: %s' % (path, body))

        def repl(m):
            nonlocal converted
            ev, body = m.group(1), m.group(2).strip()
            if ev not in EVENT:
                return m.group(0)          # leave anything unexpected alone
            if not body:
                return ''                  # onchange="" does nothing; drop it
            k = ENTER.match(body)
            if k:
                if ev != 'keypress':
                    sys.exit('%s: Enter guard on on%s' % (path, ev))
                body = k.group(1)
            elif ev == 'keypress':
                sys.exit('%s: unguarded keypress: %s' % (path, body))
            try:
                calls = parse_body(body)
            except ValueError as e:
                sys.exit('%s: %s' % (path, e))
            for c in calls:
                names.add(c[0])
            converted += 1
            do = json.dumps(calls, separators=(',', ':'))
            assert "'" not in do, do
            return " data-act=\"%s\" data-do='%s'" % (EVENT[ev], do)

        text = ATTR.sub(repl, text)

        # One element carrying two different event types would need two
        # data-act values; nothing here does, but assert rather than assume.
        for tag in re.findall(r'<[^>]*data-act[^>]*>', text):
            if tag.count('data-act=') > 1:
                sys.exit('%s: element needs two event types: %s' % (path, tag[:120]))

        if text != original:
            path.write_text(text)
            files += 1

    print('%d handlers converted across %d files' % (converted, files))
    print('%d distinct functions' % len(names))
    (SRC.parent / 'tools' / 'action-allowlist.json').write_text(
        json.dumps(sorted(names), indent=2) + '\n')


if __name__ == '__main__':
    main()
