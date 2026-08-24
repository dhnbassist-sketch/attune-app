import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

interface CatalogPackage {
  id: string;
  version: string;
  path: string;
}

interface AttuneCatalog {
  catalogVersion: number;
  themes: CatalogPackage[];
  attunements: CatalogPackage[];
}

const INSTALL_MARKER = '.attune-package.json';

export function resolveCatalogRoot(
  packaged: boolean,
  resourcesPath: string,
  moduleDirectory: string,
  override = process.env.ATTUNE_CATALOG_ROOT,
): string {
  if (override) return resolve(override);
  return packaged
    ? join(resourcesPath, 'attunements')
    : join(resolve(moduleDirectory, '..'), '..', 'attunements');
}

export function readCatalog(catalogRoot: string): AttuneCatalog {
  const catalogPath = join(catalogRoot, 'catalog.json');
  if (!existsSync(catalogPath)) {
    throw new Error(`No Attune package catalog found at ${catalogPath}.`);
  }
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as AttuneCatalog;
  if (catalog.catalogVersion !== 1) {
    throw new Error(`Unsupported Attune catalog version: ${catalog.catalogVersion}.`);
  }
  return catalog;
}

export function installCatalogAttunements(
  catalogRoot: string,
  destinationRoot: string,
  attunementIds?: readonly string[],
): void {
  const catalog = readCatalog(catalogRoot);
  mkdirSync(destinationRoot, { recursive: true });

  const entries = attunementIds
    ? attunementIds.map((id) => {
      const entry = catalog.attunements.find((candidate) => candidate.id === id);
      if (!entry) throw new Error(`Attunement not found in catalog: ${id}`);
      return entry;
    })
    : catalog.attunements;

  for (const entry of entries) {
    installManagedPackage(catalogRoot, destinationRoot, entry, 'attunement');
  }
}

export function seedEditableTheme(catalogRoot: string, destinationRoot: string, themeId: string): void {
  const entry = readCatalog(catalogRoot).themes.find((candidate) => candidate.id === themeId);
  if (!entry) return;

  const destination = join(destinationRoot, entry.id);
  if (existsSync(destination)) return;

  const legacyReference = join(destinationRoot, '_reference', entry.id);
  const source = existsSync(legacyReference)
    ? legacyReference
    : resolvePackagePath(catalogRoot, entry.path);
  cpSync(source, destination, { recursive: true, force: false, errorOnExist: false });
}

function installManagedPackage(
  catalogRoot: string,
  destinationRoot: string,
  entry: CatalogPackage,
  type: 'attunement',
): void {
  const source = resolvePackagePath(catalogRoot, entry.path);
  const destination = join(destinationRoot, entry.id);
  const markerPath = join(destination, INSTALL_MARKER);
  const marker = readInstallMarker(markerPath);

  // A package without our marker may have been customized by the user or may
  // predate the catalog. Preserve it instead of claiming ownership.
  if (existsSync(destination) && !marker) return;
  if (marker?.version === entry.version) return;

  if (marker) rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true, force: true, errorOnExist: false });
  writeFileSync(markerPath, `${JSON.stringify({
    catalogVersion: 1,
    type,
    id: entry.id,
    version: entry.version,
  }, null, 2)}\n`);
}

function resolvePackagePath(catalogRoot: string, packagePath: string): string {
  const root = resolve(catalogRoot);
  const resolved = resolve(root, packagePath);
  if (resolved !== root && !resolved.startsWith(`${root}/`)) {
    throw new Error(`Catalog package escapes its root: ${packagePath}`);
  }
  if (!existsSync(join(resolved, 'manifest.json'))) {
    throw new Error(`Catalog package has no manifest: ${packagePath}`);
  }
  return resolved;
}

function readInstallMarker(markerPath: string): { version?: string } | null {
  if (!existsSync(markerPath)) return null;
  try {
    return JSON.parse(readFileSync(markerPath, 'utf8')) as { version?: string };
  } catch {
    return null;
  }
}
