/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	safelist: [
		'bg-level-0',
		'bg-level-1',
		'bg-level-2',
		'bg-level-3',
		'bg-level-4',
		'bg-level-5',
		'bg-level-6',
		'border-level-0',
		'border-level-1',
		'border-level-2',
		'border-level-3',
		'border-level-4',
		'border-level-5',
		'border-level-6',
		'hover:border-level-0',
		'hover:border-level-1',
		'hover:border-level-2',
		'hover:border-level-3',
		'hover:border-level-4',
		'hover:border-level-5',
		'hover:border-level-6',
	],
	theme: {
		extend: {
			colors: {
				// Deep, confident base palette
				base: {
					50: '#f8fafc',
					100: '#f1f5f9',
					200: '#e2e8f0',
					300: '#cbd5e1',
					400: '#94a3b8',
					500: '#64748b',
					600: '#475569',
					700: '#334155',
					800: '#1e293b',
					900: '#0f172a',
					950: '#020617',
				},
				// Vibrant accent - electric indigo
				accent: {
					50: '#eef2ff',
					100: '#e0e7ff',
					200: '#c7d2fe',
					300: '#a5b4fc',
					400: '#818cf8',
					500: '#6366f1',
					600: '#4f46e5',
					700: '#4338ca',
					800: '#3730a3',
					900: '#312e81',
				},
				// Skill level colors - rich and distinctive
				level: {
					0: '#fecaca', // Soft coral
					1: '#fde68a', // Warm amber
					2: '#bef264', // Fresh lime
					3: '#4ade80', // Vibrant green
					4: '#059669', // Deep emerald
					5: '#7c3aed', // Vivid purple (Mentor)
					6: '#c026d3', // Fuchsia (Expert Externe)
					nc: '#e2e8f0', // Neutral slate
				},
				// Level text colors for contrast
				'level-text': {
					0: '#991b1b',
					1: '#92400e',
					2: '#3f6212',
					3: '#166534',
					4: '#ffffff',
					5: '#ffffff',
					6: '#ffffff',
					nc: '#475569',
				}
			},
			fontFamily: {
				sans: ['Satoshi', 'system-ui', 'sans-serif'],
				display: ['Satoshi', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
			},
			fontSize: {
				'display-xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
				'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
				'display': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
			},
			boxShadow: {
				'glow': '0 0 20px -5px rgba(99, 102, 241, 0.4)',
				'glow-lg': '0 0 40px -10px rgba(99, 102, 241, 0.5)',
				'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
				'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 20px 40px -20px rgba(0, 0, 0, 0.1)',
				'card-hover': '0 1px 3px rgba(0, 0, 0, 0.05), 0 30px 60px -20px rgba(0, 0, 0, 0.15)',
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
				'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-out forwards',
				'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
				'fade-in-down': 'fadeInDown 0.3s ease-out forwards',
				'scale-in': 'scaleIn 0.3s ease-out forwards',
				'slide-in-right': 'slideInRight 0.4s ease-out forwards',
				'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
				'shimmer': 'shimmer 2s linear infinite',
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				fadeInUp: {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				fadeInDown: {
					'0%': { opacity: '0', transform: 'translateY(-10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				scaleIn: {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
				slideInRight: {
					'0%': { opacity: '0', transform: 'translateX(-20px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' },
				},
				pulseSoft: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.7' },
				},
				shimmer: {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' },
				},
			},
			transitionTimingFunction: {
				'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			},
		}
	},
	plugins: []
};
