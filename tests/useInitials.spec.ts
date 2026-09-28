import { ref } from 'vue'
import { useInitials } from '@/composables/useInitials'

describe('useInitials', () => {
    it('returns first letter of each of the first two parts for a two-word name', () => {
        expect(useInitials('Max Mustermann').value).toBe('MM')
    })

    it('returns first two upper-cased chars for a single multi-char word', () => {
        expect(useInitials('sandra').value).toBe('SA')
    })

    it('returns upper-cased single char for a one-char input', () => {
        expect(useInitials('a').value).toBe('A')
    })

    it('returns ? for an empty string', () => {
        expect(useInitials('').value).toBe('?')
    })

    it('returns ? for null', () => {
        expect(useInitials(null).value).toBe('?')
    })

    it('returns ? for undefined', () => {
        expect(useInitials(undefined).value).toBe('?')
    })

    it('uses only the first two parts when the name has three or more words', () => {
        expect(useInitials('Max Maria Mustermann').value).toBe('MM')
    })

    it('trims surrounding whitespace before splitting', () => {
        expect(useInitials('  Max  Mustermann  ').value).toBe('MM')
    })

    it('re-evaluates when the underlying ref changes', () => {
        const name = ref('Alice Adams')
        const initials = useInitials(name)
        expect(initials.value).toBe('AA')

        name.value = 'Bob Brown'
        expect(initials.value).toBe('BB')

        name.value = ''
        expect(initials.value).toBe('?')
    })

    it('re-evaluates when the underlying getter changes', () => {
        const target = ref('Carol Clark')
        const initials = useInitials(() => target.value)
        expect(initials.value).toBe('CC')

        target.value = 'Dan Doe'
        expect(initials.value).toBe('DD')
    })
})