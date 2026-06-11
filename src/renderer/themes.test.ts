import { describe, it, expect } from 'vitest';
import { listThemes, getThemeInfo } from './themes.js';

describe('listThemes', () => {
  it('returns all built-in GZH themes', () => {
    const themes = listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(8);
    const ids = themes.map(t => t.id);
    expect(ids).toContain('default');
    expect(ids).toContain('orangeheart');
    expect(ids).toContain('rainbow');
  });

  it('each theme has required fields', () => {
    for (const t of listThemes()) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(typeof t.description).toBe('string');
    }
  });
});

describe('getThemeInfo', () => {
  it('returns info for existing theme', () => {
    const info = getThemeInfo('default');
    expect(info).toBeDefined();
    expect(info!.id).toBe('default');
  });

  it('returns undefined for nonexistent theme', () => {
    expect(getThemeInfo('nonexistent')).toBeUndefined();
  });
});
