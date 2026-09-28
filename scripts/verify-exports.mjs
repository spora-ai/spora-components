/**
 * Asserts every target referenced by `exports` is present in the tree
 * being checked (the unpacked npm tarball, passed as argv[2]).
 *
 * Two defect classes slip past `publint` because it lints the working
 * tree rather than the packed artifact: an exports entry pointing at a
 * file the build does not emit, and a target excluded by the `files`
 * field. Either one ships a package whose subpaths resolve on the
 * author's machine and 404 for every consumer.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const packageRoot = process.argv[2]

if (!packageRoot) {
    console.error('usage: verify-exports.mjs <unpacked-package-dir>')
    process.exit(2)
}

const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))

function collectTargets(node, path, found) {
    if (typeof node === 'string') {
        found.push({ path, target: node })
        return
    }
    if (Array.isArray(node)) {
        for (const entry of node) collectTargets(entry, path, found)
        return
    }
    if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
            collectTargets(value, key === 'types' || key === 'import' || key === 'default' ? path : `${path}.${key}`, found)
        }
    }
}

const found = []
collectTargets(manifest.exports ?? {}, 'exports', found)

if (found.length === 0) {
    console.error('no exports targets found in the manifest')
    process.exit(1)
}

const missing = found.filter(({ target }) => !existsSync(resolve(packageRoot, target)))

for (const { path, target } of found) {
    const status = existsSync(resolve(packageRoot, target)) ? 'ok  ' : 'MISS'
    console.log(`${status} ${path} -> ${target}`)
}

if (missing.length > 0) {
    console.error(`\n${missing.length} exports target(s) missing from the packed tarball:`)
    for (const { path, target } of missing) console.error(`  ${path} -> ${target}`)
    process.exit(1)
}

console.log(`\nall ${found.length} exports targets present`)
