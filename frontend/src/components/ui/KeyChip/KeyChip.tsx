import React from 'react';

type KeyChipSize = 'sm' | 'md' | 'lg';

interface KeyChipProps {
  keyStr: string;
  size?: KeyChipSize;
  className?: string;
}

const MODIFIER_PREFIXES = ['<C-', '<S-', '<M-', '<A-', '<D-'];
const SPECIAL_KEYS: Record<string, string> = {
  '<CR>': '↵',
  '<BS>': '⌫',
  '<Esc>': 'Esc',
  '<Tab>': '⇥',
  '<Space>': 'Space',
  '<Up>': '↑',
  '<Down>': '↓',
  '<Left>': '←',
  '<Right>': '→',
  '<F1>': 'F1', '<F2>': 'F2', '<F3>': 'F3', '<F4>': 'F4',
  '<F5>': 'F5', '<F6>': 'F6', '<F7>': 'F7', '<F8>': 'F8',
  '<F9>': 'F9', '<F10>': 'F10', '<F11>': 'F11', '<F12>': 'F12',
};

function parseKeySequence(keyStr: string): Array<{ text: string; type: 'leader' | 'modifier' | 'special' | 'normal' }> {
  const parts: Array<{ text: string; type: 'leader' | 'modifier' | 'special' | 'normal' }> = [];
  let remaining = keyStr;

  while (remaining.length > 0) {
    if (remaining.startsWith('<leader>')) {
      parts.push({ text: '⎵', type: 'leader' });
      remaining = remaining.slice(8);
      continue;
    }

    const specialKey = Object.keys(SPECIAL_KEYS).find((k) => remaining.startsWith(k));
    if (specialKey) {
      parts.push({ text: SPECIAL_KEYS[specialKey] ?? specialKey, type: 'special' });
      remaining = remaining.slice(specialKey.length);
      continue;
    }

    const modPrefix = MODIFIER_PREFIXES.find((p) => remaining.startsWith(p));
    if (modPrefix && remaining.includes('>')) {
      const end = remaining.indexOf('>');
      const inner = remaining.slice(2, end);
      const modName = modPrefix.slice(1, -1);
      parts.push({ text: `${modName}-${inner}`, type: 'modifier' });
      remaining = remaining.slice(end + 1);
      continue;
    }

    parts.push({ text: remaining[0] ?? '', type: 'normal' });
    remaining = remaining.slice(1);
  }

  return parts;
}

export const KeyChip = React.memo(function KeyChip({
  keyStr,
  size = 'md',
  className = '',
}: KeyChipProps) {
  const sizeClass = size !== 'md' ? `key-chip--${size}` : '';
  const parts = parseKeySequence(keyStr);

  if (parts.length === 1 && parts[0]) {
    const part = parts[0];
    const typeClass = `key-chip--${part.type}`;
    return (
      <kbd className={['key-chip', typeClass, sizeClass, className].filter(Boolean).join(' ')}>
        {part.text}
      </kbd>
    );
  }

  return (
    <span className={['key-sequence', className].filter(Boolean).join(' ')}>
      {parts.map((part, i) => (
        <kbd
          key={i}
          className={['key-chip', `key-chip--${part.type}`, sizeClass].filter(Boolean).join(' ')}
        >
          {part.text}
        </kbd>
      ))}
    </span>
  );
});
