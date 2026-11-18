import { describe, expect, it } from 'vitest';
import { contrastRatio, darkTheme, lightTheme, roomsTheme } from '../src/theme';

describe('theme (platform rule 11)', () => {
  it('light and dark have the same tokens', () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(lightTheme).sort());
  });

  it('the company colour becomes primary, with a readable text colour', () => {
    const theme = roomsTheme(false, { color: '#0f766e' });
    expect(theme.primary).toBe('#0f766e');
    expect(theme.ring).toBe('#0f766e');
    expect(theme.primaryForeground).toBe('#ffffff');
    expect(roomsTheme(false, { color: '#fde047' }).primaryForeground).toBe('#111111');
    expect(roomsTheme(false, { color: '#0f766e', text: '#fafafa' }).primaryForeground).toBe('#fafafa');
  });

  it('dark mode keeps its own primary when the company colour would not stand out', () => {
    expect(roomsTheme(true, { color: '#0b1d3a' }).primary).toBe(darkTheme.primary);
    expect(roomsTheme(true, { color: '#38bdf8' }).primary).toBe('#38bdf8');
  });

  it('ignores what is not a colour', () => {
    expect(roomsTheme(false, { color: 'red' })).toBe(lightTheme);
    expect(roomsTheme(false, { color: null })).toBe(lightTheme);
  });

  it('measures contrast as WCAG does', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});
