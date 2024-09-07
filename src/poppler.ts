import os from 'os';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'node:child_process';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const popplerPath = path.join(__dirname, '..', process.env.POPPLER_PATH || '');

console.log(__dirname);
console.log(path.join(__dirname, 'lib'));
console.log(path.join(__dirname, '..', '..'));
console.log(popplerPath);

type Options = Partial<{
  firstPageToConvert: number;
  outputEncoding: string;
  quiet: boolean;
  singlePage: boolean;
  ignoreImages: boolean;
  stdout: boolean;
  wordBreakThreshold: number;
  xmlOutput: boolean;
}>;

const acceptedOptions: Record<keyof Options, { arg: string; type: string }> = {
  firstPageToConvert: { arg: '-f', type: 'number' },
  outputEncoding: { arg: '-enc', type: 'string' },
  quiet: { arg: '-q', type: 'boolean' },
  singlePage: { arg: '-s', type: 'boolean' },
  ignoreImages: { arg: '-i', type: 'boolean' },
  stdout: { arg: '-stdout', type: 'boolean' },
  wordBreakThreshold: { arg: '-wbt', type: 'number' },
  xmlOutput: { arg: '-xml', type: 'boolean' },
};

const pdfToHtml = async (file: Buffer, options?: Options): Promise<Buffer> => {
  try {
    const args: string[] = [];
    if (options) {
      for (const [key, val] of Object.entries(options)) {
        const { arg, type } = acceptedOptions[key as keyof Options];

        args.push(arg);

        if (type !== 'boolean') {
          args.push(val.toString());
        }
      }
    }

    return new Promise((resolve, reject) => {
      const isBuffer = Buffer.isBuffer(file);
      args.push(isBuffer ? '-' : file);
      args.push('-');

      const child = spawn(path.join(popplerPath, 'pdftohtml'), args);

      if (isBuffer) {
        child.stdin.write(file);
        child.stdin.end();
      }

      let stdOut = Buffer.alloc(0);
      let stdErr = '';

      child.stdout.on('data', (data) => {
        stdOut = Buffer.concat([stdOut, data]);
      });

      child.stderr.on('data', (data) => {
        stdErr += data;
      });

      child.on('close', () => {
        if (stdOut.length > 0) {
          resolve(stdOut);
        } else {
          reject(new Error(stdErr ? stdErr.trim() : undefined));
        }
      });
    });
  } catch (err) {
    return Promise.reject(err);
  }
};

export default pdfToHtml;
