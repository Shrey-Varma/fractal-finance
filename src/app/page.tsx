'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

// Floating Particle Component
const FloatingParticle = ({ delay = 0, duration = 20, size = 4 }) => {
  return (
    <motion.div
      className="absolute rounded-full opacity-30"
      style={{
        width: size,
        height: size,
        backgroundColor: '#1c4587',
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
      }}
      animate={{
        x: [0, 100, -50, 0],
        y: [0, -100, 50, 0],
        opacity: [0.3, 0.7, 0.3],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

// Animated Counter Component
const AnimatedCounter = ({ target, suffix = '', prefix = '' }: { target: number, suffix?: string, prefix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) {
      const timer = setInterval(() => {
        setCount((prev) => {
          if (prev < target) {
            return Math.min(prev + Math.ceil(target / 50), target);
          }
          return target;
        });
      }, 50);

      return () => clearInterval(timer);
    }
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.8]);
  
  const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
  const x = useSpring(useTransform(scrollYProgress, [0, 1], ['0%', '100%']), springConfig);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated Background Particles */}
      <div className="fixed inset-0 z-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <FloatingParticle 
            key={i} 
            delay={i * 0.2} 
            duration={15 + Math.random() * 10}
            size={2 + Math.random() * 6}
          />
        ))}
      </div>

      {/* Animated Gradient Orbs */}
      <div className="fixed inset-0 z-0">
        <motion.div
          className="absolute w-96 h-96 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #1c4587 0%, transparent 70%)',
            top: '10%',
            left: '10%',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute w-72 h-72 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
            bottom: '10%',
            right: '10%',
          }}
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav 
        className="relative bg-black/20 backdrop-blur-md border-b border-white/10 z-50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <img src="/assets/logo.png" alt="Fractal" className="h-12 w-auto filter brightness-0 invert" />
            </motion.div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-white/80 hover:text-white font-medium transition-colors duration-300"
              >
                Sign In
              </Link>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/login"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div 
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32 text-center z-10"
          style={{ y, opacity, scale }}
        >
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <motion.h1 
              className="text-6xl sm:text-7xl lg:text-8xl font-bold leading-tight mb-8"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #3b82f6 50%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Your Money,
              <br />
              <motion.span
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  background: 'linear-gradient(90deg, #1c4587, #3b82f6, #8b5cf6, #1c4587)',
                  backgroundSize: '200% 100%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Automated
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-xl sm:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              Transform simple commands into powerful financial automation. 
              Set rules once, let Fractal handle your money management automatically.
            </motion.p>
            
                         {/* Demo Example with Enhanced Animation */}
             <motion.div 
               className="mt-16 max-w-2xl mx-auto"
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 1, delay: 0.8 }}
             >
               <motion.div 
                 className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl"
                 whileHover={{ 
                   scale: 1.02,
                   boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                 }}
                 transition={{ type: "spring", stiffness: 300, damping: 30 }}
               >
                 <div className="text-left">
                   <motion.div 
                     className="flex items-center space-x-3 mb-5"
                     initial={{ x: -50, opacity: 0 }}
                     animate={{ x: 0, opacity: 1 }}
                     transition={{ duration: 0.8, delay: 1 }}
                   >
                     <motion.div 
                       className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center"
                       animate={{ rotate: [0, 360] }}
                       transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                     >
                       <span className="text-white font-bold text-lg">💬</span>
                     </motion.div>
                     <div className="flex-1">
                       <motion.p 
                         className="text-white font-semibold text-lg leading-tight"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ duration: 1, delay: 1.2 }}
                       >
                         "Move 10% of my paycheck to my TFSA"
                       </motion.p>
                     </div>
                   </motion.div>
                   
                   <motion.div 
                     className="flex items-center justify-center my-6"
                     initial={{ scale: 0 }}
                     animate={{ scale: 1 }}
                     transition={{ duration: 0.5, delay: 1.5 }}
                   >
                     <motion.div 
                       className="w-12 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded"
                       animate={{ width: [0, 48, 0] }}
                       transition={{ duration: 2, delay: 1.5, repeat: Infinity, repeatDelay: 3 }}
                     />
                     <motion.div 
                       className="mx-4 text-2xl"
                       animate={{ 
                         x: [0, 8, 0],
                         scale: [1, 1.1, 1]
                       }}
                       transition={{ duration: 2, delay: 1.5, repeat: Infinity, repeatDelay: 3 }}
                     >
                       ⚡
                     </motion.div>
                     <motion.div 
                       className="w-12 h-0.5 bg-gradient-to-r from-purple-400 to-blue-400 rounded"
                       animate={{ width: [0, 48, 0] }}
                       transition={{ duration: 2, delay: 1.7, repeat: Infinity, repeatDelay: 3 }}
                     />
                   </motion.div>
                   
                   <motion.div 
                     className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-400/30"
                     initial={{ y: 50, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     transition={{ duration: 0.8, delay: 2 }}
                   >
                     <motion.p 
                       className="text-green-400 font-semibold mb-1 flex items-center text-sm"
                       initial={{ x: -20, opacity: 0 }}
                       animate={{ x: 0, opacity: 1 }}
                       transition={{ duration: 0.5, delay: 2.2 }}
                     >
                       <motion.span 
                         className="mr-2"
                         animate={{ scale: [1, 1.2, 1] }}
                         transition={{ duration: 1, delay: 2.2, repeat: Infinity, repeatDelay: 2 }}
                       >
                         ✅
                       </motion.span>
                       Automated Rule Created
                     </motion.p>
                     <motion.p 
                       className="text-blue-300 font-medium text-sm"
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       transition={{ duration: 1, delay: 2.5 }}
                     >
                       Every paycheck → 10% automatically saved to TFSA
                     </motion.p>
                   </motion.div>
                 </div>
               </motion.div>
             </motion.div>

            <motion.div 
              className="mt-16 flex flex-col sm:flex-row gap-4 justify-center items-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 1.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Link
                  href="/login"
                  className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xl px-12 py-4 rounded-full font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform"
                >
                  Start Automating
                </Link>
              </motion.div>
              <motion.button 
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white text-xl px-12 py-4 rounded-full font-semibold border border-white/30 hover:border-white/50 transition-all duration-300"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                Watch Demo
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <motion.div 
              className="w-1 h-3 bg-white rounded-full mt-2"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section with Scroll Animations */}
      <section className="py-32 bg-gradient-to-r from-slate-900/50 to-purple-900/50 backdrop-blur-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6">
              Why Choose 
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Fractal?</span>
            </h2>
            <p className="text-2xl text-white/70 max-w-3xl mx-auto">
              Powerful automation that adapts to your financial goals
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: '🤖', title: 'Natural Language Rules', description: 'Just tell Fractal what you want in plain English. No complex setup or configuration required.', delay: 0 },
              { icon: '🔒', title: 'Bank-Level Security', description: 'Your data is protected with enterprise-grade encryption and security protocols.', delay: 0.2 },
              { icon: '⚡', title: 'Instant Automation', description: 'Rules activate immediately and work 24/7 to manage your finances automatically.', delay: 0.4 }
            ].map((feature, index) => (
              <motion.div 
                key={index}
                className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:border-white/30 transition-all duration-500"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: feature.delay }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.05,
                  y: -10,
                  boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.3)"
                }}
              >
                <motion.div 
                  className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-8 mx-auto"
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.8 }}
                >
                  <span className="text-4xl">{feature.icon}</span>
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-4 text-center">
                  {feature.title}
                </h3>
                <p className="text-white/70 leading-relaxed text-center text-lg">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

             {/* How It Works with Timeline Animation */}
       <section className="py-32 bg-gradient-to-l from-slate-900/50 to-purple-900/50 relative">
         <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
           <motion.div 
             className="text-center mb-20"
             initial={{ opacity: 0, y: 50 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ duration: 1 }}
             viewport={{ once: true }}
           >
             <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6">How It Works</h2>
             <p className="text-xl text-white/70">Get started in minutes, not hours</p>
           </motion.div>

           <div className="relative">
             {/* Use flexbox for proper alignment on desktop */}
             <div className="hidden md:flex items-start justify-center gap-8">
               {[
                 { step: '1', title: 'Connect Your Bank', description: 'Securely link your bank accounts with our trusted Plaid integration.', delay: 0 },
                 { step: '2', title: 'Create Rules', description: 'Tell Fractal your financial goals in simple, everyday language.', delay: 0.3 },
                 { step: '3', title: 'Watch It Work', description: 'Fractal automatically executes your rules and manages your money.', delay: 0.6 }
               ].map((step, index) => (
                 <React.Fragment key={index}>
                   <motion.div 
                     className="text-center flex-1 max-w-xs"
                     initial={{ opacity: 0, y: 50 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     transition={{ duration: 1, delay: step.delay }}
                     viewport={{ once: true }}
                   >
                     <motion.div 
                       className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-gradient-to-r from-blue-600 to-purple-600 shadow-2xl relative"
                       whileHover={{ 
                         scale: 1.1,
                         rotate: 360,
                         boxShadow: "0 0 40px rgba(59, 130, 246, 0.6)"
                       }}
                       transition={{ duration: 0.8 }}
                     >
                       {/* Glow effect background */}
                       <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-50 -z-10" />
                       <span className="text-white font-bold text-2xl">{step.step}</span>
                     </motion.div>
                     <h3 className="text-xl font-bold text-white mb-3">
                       {step.title}
                     </h3>
                     <p className="text-white/70 text-base leading-relaxed">
                       {step.description}
                     </p>
                   </motion.div>
                   
                   {/* Arrow between steps - positioned at circle level */}
                   {index < 2 && (
                     <motion.div
                       className="flex items-start justify-center pt-10"
                       initial={{ opacity: 0, x: -20 }}
                       whileInView={{ opacity: 1, x: 0 }}
                       transition={{ duration: 0.8, delay: step.delay + 0.5 }}
                       viewport={{ once: true }}
                     >
                       <motion.div 
                         className="text-blue-400 text-3xl"
                         animate={{ 
                           x: [0, 8, 0],
                           scale: [1, 1.1, 1]
                         }}
                         transition={{ 
                           duration: 2, 
                           repeat: Infinity, 
                           ease: "easeInOut",
                           delay: step.delay + 1
                         }}
                       >
                         →
                       </motion.div>
                     </motion.div>
                   )}
                 </React.Fragment>
               ))}
             </div>

             {/* Mobile layout - simple grid without arrows */}
             <div className="md:hidden grid grid-cols-1 gap-8">
               {[
                 { step: '1', title: 'Connect Your Bank', description: 'Securely link your bank accounts with our trusted Plaid integration.', delay: 0 },
                 { step: '2', title: 'Create Rules', description: 'Tell Fractal your financial goals in simple, everyday language.', delay: 0.3 },
                 { step: '3', title: 'Watch It Work', description: 'Fractal automatically executes your rules and manages your money.', delay: 0.6 }
               ].map((step, index) => (
                 <motion.div 
                   key={index}
                   className="text-center"
                   initial={{ opacity: 0, y: 50 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   transition={{ duration: 1, delay: step.delay }}
                   viewport={{ once: true }}
                 >
                   <motion.div 
                     className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-gradient-to-r from-blue-600 to-purple-600 shadow-2xl relative"
                     whileHover={{ 
                       scale: 1.1,
                       rotate: 360,
                       boxShadow: "0 0 40px rgba(59, 130, 246, 0.6)"
                     }}
                     transition={{ duration: 0.8 }}
                   >
                     {/* Glow effect background */}
                     <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-lg opacity-50 -z-10" />
                     <span className="text-white font-bold text-2xl">{step.step}</span>
                   </motion.div>
                   <h3 className="text-xl font-bold text-white mb-3">
                     {step.title}
                   </h3>
                   <p className="text-white/70 text-base leading-relaxed max-w-xs mx-auto">
                     {step.description}
                   </p>
                 </motion.div>
               ))}
             </div>
           </div>
         </div>
       </section>

      {/* Stats Section with Animated Counters */}
      <section className="py-32 bg-gradient-to-r from-blue-900/50 to-purple-900/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl sm:text-6xl font-bold text-white mb-16">
              Trusted by 
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> Smart Savers</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-12">
              {[
                { value: 10000, suffix: '+', label: 'Active Users' },
                { value: 50, suffix: 'M+', prefix: '$', label: 'Automated Savings' },
                { value: 99.9, suffix: '%', label: 'Uptime' }
              ].map((stat, index) => (
                <motion.div 
                  key={index}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.4)"
                  }}
                >
                  <div className="text-5xl font-bold text-white mb-4">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                  </div>
                  <div className="text-blue-200 text-xl">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA with Spectacular Animation */}
      <section className="py-32 bg-gradient-to-t from-black to-slate-900 relative overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
        >
          <motion.h2 
            className="text-6xl sm:text-7xl font-bold text-white mb-8"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #3b82f6 50%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Ready to Automate Your Finances?
          </motion.h2>
          <p className="text-2xl text-white/80 mb-16 max-w-3xl mx-auto leading-relaxed">
            Join thousands of users who have automated their financial goals with Fractal.
          </p>
          <motion.div
            whileHover={{ scale: 1.05, y: -10 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 text-white px-16 py-6 rounded-full font-bold text-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 transform inline-block bg-size-200 bg-pos-0 hover:bg-pos-100"
              style={{
                backgroundSize: '200% 100%',
                backgroundPosition: '0% 0%',
              }}
            >
              Get Started for Free
            </Link>
          </motion.div>
        </motion.div>

        {/* Final floating particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-40"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-black py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center justify-center mb-8">
              <motion.img 
                src="/assets/logo.png" 
                alt="Fractal" 
                className="h-16 w-auto filter brightness-0 invert"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 10 }}
              />
            </div>
            <p className="text-white/60 mb-8 text-xl">
              Intelligent financial automation for everyone
            </p>
            <div className="flex justify-center space-x-8 text-white/50">
              {['Privacy', 'Terms', 'Support'].map((link) => (
                <motion.a 
                  key={link}
                  href="#" 
                  className="hover:text-white transition-colors duration-300 text-lg"
                  whileHover={{ scale: 1.1, y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {link}
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
} 