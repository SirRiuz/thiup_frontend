/**
 * Build seguro y reproducible.
 *
 * - Define las variables del build INLINE aquí (única fuente de la verdad).
 * - IGNORA por completo los archivos `.env*`: los aparta temporalmente antes de
 *   compilar y los restaura al terminar (con `finally`, aunque el build falle),
 *   para que ninguna variable de `.env` se filtre al bundle.
 * - Desactiva los source maps (GENERATE_SOURCEMAP=false) y ofusca el resultado.
 *
 * Uso: `npm run build:secure`
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// Variables del build (única fuente de la verdad — `.env` se ignora).
const buildEnv = {
  ...process.env,
  REACT_APP_API_URL: 'https://api-em7qudoeqrvblg.thiup.com',
  REACT_APP_DEBUG: 'false',
  REACT_APP_GATEWAY_SEED: 'TdaZVzGD3xfX-HOXk8pqFYNxrPsA0MLsxKScIDra_40',
  GENERATE_SOURCEMAP: 'false',
};

// Archivos dotenv que CRA lee en producción (de mayor a menor prioridad).
const DOTENV_FILES = ['.env.production.local', '.env.local', '.env.production', '.env'];
const SUFFIX = '.secure-build-bak';

const moved = [];
for (const name of DOTENV_FILES) {
  const file = path.join(ROOT, name);
  if (fs.existsSync(file)) {
    const bak = file + SUFFIX;
    fs.renameSync(file, bak);
    moved.push([file, bak]);
  }
}

try {
  execSync('react-scripts build', { stdio: 'inherit', env: buildEnv, cwd: ROOT });
  execSync('node scripts/obfuscate.js', { stdio: 'inherit', env: buildEnv, cwd: ROOT });
} finally {
  // Restaura los .env apartados, ocurra lo que ocurra.
  for (const [file, bak] of moved) {
    fs.renameSync(bak, file);
  }
}
