export const DEFAULT_SCHOOL_SITE = {
  published: false,
  slug: '',
  schoolName: '',
  tagline: 'Excellence in education & training',
  heroTitle: 'Welcome to our school',
  heroSubtitle: 'Quality courses, expert instructors, and a path to your future.',
  heroImage: null,
  aboutHeading: 'About us',
  aboutBody:
    'We offer professional training programmes designed to equip students with real-world skills. Join our community and start your journey today.',
  features: [
    { title: 'Expert instructors', description: 'Learn from industry professionals with years of experience.' },
    { title: 'Flexible programmes', description: 'Courses designed to fit your schedule and career goals.' },
    { title: 'Proven results', description: 'Track record of successful graduates and satisfied students.' },
  ],
  programs: [
    { title: 'Professional Certificate', description: 'Intensive hands-on training with certification.', fee: '' },
    { title: 'Short Course', description: 'Focused skills development in weeks, not years.', fee: '' },
  ],
  contactPhone: '',
  contactEmail: '',
  contactAddress: '',
  accentColor: '#6366f1',
  ctaText: 'Register now',
  ctaLink: '/register',
}

export const slugify = (value) =>
  (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
