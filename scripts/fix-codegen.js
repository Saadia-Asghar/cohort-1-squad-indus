import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const apiZodIndex = path.join(root, 'lib', 'api-zod', 'src', 'index.ts');
const apiClientIndex = path.join(root, 'lib', 'api-client-react', 'src', 'index.ts');

if (fs.existsSync(apiZodIndex)) {
  const content = `/** Runtime Zod schemas generated from OpenAPI (Orval). */
export * from "./generated/api.js";
`;
  fs.writeFileSync(apiZodIndex, content, 'utf8');
  console.log('Fixed api-zod index.ts');
}

if (fs.existsSync(apiClientIndex)) {
  const content = `export * from "./generated/api.js";
export * from "./generated/api.schemas.js";
export { customFetch, setBaseUrl, setAuthTokenGetter } from "./custom-fetch.js";
export type { AuthTokenGetter } from "./custom-fetch.js";
`;
  fs.writeFileSync(apiClientIndex, content, 'utf8');
  console.log('Fixed api-client-react index.ts');
}
