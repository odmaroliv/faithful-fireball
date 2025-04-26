/// <reference types="astro/client" />

declare module "astro:content" {
  interface CollectionEntry<C> {
    slug: string;
    data: any;
    body: string;
    render(): Promise<{
      Content: import("astro").MarkdownInstance<{}>["Content"];
      headings: import("astro").MarkdownHeading[];
      remarkPluginFrontmatter: Record<string, any>;
    }>;
  }

  export const getCollection: <C extends keyof AnyEntryMap>(
    collection: C,
    filter?: (entry: CollectionEntry<C>) => boolean
  ) => Promise<CollectionEntry<C>[]>;

  type ContentEntryMap = {
    blog: {
      title: string;
      description: string;
      pubDate: Date;
      updatedDate?: Date;
      heroImage?: string;
      tags: string[];
      author: string;
      featured: boolean;
      destination: string;
    };
  };

  type AnyEntryMap = ContentEntryMap;

  export const getEntry: <C extends keyof AnyEntryMap>(
    collection: C,
    slug: string
  ) => Promise<CollectionEntry<C> | undefined>;
}
