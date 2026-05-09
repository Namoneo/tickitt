// Monaco setup for Angular renderer
// We import the full editor for now (workers disabled via webpack config if needed)
import * as monaco from 'monaco-editor';

// Disable workers globally
(self as any).MonacoEnvironment = {
  getWorker: () => null as any,
};

monaco.editor.defineTheme('tickitt-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [],
  colors: {
    'editor.background': '#0b0b0e',
    'editorGutter.background': '#0b0b0e',
    'editor.lineHighlightBackground': '#14141a',
    'diffEditor.insertedTextBackground': '#3ecf8e22',
    'diffEditor.removedTextBackground': '#ff6b6b22',
  },
});

export { monaco };
