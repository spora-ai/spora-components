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
 * The directory arrives on argv, so it is treated as untrusted until it
 * is proven to name a real package directory: no traversal segments, and
 * the resolved result must actually contain a manifest. CI passes an
 * absolute runner-temp path, so the check is "resolves to a package
 * directory", not "is inside the repository".
 */
function sanitizedRoot(candidate) {
    if (typeof candidate !== 'string' || candidate.trim() === '') {
        throw new Error('usage: verify-exports.mjs <unpacked-package-dir>')
    }

    if (candidate.split(/[\\/]+/).includes('..')) {
        throw new Error(`argument must not contain traversal segments: ${candidate}`)
    }

    const root = resolve(candidate)

    if (!existsSync(root) || !statSync(root).isDirectory()) {
        throw new Error(`not a directory: ${candidate}`)
    }

    const manifestPath = join(root, 'package.json')
    if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) {
        throw new Error(`no package.json in ${candidate}`)
    }

    return root
}

/**
 * An exports target that resolves outside the package is a manifest
 * defect, not a path to follow — stat'ing it would assert against a file
 * that is not part of the tarball and report the subpath as fine.
 */
function resolveWithin(root, target) {
    const absolute = resolve(root, target)
    const rel = relative(root, absolute)

    if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error(`exports target escapes the package directory: ${target}`)
    }
    if (rel.split(sep).includes('..')) {
        throw new Error(`exports target contains a traversal segment: ${target}`)
    }

    return absolute
}

let packageRoot
try {
    packageRoot = sanitizedRoot(process.argv[2])
} catch (error) {
    console.error(error.message)
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

const rows = found.map(({ path, target }) => {
    let reason = null
    try {
        if (!existsSync(resolveWithin(packageRoot, target))) reason = 'absent from the tarball'
    } catch (error) {
        reason = error.message
    }
    return { path, target, ok: reason === null, reason }
})

for (const { path, target, ok, reason } of rows) {
    const detail = reason === null ? '' : ` (${reason})`
    console.log(`${ok ? 'ok  ' : 'MISS'} ${path} -> ${target}${detail}`)
}

const bad = rows.filter(({ ok }) => !ok)

if (bad.length > 0) {
    console.error(`\n${bad.length} exports target(s) unusable in the packed tarball:`)
    for (const { path, target, reason } of bad) {
        console.error(`  ${path} -> ${target} — ${reason}`)
    }
    process.exit(1)
}

console.log(`\nall ${rows.length} exports targets present`)
