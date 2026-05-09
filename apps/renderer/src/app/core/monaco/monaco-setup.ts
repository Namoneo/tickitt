import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

// Disable workers — basic-languages provide tokenisation synchronously.
(self as any).MonacoEnvironment = {
  getWorker(): Worker { return new Worker('data:application/javascript,'); },
};

// Pull in only the language contributions we display in the diff viewer.
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/json/json.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/scss/scss.contribution';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution';
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution';
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';

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
