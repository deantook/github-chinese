import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const commonOptions = {
  bundle: true,
  platform: 'browser',
  target: 'chrome100',
  minify: false,
  sourcemap: false,
  format: 'iife',
};

async function build() {
  if (fs.existsSync(dist)) {
    fs.rmSync(dist, { recursive: true });
  }
  fs.mkdirSync(dist, { recursive: true });
  fs.mkdirSync(path.join(dist, 'popup'), { recursive: true });

  await Promise.all([
    esbuild.build({
      ...commonOptions,
      entryPoints: [path.join(root, 'src/content/index.ts')],
      outfile: path.join(dist, 'content.js'),
    }),
    esbuild.build({
      ...commonOptions,
      entryPoints: [path.join(root, 'src/background/index.ts')],
      outfile: path.join(dist, 'background.js'),
    }),
    esbuild.build({
      ...commonOptions,
      entryPoints: [path.join(root, 'src/popup/index.ts')],
      outfile: path.join(dist, 'popup/popup.js'),
    }),
  ]);

  fs.copyFileSync(path.join(root, 'manifest.json'), path.join(dist, 'manifest.json'));
  fs.copyFileSync(path.join(root, 'src/popup/index.html'), path.join(dist, 'popup/index.html'));

  console.log('Build done: dist/');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
