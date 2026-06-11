import { getAllGzhThemes, getTheme, registerAllBuiltInThemes } from '@wenyan-md/core';
import type { Theme } from '@wenyan-md/core';

let registered = false;

function ensure(): void {
  if (registered) return;
  registerAllBuiltInThemes();
  registered = true;
}

export interface ThemeInfo {
  id: string;
  name: string;
  description: string;
  author: string;
}

function toInfo(t: Theme): ThemeInfo {
  return {
    id: t.meta.id,
    name: t.meta.name,
    description: t.meta.description,
    author: t.meta.author,
  };
}

export function listThemes(): ThemeInfo[] {
  ensure();
  return getAllGzhThemes().map(toInfo);
}

export function getThemeInfo(id: string): ThemeInfo | undefined {
  ensure();
  const t = getTheme(id);
  return t ? toInfo(t) : undefined;
}
