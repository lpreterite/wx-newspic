import { z } from 'zod';
import matter from 'gray-matter';

const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

const BaseFrontmatterSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  type: z.enum(['article', 'newspic'], { required_error: '缺少文档类型 (article | newspic)' }),
  created: z.string().regex(YYYYMMDD, '创建日期格式须为 YYYY-MM-DD'),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  cover: z.string().optional(),
  images: z.array(z.string()).optional(),
  author: z.string().optional(),
  digest: z.string().optional(),
  description: z.string().optional(),
  source_url: z.string().optional(),
  need_open_comment: z.boolean().optional(),
  only_fans_can_comment: z.boolean().optional(),
  word_count: z.number().optional(),
});

export const FrontmatterSchema = BaseFrontmatterSchema.superRefine((data, ctx) => {
  if (data.type === 'article' && !data.cover) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '图文消息(article)类型必须提供 cover 封面',
      path: ['cover'],
    });
  }
});

const LooseSchema = BaseFrontmatterSchema.partial();

export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export interface ParseResult {
  frontmatter: Frontmatter;
  content: string;
  warnings?: string[];
}

function coerceData(data: Record<string, unknown>): Record<string, unknown> {
  const coerced: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      coerced[key] = value.toISOString().slice(0, 10);
    } else {
      coerced[key] = value;
    }
  }
  return coerced;
}

export function parseFrontmatter(
  markdown: string,
  options?: { strict?: boolean },
): ParseResult {
  const { strict = true } = options ?? {};

  const parsed = matter(markdown);
  const content = parsed.content;

  const hasDelimiter = markdown.trimStart().startsWith('---');
  if (!hasDelimiter) {
    return {
      frontmatter: { title: '', type: 'article', created: '' },
      content,
    } as unknown as ParseResult;
  }

  const data = coerceData(parsed.data as Record<string, unknown>);

  if (strict) {
    const result = FrontmatterSchema.parse(data);
    return { frontmatter: result, content };
  }

  const looseSafe = LooseSchema.safeParse(data);
  if (looseSafe.success) {
    return {
      frontmatter: {
        title: looseSafe.data.title ?? '',
        type: looseSafe.data.type ?? 'article',
        created: looseSafe.data.created ?? '',
        ...looseSafe.data,
      } as Frontmatter,
      content,
    };
  }

  const warnings = looseSafe.error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`,
  );

  return {
    frontmatter: { title: '', type: 'article', created: '' } as Frontmatter,
    content,
    warnings,
  };
}