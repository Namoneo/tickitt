const { rebuild } = require('electron-rebuild');

async function main() {
  await rebuild({
    buildPath: __dirname,
    electronVersion: require('electron/package.json').version,
    force: true,
  });
  console.log('Rebuild complete!');
}

main().catch(console.error);
