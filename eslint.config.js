import js from '@eslint/js'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tseslint from 'typescript-eslint'

/**
 * Same ruleset the host `spora-frontend` ships. Multi-word component
 * names like `Avatar`, `Icon` are intentional UI primitives.
 */
export default tseslint.config(
    { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
    js.configs.recommended,
    ...vuePlugin.configs['flat/essential'],
    ...vuePlugin.configs['flat/recommended'],
    {
        files: ['**/*.vue'],
        plugins: {
            vue: vuePlugin,
        },
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        rules: {
            'no-undef': 'off',
            'vue/attributes-order': 'off',
            'vue/no-v-html': 'off',
            'vue/no-parsing-error': ['error', { 'end-tag-with-attributes': false }],
            'vue/multi-word-component-names': 'off',
        },
    },
    {
        rules: {
            'no-console': 'warn',
            'no-debugger': 'warn',
        },
    },
    {
        // Build/verify scripts run on Node, and reporting to stdout is
        // their entire output contract.
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            globals: {
                process: 'readonly',
                console: 'readonly',
                URL: 'readonly',
            },
        },
        rules: {
            'no-console': 'off',
        },
    },
)
