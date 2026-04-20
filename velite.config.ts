import { defineCollection, defineConfig, s } from "velite";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";

const posts = defineCollection({
  name: "Post",
  pattern: "insights/**/*.mdx",
  schema: s
    .object({
      slug: s.path(),
      title: s.string().max(160),
      excerpt: s.string().max(400),
      date: s.isodate(),
      readTime: s.string(),
      category: s.enum(["AI", "STRATEGY", "MARKETING", "FINANCE", "ORGANIZATION"]),
      author: s.string().default("N.I."),
      authorRole: s.string().default("CEO / FOUNDER"),
      tags: s.array(s.string()).default([]),
      hero: s.string().optional(),
      subtitle: s.string().optional(),
      metadata: s.metadata(),
      body: s.mdx(),
    })
    .transform((data) => {
      const slug = data.slug.replace(/^insights\//, "");
      return {
        ...data,
        slug,
        permalink: `/insights/${slug}`,
      };
    }),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true,
  },
  collections: { posts },
  mdx: {
    rehypePlugins: [
      rehypeSlug,
      [rehypePrettyCode, { theme: "github-dark-dimmed" }],
      [rehypeAutolinkHeadings, { behavior: "wrap" }],
    ],
  },
});
