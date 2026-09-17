import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  build: {
    minify: false,
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Better Bunpro',
        namespace: 'mwsmws22',
        author: 'mwsmws22',
        license: 'MIT',
        description:
          'Fixes and features I wish Bunpro had natively — real speaker audio, A1+ example sentences, add synonyms, and more.',
        // Bunpro routes client-side, so /reviews is often reached without a page
        // load. Every feature activates off the elements it needs being present.
        match: ['https://bunpro.jp/*'],
        connect: [
          'assets.languagepod101.com',
          'www.japanesepod101.com',
          'cdn.innovativelanguage.com',
          'jisho.org',
          'd1vjc5dkcd3yh2.cloudfront.net',
        ],
        'run-at': 'document-idle',
      },
      build: {
        fileName: 'better-bunpro.user.js',
        metaFileName: true,
      },
    }),
  ],
});
