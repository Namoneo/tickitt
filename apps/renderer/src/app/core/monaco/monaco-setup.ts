// Monaco setup for Angular renderer
// We import the full editor for now (workers disabled via webpack config if needed)
import * as monaco from 'monaco-editor';

// Use no-op blob workers — avoids Monaco's postMessage errors without a bundler worker plugin
(self as any).MonacoEnvironment = {
  getWorker(_moduleId: string, _label: string): Worker {
    const blob = new Blob([''], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  },
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
