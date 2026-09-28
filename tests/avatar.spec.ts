import { mount } from '@vue/test-utils'
import Avatar from '@/avatar/Avatar.vue'
import ArchetypeIcon from '@/avatar/ArchetypeIcon.vue'
import AgentAvatar from '@/avatar/AgentAvatar.vue'
import GroupAvatar from '@/avatar/GroupAvatar.vue'
import {
    ARCHETYPES,
    VARIANTS,
    archetypeElements,
} from '@/lib/archetypeSvgs'
import type { ProfilePicture } from '@/types/profilePicture'

const imagePicture: ProfilePicture = {
    kind: 'image',
    archetype: null,
    variant_key: null,
    palette_key: null,
    fg_color: null,
    bg_color: null,
    image_url: 'https://example.test/avatars/abc.png',
    image_updated_at: '2026-09-01T08:00:00Z',
}

const avatarPicture: ProfilePicture = {
    kind: 'avatar',
    archetype: 'researcher',
    variant_key: 'v1',
    palette_key: 'teal',
    fg_color: '#F0FDFA',
    bg_color: '#0F766E',
    image_url: null,
    image_updated_at: null,
}

describe('<Avatar>', () => {
    describe('image branch (profilePicture.kind === "image")', () => {
        it('renders an <img> with image_url and image_updated_at as a ?v= cache buster', () => {
            const wrapper = mount(Avatar, {
                props: { name: 'Max', profilePicture: imagePicture },
            })

            const img = wrapper.find('img')
            expect(img.exists()).toBe(true)
            expect(img.attributes('src')).toBe(
                'https://example.test/avatars/abc.png?v=2026-09-01T08%3A00%3A00Z',
            )
        })

        it('omits the ?v= cache buster when image_updated_at is null', () => {
            const wrapper = mount(Avatar, {
                props: {
                    name: 'Max',
                    profilePicture: { ...imagePicture, image_updated_at: null },
                },
            })

            const img = wrapper.find('img')
            expect(img.attributes('src')).toBe('https://example.test/avatars/abc.png')
            expect(img.attributes('alt')).toContain('uploaded at unknown')
        })

        // isImage narrows on `typeof image_url === 'string'`, so a null URL
        // must fall through to the initials tile rather than emitting an
        // <img src=""> — which browsers resolve against the current page.
        it('falls back to initials when kind is image but image_url is null', () => {
            const wrapper = mount(Avatar, {
                props: {
                    name: 'Max',
                    profilePicture: { ...imagePicture, image_url: null },
                },
            })

            expect(wrapper.find('img').exists()).toBe(false)
            expect(wrapper.get('[data-testid="avatar-initials"]').text()).toBe('MA')
        })

        it('exposes the updated_at timestamp via data-image-updated-at on the <img>', () => {
            const wrapper = mount(Avatar, {
                props: { name: 'Max', profilePicture: imagePicture },
            })
            const img = wrapper.find('img')
            expect(img.attributes('data-image-updated-at')).toBe('2026-09-01T08:00:00Z')
        })

        it('uses the loader background colour (#f1f5f9) on the image branch', () => {
            const wrapper = mount(Avatar, {
                props: { name: 'Max', profilePicture: imagePicture },
            })
            const style = wrapper.attributes('style') ?? ''
            // Vue's style normaliser renders #f1f5f9 as rgb(241, 245, 249).
            expect(style).toMatch(/(#f1f5f9|rgb\(241,\s*245,\s*249\))/)
        })
    })

    describe('avatar branch (profilePicture.kind === "avatar")', () => {
        it('renders an <svg> containing primitives from archetypeSvgs', () => {
            const wrapper = mount(Avatar, {
                props: { name: 'Max', profilePicture: avatarPicture },
            })

            const svg = wrapper.find('svg')
            expect(svg.exists()).toBe(true)

            const primitives = [
                ...svg.findAll('circle'),
                ...svg.findAll('path'),
                ...svg.findAll('rect'),
                ...svg.findAll('line'),
                ...svg.findAll('polyline'),
                ...svg.findAll('polygon'),
            ]
            expect(primitives.length).toBeGreaterThan(0)
        })

        it('uses bg_color from the profile picture as the tile background', () => {
            const wrapper = mount(Avatar, {
                props: { name: 'Max', profilePicture: avatarPicture },
            })
            const style = wrapper.attributes('style') ?? ''
            expect(style).toContain('#0F766E')
        })
    })

    describe('initials fallback (no profilePicture)', () => {
        it('renders uppercase initials derived from name', () => {
            const wrapper = mount(Avatar, { props: { name: 'Max Mustermann' } })
            expect(wrapper.text()).toContain('MM')
        })

        it('renders ? when name is empty', () => {
            const wrapper = mount(Avatar, { props: { name: '' } })
            expect(wrapper.text()).toContain('?')
        })

        it('renders ? when name is null', () => {
            const wrapper = mount(Avatar, { props: { name: null } })
            expect(wrapper.text()).toContain('?')
        })

        it('renders ? when no name prop is supplied', () => {
            const wrapper = mount(Avatar, { props: {} })
            expect(wrapper.text()).toContain('?')
        })

        it('falls back to ? when profilePicture is null and name is empty', () => {
            const wrapper = mount(Avatar, {
                props: { name: '', profilePicture: null },
            })
            expect(wrapper.text()).toContain('?')
        })
    })

    describe('size prop', () => {
        const SIZE_CASES = [
            { size: 'sm', cls: 'avatar--sm' },
            { size: 'md', cls: 'avatar--md' },
            { size: 'lg', cls: 'avatar--lg' },
            { size: 'xl', cls: 'avatar--xl' },
        ] as const

        it.each(SIZE_CASES)(
            'size="$size" applies the $cls class',
            ({ size, cls }) => {
                const wrapper = mount(Avatar, {
                    props: { name: 'Max', size },
                })
                expect(wrapper.classes()).toContain(cls)
            },
        )

        it('defaults to avatar--md when no size prop is supplied', () => {
            const wrapper = mount(Avatar, { props: { name: 'Max' } })
            expect(wrapper.classes()).toContain('avatar--md')
        })
    })
})

describe('<ArchetypeIcon>', () => {
    it('renders SVG primitives matching archetypeElements(archetype, variant)', () => {
        const archetype = 'coder'
        const variant: (typeof VARIANTS)[number] = 'v2'
        const expected = archetypeElements(archetype, variant)

        const wrapper = mount(ArchetypeIcon, {
            props: { archetype, variant },
        })

        expect(wrapper.find('svg').exists()).toBe(true)

        for (const el of expected) {
            expect(wrapper.findAll(el.tag).length).toBeGreaterThan(0)
        }
    })

    it('renders the documented primitive set for every archetype × variant', () => {
        for (const archetype of ARCHETYPES) {
            for (const variant of VARIANTS) {
                const expected = archetypeElements(archetype, variant)
                expect(expected.length).toBeGreaterThan(0)

                const wrapper = mount(ArchetypeIcon, {
                    props: { archetype, variant },
                })
                expect(wrapper.find('svg').exists()).toBe(true)

                for (const el of expected) {
                    expect(
                        wrapper.findAll(el.tag).length,
                        `${archetype}/${variant} should render <${el.tag}>`,
                    ).toBeGreaterThan(0)
                }
            }
        }
    })

    it('passes through svgClass to the rendered <svg>', () => {
        const wrapper = mount(ArchetypeIcon, {
            props: {
                archetype: 'assistant',
                variant: 'v0',
                svgClass: 'text-slate-500',
            },
        })
        const svg = wrapper.find('svg')
        expect(svg.exists()).toBe(true)
        expect(svg.classes()).toContain('text-slate-500')
    })

    it('passes through svgStyle to the rendered <svg>', () => {
        const wrapper = mount(ArchetypeIcon, {
            props: {
                archetype: 'assistant',
                variant: 'v0',
                svgStyle: 'opacity: 0.4',
            },
        })
        const svg = wrapper.find('svg')
        expect(svg.exists()).toBe(true)
        expect(svg.attributes('style')).toContain('opacity: 0.4')
    })

    it('attaches role="img" + aria-label when ariaLabel is supplied', () => {
        const wrapper = mount(ArchetypeIcon, {
            props: {
                archetype: 'assistant',
                variant: 'v0',
                ariaLabel: 'Researcher avatar',
            },
        })
        const svg = wrapper.find('svg')
        expect(svg.attributes('role')).toBe('img')
        expect(svg.attributes('aria-label')).toBe('Researcher avatar')
    })

    it('marks the SVG aria-hidden when no ariaLabel is supplied', () => {
        const wrapper = mount(ArchetypeIcon, {
            props: { archetype: 'assistant', variant: 'v0' },
        })
        const svg = wrapper.find('svg')
        expect(svg.attributes('aria-hidden')).toBe('true')
        expect(svg.attributes('aria-label')).toBeUndefined()
    })
})

describe('<AgentAvatar>', () => {
    it('forwards agent.name and agent.profile_picture to <Avatar>', () => {
        const agent = {
            name: 'Sandra',
            profile_picture: avatarPicture,
        }

        const wrapper = mount(AgentAvatar, { props: { agent } })
        const avatar = wrapper.findComponent(Avatar)

        expect(avatar.exists()).toBe(true)
        expect(avatar.props('name')).toBe('Sandra')
        expect(avatar.props('profilePicture')).toEqual(avatarPicture)
    })

    it('forwards the size prop unchanged', () => {
        const wrapper = mount(AgentAvatar, {
            props: { agent: { name: 'Sandra' }, size: 'xl' },
        })
        const avatar = wrapper.findComponent(Avatar)
        expect(avatar.props('size')).toBe('xl')
    })
})

describe('<GroupAvatar>', () => {
    it('forwards group.name and group.profile_picture to <Avatar>', () => {
        const group = {
            name: 'Marketing',
            profile_picture: avatarPicture,
        }

        const wrapper = mount(GroupAvatar, { props: { group } })
        const avatar = wrapper.findComponent(Avatar)

        expect(avatar.exists()).toBe(true)
        expect(avatar.props('name')).toBe('Marketing')
        expect(avatar.props('profilePicture')).toEqual(avatarPicture)
    })

    it('forwards the size prop unchanged', () => {
        const wrapper = mount(GroupAvatar, {
            props: { group: { name: 'Marketing' }, size: 'lg' },
        })
        const avatar = wrapper.findComponent(Avatar)
        expect(avatar.props('size')).toBe('lg')
    })
})