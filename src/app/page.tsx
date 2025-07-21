'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { IconLock, IconArrowRight, IconCheck, IconShield, IconTrendingUp, IconCreditCard, IconBell, IconUsers, IconBrandInstagram, IconBrandTwitter, IconBrandLinkedin, IconX } from '@tabler/icons-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { DM_Sans, Inter } from 'next/font/google'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { StickyBanner } from '@/components/ui/sticky-banner'

// Font configurations
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

/* ------------------------------------------------------------
 * Utility hooks & helpers
 * ----------------------------------------------------------*/
function useWaitlistCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetchCount() {
      try {
        const supabase = createClient()
        const { count } = await supabase.from('waitlist').select('*', { count: 'exact', head: true })
        setCount(count || 0)
      } catch (error) {
        console.error('Error fetching waitlist count:', error)
      }
    }
    fetchCount()
  }, [])

  return count
}

/* ------------------------------------------------------------
 * Section 1 – Hero Section
 * ----------------------------------------------------------*/
function HeroSection() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [waitlistCount, setWaitlistCount] = useState<number | null>(94)
  const [submitted, setSubmitted] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchWaitlistCount()
  }, [])

  const fetchWaitlistCount = async () => {
    try {
      const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true })
      
      setWaitlistCount(count || 0)
    } catch (error) {
      console.error('Error fetching waitlist count:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ email }])

      if (error) throw error

      setEmail('')
      await fetchWaitlistCount()
      setSubmitted(true)
    } catch (error: any) {
      if (error.code === '23505') {
        alert('You\'re already on the waitlist!')
      } else {
        alert('Error joining waitlist. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuroraBackground className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <section className="relative min-h-screen flex items-center justify-center py-20 px-4 pt-32">
        <div className="mx-auto max-w-7xl w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <motion.div
              initial={{ opacity: 0.0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                ease: "easeInOut",
              }}
              className="flex flex-col gap-6 text-left"
            >
              <h1 className="text-4xl md:text-6xl font-normal text-slate-900 tracking-tight leading-tight" style={{ fontFamily: 'var(--font-dm-sans)', letterSpacing: '-0.02em' }}>
                The first budgeting app that actually stops you from overspending.
              </h1>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-inter max-w-xl">
                Set your financial goals, and we'll automatically prevent you from spending money that should go toward what matters most. Sign up for updates below.
              </p>

              {/* Email signup form */}
              <div className="max-w-md">

                  <form onSubmit={handleSubmit} className="relative flex-1">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-6 py-4 pr-16 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1c4584] focus:border-transparent font-inter bg-white"
                      required
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#1c4584] hover:bg-[#153a73] text-white rounded-full font-semibold transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <IconArrowRight className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                  
              {/* Waitlist count & security badge */}
              {waitlistCount !== null && (
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600 font-inter">
                  <div className="flex items-center gap-1">
                    <IconUsers className="w-4 h-4" />
                    <span>{waitlistCount.toLocaleString()} joined</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full">
                    <IconLock className="w-3 h-3" />
                    <span className="text-xs">Secure & encrypted</span>
                  </div>
                </div>
              )}
              </div>
              {submitted && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                  <span className="block sm:inline">You're now on the waitlist!</span>
                </div>
              )}
            </motion.div>

            {/* Right side - Phone mockup */}
            <motion.div
              initial={{ opacity: 0.0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.5,
                duration: 0.8,
                ease: "easeInOut",
              }}
              className="flex justify-center lg:justify-end"
            >
              <div className="relative">
                <Image
                  src="/assets/phone.png"
                  alt="Fractal Finance App Preview"
                  width={400}
                  height={800}
                  className="object-contain drop-shadow-2xl"
                  priority
                />
                {/* Optional glow effect behind phone */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 blur-3xl -z-10 scale-110"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Success Modal */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl p-10 shadow-xl flex flex-col items-center relative"
            >
              {/* Animated checkmark */}
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="#16a34a"
                className="w-16 h-16 mb-4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
              >
                <motion.path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </motion.svg>
              <p className="text-lg font-medium text-slate-800 mb-4" style={{ fontFamily: 'var(--font-inter)' }}>
                You're on the list!
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              >
                &times;
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuroraBackground>
  )
}

/* ------------------------------------------------------------
 * Section 1.5 – Why Choose Us (3-Segment Feature List)
 * ----------------------------------------------------------*/
function WhyChooseUsSection() {
  const features = [
    {
      icon: <IconShield className="w-8 h-8 text-[#1c4584]" />,
      title: "Bulletproof Protection",
      description: "Your card automatically declines overspending - no willpower required."
    },
    {
      icon: <IconTrendingUp className="w-8 h-8 text-[#1c4584]" />,
      title: "Automatic Wealth Building", 
      description: "Money you don't spend is instantly allocated to your financial goals."
    },
    {
      icon: <IconUsers className="w-8 h-8 text-[#1c4584]" />,
      title: "Built for Real People",
      description: "Simple automation that works with your lifestyle, not against it."
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-normal text-slate-900 mb-3 font-dm-sans tracking-tight">
                {feature.title}
              </h3>
              <p className="text-slate-600 font-inter leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
 * Section 2 – Alternating Features (Image/Text Pairs)
 * ----------------------------------------------------------*/
function AlternatingFeaturesSection() {
  const features = [
    {
      title: "Smart Spending Controls",
      description: "Your Fractal card automatically declines transactions that would break your budget. No willpower required.",
      image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
      imageAlt: "Smart card with spending controls"
    },
    {
      title: "Automatic Wealth Building",
      description: "Every dollar you don't spend is instantly allocated to your savings and investment goals. Watch your wealth grow automatically without thinking about it.",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80",
      imageAlt: "Growing wealth and investments"
    },
    {
      title: "Real-Time Financial Insights",
      description: "Get instant notifications and insights about your spending patterns. Make informed decisions with clear, actionable data about your financial health.",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80",
      imageAlt: "Financial analytics and insights"
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        {features.map((feature, index) => (
          <div key={index} className={`grid lg:grid-cols-2 gap-20 items-center mb-32 ${index === features.length - 1 ? 'mb-0' : ''}`}>
            {/* Text Content - Left on even indices, Right on odd indices */}
            <motion.div
              initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}
            >
              <h3 className="text-3xl md:text-4xl font-normal text-slate-900 mb-6 tracking-tight" style={{ fontFamily: 'var(--font-dm-sans)', letterSpacing: '-0.02em' }}>
                {feature.title}
              </h3>
              <p className="text-lg text-slate-600 leading-relaxed" style={{ fontFamily: 'var(--font-inter)' }}>
                {feature.description}
              </p>
            </motion.div>

            {/* Image - Right on even indices, Left on odd indices */}
            <motion.div
              initial={{ opacity: 0, x: index % 2 === 0 ? 60 : -60 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ 
                duration: 0.8, 
                delay: 0.3,
                ease: [0.16, 0.77, 0.47, 0.99]
              }}
              className={`${index % 2 === 1 ? 'lg:order-1' : ''} relative`}
            >
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <motion.img
                  src={feature.image}
                  alt={feature.imageAlt}
                  className="w-full h-80 object-cover"
                  initial={{ opacity: 0, scale: 1.05 }}
                  whileInView={{ 
                    opacity: 1, 
                    scale: 1,
                    transition: { 
                      delay: 0.5,
                      duration: 0.8,
                      ease: [0.16, 0.77, 0.47, 0.99]
                    }
                  }}
                />
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-t from-[#1c4584]/20 via-[#1c4584]/5 to-transparent rounded-2xl"
                  initial={{ opacity: 0 }}
                  whileInView={{ 
                    opacity: 1,
                    transition: { 
                      delay: 0.7,
                      duration: 0.8,
                      ease: [0.16, 0.77, 0.47, 0.99]
                    }
                  }}
                />
                {index % 2 === 0 ? (
                  <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent pointer-events-none rounded-2xl" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-l from-white to-transparent pointer-events-none rounded-2xl" />
                )}
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------
 * Section 3 – Features/Benefits (Bento Grid)
 * ----------------------------------------------------------*/
const Skeleton = () => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-slate-50 to-slate-100"></div>
);

const bentoItems = [
  {
    title: "Automatic Budget Enforcement",
    description: "Your prepaid card automatically declines transactions that would break your budget limits. No willpower required.",
    header: <Skeleton />,
  },
  {
    title: "Effortless Wealth Building",
    description: "Money you don't spend is automatically allocated to your savings and investment goals.",
    header: <Skeleton />,
  },
  {
    title: "Smart Spending Insights",
    description: "Get real-time feedback on your spending patterns and progress toward your financial goals.",
    header: <Skeleton />,
  },
  {
    title: "Proactive Notifications",
    description: "Stay informed with intelligent alerts about your spending, savings, and goal progress.",
    header: <Skeleton />,
  },
  {
    title: "Family Financial Planning",
    description: "Coordinate budgets and goals across family members with shared accounts and oversight.",
    header: <Skeleton />,
  },
  {
    title: "Bank-Level Security",
    description: "Your financial data is protected with enterprise-grade encryption and security protocols.",
    header: <Skeleton />,
  },
];

function FeaturesSection() {
  return (
    <section id="features-bento" className="py-24 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-normal text-slate-900 mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Why choose Fractal?
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed" style={{ fontFamily: 'var(--font-inter)' }}>
            Traditional budgeting apps rely on willpower. Fractal removes temptation entirely by automatically 
            enforcing your financial decisions at the point of purchase.
          </p>
        </div>

        <BentoGrid className="max-w-6xl mx-auto">
          {bentoItems.map((item, i) => (
            <BentoGridItem
              key={i}
              title={<span className="font-normal text-slate-900" style={{ fontFamily: 'var(--font-dm-sans)' }}>{item.title}</span>}
              description={<span className="text-slate-600" style={{ fontFamily: 'var(--font-inter)' }}>{item.description}</span>}
              header={item.header}
              className={i === 3 || i === 5 ? "md:col-span-2" : ""}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------
 * Section 4 – FAQ
 * ----------------------------------------------------------*/
const faqs = [
  {
    question: 'How does Fractal prevent overspending?',
    answer: 'Fractal issues you a prepaid card that\'s automatically loaded with your budgeted amounts. When you try to make a purchase that would exceed your budget, the card simply declines the transaction. No willpower required.',
  },
  {
    question: 'What happens to money I don\'t spend?',
    answer: 'Unspent money is automatically allocated according to your financial goals - whether that\'s building an emergency fund, saving for a vacation, or investing for retirement. You set the rules once, and Fractal handles the rest.',
  },
  {
    question: 'Can I use Fractal for family budgeting?',
    answer: 'Yes! Fractal supports family accounts where parents can set budgets for children, couples can coordinate shared expenses, and everyone can work toward common financial goals.',
  },
  {
    question: 'Is my financial data secure?',
    answer: 'Absolutely. Fractal uses bank-level encryption and security protocols. We\'re also working toward SOC 2 compliance and partner with established financial institutions to ensure your money and data are protected.',
  },
  {
    question: 'How is this different from other budgeting apps?',
    answer: 'Most budgeting apps are passive - they track your spending after the fact. Fractal is active - it prevents overspending in real-time by controlling your payment method. It\'s the difference between a rearview mirror and power steering.',
  },
  {
    question: 'When will Fractal be available?',
    answer: 'We\'re currently in private beta with select users. Join our waitlist to be among the first to access Fractal when we launch publicly in early 2024.',
  },
]

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-normal text-slate-900 mb-6" style={{ fontFamily: 'var(--font-dm-sans)' }}>
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="border border-gray-200 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              >
                <h3 className="text-lg font-normal text-slate-900 font-dm-sans">{faq.question}</h3>
                <motion.div
                  animate={{ rotate: openIndex === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-6 h-6 flex items-center justify-center"
                >
                  <div className="w-4 h-0.5 bg-slate-400 absolute" />
                  <div className="w-0.5 h-4 bg-slate-400 absolute" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-8 pb-6">
                      <p className="text-slate-600 leading-relaxed font-inter">{faq.answer}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------
 * Section 5 – Final CTA (Full Section Button)
 * ----------------------------------------------------------*/
function FinalCTA() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="w-full">
      <a href="/waitlist" className="block w-full">
        <motion.div
          className="relative overflow-hidden cursor-pointer group bg-slate-50 w-full"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background fill animation - slides from left to right */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#1c4584] to-[#1c4584]"
            initial={{ x: '-100%' }}
            animate={{ x: isHovered ? '0%' : '-100%' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
          
          {/* Content */}
          <div className="relative z-10 px-6 md:px-12 py-16 flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex-1">
              <h2 className={clsx(
                "text-3xl md:text-4xl font-normal mb-4 transition-colors duration-500 tracking-tight",
                isHovered ? "text-white" : "text-slate-900"
              )} style={{ fontFamily: 'var(--font-dm-sans)', letterSpacing: '-0.02em' }}>
                Ready to take control of your finances?
              </h2>
              <p className={clsx(
                "text-lg leading-relaxed transition-colors duration-500",
                isHovered ? "text-white/90" : "text-slate-600"
              )} style={{ fontFamily: 'var(--font-inter)' }}>
                Join thousands of others building wealth automatically with Fractal.
              </p>
            </div>
            
            {/* Arrow */}
            <motion.div
              className={clsx(
                "ml-8 w-12 h-12 rounded-full flex items-center justify-center transition-colors duration-500",
                isHovered ? "bg-white/20" : "bg-[#1c4584]"
              )}
              animate={{ x: isHovered ? 10 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <IconArrowRight className={clsx(
                "w-6 h-6 transition-colors duration-500",
                isHovered ? "text-white" : "text-white"
              )} />
            </motion.div>
          </div>
        </motion.div>
      </a>
    </section>
  )
}

/* ------------------------------------------------------------
 * Section 6 – Footer
 * ----------------------------------------------------------*/
function Footer() {
  return (
    <footer className="bg-white py-16 border-t border-gray-200">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-8 md:mb-0 flex flex-col items-center md:items-start">
            <div className="flex justify-center md:justify-start ml-2">
              <img 
                src="/assets/logo.png" 
                alt="Fractal Logo" 
                width={120} 
                height={32} 
                className="object-contain" 
              />
            </div>
            <div className="mt-4 flex space-x-4 justify-center ml-3">
              <a href="https://www.instagram.com/fractalcanada/" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#1c4584] transition-colors">
                <IconBrandInstagram className="w-5 h-5" />
              </a>
              <a href="https://x.com/fractalcanada" className="text-slate-600 hover:text-[#1c4584] transition-colors">
                <IconBrandTwitter className="w-5 h-5" />
              </a>
              <a href="https://www.linkedin.com/company/fractalfinance/" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#1c4584] transition-colors">
                <IconBrandLinkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div className="flex flex-col space-y-4 text-center md:text-right">
            <a href="#features-bento" className="text-slate-600 hover:text-slate-900 transition-colors font-inter">
              Features
            </a>
            <a href="#faq" className="text-slate-600 hover:text-slate-900 transition-colors font-inter">
              FAQ
            </a>
            <a href="mailto:contact@fractalfinance.ca" className="text-slate-600 hover:text-slate-900 transition-colors font-inter">
              Contact
            </a>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-slate-500 text-sm font-inter">
            &copy; 2024 Fractal Finance. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------
 * Simple Static Navbar
 * ----------------------------------------------------------*/
function SimpleNavbar() {
  const [shouldSnapToTop, setShouldSnapToTop] = useState(false)

  const navItems = [
    { name: 'Features', link: '#features-bento' },
    { name: 'FAQ', link: '#faq' },
    { name: 'Contact', link: 'mailto:contact@fractalfinance.ca' },
  ]

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const bannerHeight = getComputedStyle(document.documentElement).getPropertyValue('--banner-height')
      const bannerVisible = bannerHeight !== '0px'
      
      // Snap to top if scrolled past 100px OR if banner is dismissed
      setShouldSnapToTop(scrollPosition > 100 || !bannerVisible)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state
    
    // Watch for banner height changes
    const observer = new MutationObserver(handleScroll)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style']
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [])

  return (
    <header 
      className="fixed inset-x-4 z-50 transition-all duration-300 ease-in-out" 
      style={{ 
        top: shouldSnapToTop ? '1rem' : 'calc(1rem + var(--banner-height, 0px))'
      }}
    >
      <nav className="mx-auto max-w-6xl bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <a href="/" className="flex items-center">
            <Image 
              src="/assets/logo.png" 
              alt="Fractal Logo" 
              width={120} 
              height={32} 
              className="object-contain" 
            />
          </a>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.link}
                className="text-slate-700 hover:text-[#1c4584] font-medium transition-colors duration-200"
                style={{ fontFamily: 'var(--font-inter)' }}
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="flex items-center space-x-4">
            <a
              href="/waitlist" 
              className="bg-[#1c4584] hover:bg-[#153a73] text-white px-6 py-2 rounded-2xl font-semibold transition-colors duration-200"
              style={{ fontFamily: 'var(--font-inter)' }}
            >
              Join Waitlist
            </a>
          </div>
        </div>
      </nav>
    </header>
  )
}

/* ------------------------------------------------------------
 * Trusted By Section
 * ----------------------------------------------------------*/
function TrustedBySection() {
  const logos = [
    { name: 'CIBC', src: '/assets/cibc.png', width: 120 },
    { name: 'RBC', src: '/assets/rbc.png', width: 100 },
    { name: 'Flinks', src: '/assets/flinks.png', width: 140 },
    { name: 'Spur', src: '/assets/spur.png', width: 110 }
  ];

  return (
    <AuroraBackground className="py-16">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-center text-sm text-slate-500 mb-8 font-medium" style={{ fontFamily: 'var(--font-inter)' }}>
          Trusted by leaders from:
        </p>
        <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
          {logos.map((logo) => (
            <div key={logo.name} className="flex items-center justify-center">
              <img
                src={logo.src}
                alt={logo.name}
                style={{ width: `${logo.width}px` }}
                className="h-auto opacity-70 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0"
              />
            </div>
          ))}
        </div>
      </div>
    </AuroraBackground>
  );
}

/* ------------------------------------------------------------
 * Main Page Component
 * ----------------------------------------------------------*/
export default function LaunchPage() {
  return (
    <div className={`${dmSans.variable} ${inter.variable} font-sans antialiased scroll-smooth`}>
      <div className="bg-gradient-to-r from-[#1c4584] to-[#153a73] text-white relative">
        <StickyBanner className="bg-transparent relative">
          <p className="text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
            To complete our user research survey for a chance to win a $100 Amazon Gift Card, Click {' '}
            <a
              href="https://forms.gle/rDiq2w46jQk3TCwe6"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              HERE
            </a>
            .
          </p>
        </StickyBanner>
      </div>
      <SimpleNavbar />
      <HeroSection />
      <TrustedBySection />
      <WhyChooseUsSection />
      <AlternatingFeaturesSection />
      <FeaturesSection />
      {/* <HowItWorksSection /> */}
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}