const path = require('node:path');
const { rebuild } = require('@electron/rebuild');

async function main() {
  const root = path.resolve(__dirname);
  const electronVersion = require(path.join(root, 'node_modules/electron/package.json')).version;

  const targets = [
    { buildPath: path.join(root, 'apps/main'), modules: ['keytar'] },
    { buildPath: path.join(root, 'packages/db'), modules: ['better-sqlite3'] },
  ];

  for (const target of targets) {
    await rebuild({
      buildPath: target.buildPath,
      projectRootPath: root,
      electronVersion,
      force: true,
      buildFromSource: true,
      onlyModules: target.modules,
    });
  }

  console.log(`Native modules rebuilt for Electron ${electronVersion}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
