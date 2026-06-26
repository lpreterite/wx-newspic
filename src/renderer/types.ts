import type { Frontmatter } from '../schema/frontmatter.js';

export interface RenderOptions {
  content: string;
  theme?: string;
  hlTheme?: string;
  themeFile?: string;
}

export interface RenderedArticle extends Frontmatter {
  content: string;
}
