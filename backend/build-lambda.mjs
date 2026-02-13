/**
 * Build Lambda deployment package: copy handler, evaluate, personas-loader, and personas into dist-lambda, then zip.
 * Handler import for evaluate is rewritten to ./evaluate.mjs for the flat bundle.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const lambdaDir = path.join(__dirname, 'lambda');
const personasDir = path.join(root, 'personas');
const outDir = path.join(__dirname, 'dist-lambda');
const outZip = path.join(__dirname, 'dist-lambda.zip');

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((f) => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) rmDir(p);
      else fs.unlinkSync(p);
    });
    fs.rmdirSync(dir);
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach((f) => {
    const s = path.join(src, f);
    const d = path.join(dest, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else copyFile(s, d);
  });
}

rmDir(outDir);
fs.mkdirSync(outDir, { recursive: true });

copyFile(path.join(__dirname, 'evaluate.mjs'), path.join(outDir, 'evaluate.mjs'));
copyFile(path.join(lambdaDir, 'personas-loader.mjs'), path.join(outDir, 'personas-loader.mjs'));
copyDir(personasDir, path.join(outDir, 'personas'));

let handlerCode = fs.readFileSync(path.join(lambdaDir, 'handler.mjs'), 'utf-8');
handlerCode = handlerCode.replace("from '../evaluate.mjs'", "from './evaluate.mjs'");
fs.writeFileSync(path.join(outDir, 'handler.mjs'), handlerCode);

// CDK will zip dist-lambda when deploying
console.log('Lambda bundle ready at', outDir);
console.log('Contents: handler.mjs, evaluate.mjs, personas-loader.mjs, personas/*.json');
