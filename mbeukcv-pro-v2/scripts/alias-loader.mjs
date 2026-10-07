import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function withExtension(absolutePath) {
  const candidates = [absolutePath, `${absolutePath}.ts`, `${absolutePath}.tsx`, path.join(absolutePath, 'index.ts')];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const found = withExtension(path.join(root, 'src', specifier.slice(2)));
    if (found) return nextResolve(found, context);
  }
  if (specifier.startsWith('@contracts/')) {
    const found = withExtension(path.join(root, 'contracts', specifier.slice('@contracts/'.length)));
    if (found) return nextResolve(found, context);
  }
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL && !path.extname(specifier)) {
    const parent = fileURLToPath(context.parentURL);
    const found = withExtension(path.resolve(path.dirname(parent), specifier));
    if (found) return nextResolve(found, context);
  }
  return nextResolve(specifier, context);
}
