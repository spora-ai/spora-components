import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/**
 * Vite lib-mode build for @spora-ai/components. One entry per public
 * subpath in `package.json#exports` (`avatar`, `icons`, `composables`,
 * `lib`). Vue is external — consumers resolve it from their own
 * `node_modules` and pass their `vue@^3.5` to runtime via the
 * `peerDependencies` declaration in package.json.
 */
export default defineConfig({
    plugins: [vue()],

    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, './src'),
        },
    },

    build: {
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: true,
        lib: {
            entry: {
                avatar: path.resolve(import.meta.dirname, 'src/avatar/index.ts'),
                icons: path.resolve(import.meta.dirname, 'src/icons/index.ts'),
                composables: path.resolve(import.meta.dirname, 'src/composables/index.ts'),
                lib: path.resolve(import.meta.dirname, 'src/lib/index.ts'),
            },
            formats: ['es'],
        },
        rollupOptions: {
            external: ['vue'],
            output: {
                globals: { vue: 'Vue' },
                assetFileNames: 'spora-components.[ext]',
            },
        },
    },

    test: {
        environment: 'happy-dom',
        globals: true,
        include: ['tests/**/*.spec.ts'],
        setupFiles: ['tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['lcov', 'text'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{ts,vue}'],
        },
    },
})
