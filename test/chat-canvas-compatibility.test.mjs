import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const attunementRoot = join(root, '..', 'attunements', 'attunements', 'codex-multi-chat');

test('Chat Canvas declares semantic host bindings', async () => {
  const manifest = JSON.parse(await readFile(join(attunementRoot, 'manifest.json'), 'utf8'));
  const patch = manifest.targets.Codex;

  assert.equal(manifest.manifestVersion, 2);
  assert.equal(patch.bindings.main.role, 'codex.primaryChat');
  assert.equal(patch.bindings.main.required, true);
  assert.equal(patch.bindings.composer.role, 'codex.composer');
  assert.equal(patch.bindings.timeline.role, 'codex.timeline');
  assert.equal(patch.bindings.header.required, false);
});

test('Chat Canvas targets Attune roles with a semantic staged-upgrade fallback', async () => {
  const [styles, script] = await Promise.all([
    readFile(join(attunementRoot, 'apps', 'codex-chat-canvas.css'), 'utf8'),
    readFile(join(attunementRoot, 'apps', 'codex-chat-canvas.js'), 'utf8'),
  ]);

  assert.match(styles, /data-attune-host-roles~="codex\.primaryChat"/);
  assert.match(styles, /data-attune-host-roles~="codex\.chatHeader"/);
  assert.match(script, /main\[data-app-shell-main-surface\]/);
  assert.doesNotMatch(script, /document\.querySelector\('main\.main-surface'\)/);
});

test('Chat Canvas waits for its shell and adds chats only through an explicit control', async () => {
  const [source, styles] = await Promise.all([
    readFile(join(attunementRoot, 'apps', 'codex-chat-canvas.js'), 'utf8'),
    readFile(join(attunementRoot, 'apps', 'codex-chat-canvas.css'), 'utf8'),
  ]);

  assert.match(source, /if \(!main \|\| !shell\) return;/);
  assert.doesNotMatch(source, /if \(!main \|\| !shell \|\| !window\.electronBridge\?\.sendMessageFromView\) return;/);
  assert.match(source, /const runWhenReady = \(\) =>/);
  assert.match(source, /if \(!initialMain\?\.parentElement\) \{/);
  assert.match(source, /window\.setTimeout\(runWhenReady, 50\)/);
  assert.match(source, /const addThreadToCanvas = \(row\) =>/);
  assert.match(source, /add\.className = 'attune-canvas-add-thread'/);
  assert.match(source, /nativeMenu\.parentElement\.insertBefore\(add, nativeMenu\)/);
  assert.match(source, /add\.addEventListener\('click'/);
  assert.match(source, /showCanvas\(\);\s+void openCard\(threadId, sidebarThreadTitle\(row\)\)/);
  assert.match(source, /if \(!cards\.has\(threadId\) && cards\.size >= 3\)/);
  assert.match(source, /const onPassiveSidebarNavigation = \(event\) => \{/);
  assert.doesNotMatch(source, /onSidebarPointerDown|onSidebarMouseDown|onSidebarClick|openSidebarThreadIntent/);
  assert.doesNotMatch(source, /onPassiveSidebarNavigation = \(event\) => \{[\s\S]{0,700}event\.preventDefault\(/);
  assert.match(styles, /\.attune-canvas-add-thread/);
  assert.match(styles, /flex: 0 0 18px/);
  assert.match(styles, /--attune-canvas-thread-action-space: 42px/);
  assert.match(source, /const cardCount = Math\.max\(1, openNodes\.length\)/);
  assert.match(source, /availableCanvasWidth - canvasGap \* \(cardCount - 1\)/);
  assert.match(source, /const mountedTranscriptText = \[\.\.\.host\.querySelectorAll\(/);
  assert.match(source, /Native task transcript did not mount\./);
  assert.match(source, /document\.querySelectorAll\('\.attune-canvas-add-thread'\)\.forEach\(\(button\) => button\.remove\(\)\)/);
  assert.match(styles, /body:not\(\.attune-codex-chat-canvas-active\) \.attune-codex-chat-card/);
  assert.doesNotMatch(styles, /body\.attune-codex-chat-canvas-active\s+\[data-app-shell-sidebar-trigger\]\s*\{\s*display: none/);
  assert.match(source, /if \(cards\.size >= 3\)/);
  assert.match(source, /#attune-codex-kanban-manual-nav/);
});

test('Chat Canvas discovers native rendering by capabilities instead of minified names', async () => {
  const source = await readFile(join(attunementRoot, 'apps', 'codex-chat-canvas.js'), 'utf8');

  assert.match(source, /reactRuntimeCapabilities/);
  assert.match(source, /bundledCommonJsLoader/);
  assert.match(source, /nativeTaskSurfaceScore/);
  assert.match(source, /hasFiberProps\(fiber, \['clientThreadId', 'conversationId'\]\)/);
  assert.doesNotMatch(source, /module\.Nvt/);
  assert.doesNotMatch(source, /module\.ept/);
  assert.doesNotMatch(source, /fiber\.type\?\.name !== 'EO'/);
  assert.doesNotMatch(source, /fiber\.type\?\.name !== '\$u'/);
});
