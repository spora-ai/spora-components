/**
 * Verifies that every target referenced by `exports` survives into the
 * published tarball.
 *
 * Two defect classes slip past `publint` because it lints the working
 * tree rather than the packed artifact: an exports entry pointing at a
 * file the build does not emit, and a target excluded by the `files`
 * field. Either one ships a package whose subpaths resolve on the
 * author's machine and 404 for every consumer.
 *
 * The script packs and unpacks the tarball into a temp directory it
 * creates itself, so it never reads a path it was handed. That keeps
 * the verification self-contained for the local run and for CI, which
 * means the same command is the only supported invocation.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

/**
 * An exports target that resolves outside the package is a manifest
 * defect, not a path to follow — stat'ing it would assert against a
 * file that is not part of the tarball and report the subpath as fine.
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

function packAndUnpack() {
    const workspace = mkdtempSync(join(tmpdir(), 'spora-components-pack-'))

    try {
        // Fixed binary, argument array, no shell, and every argument
        // derives from mkdtemp rather than from input. npm's own packer
        // defines the published file set, so calling it is the point.
        execFileSync('npm', ['pack', '--pack-destination', workspace, '--silent'], { // NOSONAR jssecurity:S4036
            cwd: packageRoot,
            stdio: 'pipe',
        })

        const tarball = readdirSync(workspace).find((entry) => entry.endsWith('.tgz'))
        if (!tarball) {
            throw new Error('npm pack produced no tarball')
        }

        // As above; tarball is a filename read out of the temp
        // directory, never a caller-supplied path.
        execFileSync('tar', ['-xzf', join(workspace, tarball), '-C', workspace], { stdio: 'pipe' }) // NOSONAR jssecurity:S4036

        return join(workspace, 'package')
    } catch (error) {
        rmSync(workspace, { recursive: true, force: true })
        throw error
    }
}

const unpacked = packAndUnpack()

try {
    const manifest = JSON.parse(readFileSync(join(unpacked, 'package.json'), 'utf8'))

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
            if (!existsSync(resolveWithin(unpacked, target))) reason = 'absent from the tarball'
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
} finally {
    rmSync(join(unpacked, '..'), { recursive: true, force: true })
}
