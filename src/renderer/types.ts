export interface RenderOptions {
  content: string;
  theme?: string;
  hlTheme?: string;
  themeFile?: string;
}

export interface RenderedArticle {
  content: string;
  title: string;
  cover?: string;
  author?: string;
  source_url?: string;
  need_open_comment?: boolean;
  only_fans_can_comment?: boolean;
  image_list?: string[];
}
