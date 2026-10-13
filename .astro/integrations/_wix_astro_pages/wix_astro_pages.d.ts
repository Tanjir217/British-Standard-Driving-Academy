declare module 'wix:astro:pages' {
  export interface Page extends PageMetadata {
    path: string;
    srcFilePath: string;
  }

  export interface PageMetadata {
    appDefId?: string;
    identifiers?: Record<string, string>;
    pageIdentifier?: string;
  }

  const pages: Page[];
  export { pages };
}