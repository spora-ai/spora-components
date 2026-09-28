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
import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

/**
 * The directory argument is attacker-reachable in the general case (it
 * arrives on argv, and CI interpolates a runner-temp path into it), so
 * it is pinned to a real directory that actually contains a manifest
 * before any read is attempted. An exports target that resolves
 * outside the package is a manifest defect, not a path to follow.
 */
function validatedRoot(candidate) {
    if (!candidate) {
        console.error('usage: verify-exports.mjs <unpacked-package-dir>')
        process.exit(2)
    }

    const root = resolve(candidate)

    if (!existsSync(root) || !statSync(root).isDirectory()) {
        console.error(`not a directory: ${candidate}`)
        process.exit(2)
    }

    const manifestPath = join(root, 'package.json')
    if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) {
        console.error(`no package.json in ${candidate}`)
        process.exit(2)
    }

    return root
}

function resolveWithin(root, target) {
    const absolute = resolve(root, target)
    const pathFromRoot = relative(root, absolute)

    if (pathFromRoot === '' || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
        throw new Error(`exports target escapes the package directory: ${target}`)
    }
    if (!pathFromRoot.split(sep).every((segment) => segment !== '..')) {
        throw new Error(`exports target contains a traversal segment: ${target}`)
    }

    return absolute
}

const packageRoot = validatedRoot(process.argv[2])
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

const rows = found.map(({ path, target }) => {
    let absolute
    try {
        absolute = resolveWithin(packageRoot, target)
    } catch (error) {
        return { path, target, present: false, reason: error.message }
    }
    return { path, target, present: existsSync(absolute), reason: null }
})

for (const { path, target, present, reason } of rows) {
    console.log(`${present ? 'ok  ' : 'MISS'} ${path} -> ${target}${reason ? ` (${reason})` : ''}`)
}

const bad = rows.filter(({ present }) => !present)

if (bad.length > 0) {
    console.error(`\n${bad.length} exports target(s) missing from the packed tarball:`)
    for (const { path, target, reason } of bad) {
        console.error(`  ${path} -> ${target}${reason ? ` — ${reason}` : ''}`)
    }
    process.exit(1)
}

console.log(`\nall ${rows.length} exports targets present`)
