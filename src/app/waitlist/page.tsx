'use client'

import { AuroraBackgroundSecondary as AuroraBackground } from '@/components/ui/aurora-background-secondary'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'

export default function WaitlistPage() {
  const [hasStarted, setHasStarted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    feature: ''
  })
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [activeFieldType, setActiveFieldType] = useState<'input' | 'textarea' | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const randomDuration = () => 2.7 + Math.random() * 0.6 // between 2.7 – 3.3
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const startPromptRef = useRef<HTMLDivElement>(null)

  const steps = [
    {
      question: "What's your name?",
      example: "e.g. John Smith",
      placeholder: "Type your answer here",
      key: 'name' as keyof typeof formData,
      type: 'text'
    },
    {
      question: "What's your email?",
      example: "e.g. john@company.com",
      placeholder: "Type your answer here",
      key: 'email' as keyof typeof formData,
      type: 'email'
    },
    {
      question: "What feature excites you most?",
      example: "e.g. Automated savings optimization",
      placeholder: "Type your answer here",
      key: 'feature' as keyof typeof formData,
      type: 'textarea'
    }
  ]

  const resetFlow = () => {
    setIsLoading(false)
    setHasStarted(false)
    setCurrentStep(0)
    setFormData({ name: '', email: '', feature: '' })
    setTimeout(() => {
      startPromptRef.current?.focus()
    }, 300)
  }

  const runWithLoading = (callback: () => void) => {
    if (isLoading) return
    setIsLoading(true)
    // Immediate execution without delay
    callback()
    setIsLoading(false)
  }

  const beginFlow = () => {
    if (hasStarted || isLoading) return
    runWithLoading(handleStart)
  }

  const handleStart = () => {
    setHasStarted(true)
    // Immediate focus without delay
    if (steps[0].type === 'textarea') {
      textareaRef.current?.focus()
      setIsInputFocused(true)
      setActiveFieldType('textarea')
    } else {
      inputRef.current?.focus()
      setIsInputFocused(true)
      setActiveFieldType('input')
    }
  }

  const handleStartKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleStart()
    }
  }

  // Function to go to previous step
  const goToPreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      // Immediate focus without delay
      const prevStep = currentStep - 1
      if (steps[prevStep]?.type === 'textarea') {
        textareaRef.current?.focus()
        setIsInputFocused(true)
        setActiveFieldType('textarea')
      } else {
        inputRef.current?.focus()
        setIsInputFocused(true)
        setActiveFieldType('input')
      }
    } else {
      resetFlow()
    }
  }

  // Global key listener for Escape (go back) and Enter (close modal)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showModal) {
          closeModal()
        } else if (hasStarted && !isLoading) {
          goToPreviousStep()
        } else if (!hasStarted) {
          // Do nothing on start screen
        }
      }
      if (e.key === 'Enter' && showModal) {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showModal, hasStarted, isLoading, currentStep])

  // Focus the start prompt when page loads
  useEffect(() => {
    if (!hasStarted && startPromptRef.current) {
      startPromptRef.current.focus()
    }
  }, [])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      // Immediate focus without delay
      const nextStep = currentStep + 1
      if (steps[nextStep]?.type === 'textarea') {
        textareaRef.current?.focus()
        setIsInputFocused(true)
        setActiveFieldType('textarea')
      } else {
        inputRef.current?.focus()
        setIsInputFocused(true)
        setActiveFieldType('input')
      }
    } else {
      // Final submit – show success modal
      console.log('Form submitted:', formData)
      setShowModal(true)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    // Reset form to initial state
    setHasStarted(false)
    setCurrentStep(0)
    setFormData({ name: '', email: '', feature: '' })
    // Refocus start prompt after slight delay
    setTimeout(() => {
      startPromptRef.current?.focus()
    }, 300)
  }

  const handleInputChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      [steps[currentStep].key]: value
    }))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (canProceed && !isLoading) {
        runWithLoading(handleNext)
      }
    }
  }

  useEffect(() => {
    if (hasStarted) {
      setTimeout(() => {
        const currentStepData = steps[currentStep]
        if (currentStepData?.type === 'textarea') {
          textareaRef.current?.focus()
          setActiveFieldType('textarea')
        } else {
          inputRef.current?.focus()
          setActiveFieldType('input')
        }
      }, 700)
    }
  }, [currentStep, hasStarted])

  const handleInputClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setIsInputFocused(true)
    setActiveFieldType('input')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const handleTextareaClick = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setIsInputFocused(true)
    setActiveFieldType('textarea')
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const handleInputFocus = () => {
    setIsInputFocused(true)
    setActiveFieldType('input')
  }

  const handleTextareaFocus = () => {
    setIsInputFocused(true)
    setActiveFieldType('textarea')
  }

  const handleInputBlur = () => {
    // Immediately refocus to prevent losing focus
    setTimeout(() => {
      const currentStepData = steps[currentStep]
      if (currentStepData.type === 'textarea') {
        textareaRef.current?.focus()
        setIsInputFocused(true)
        setActiveFieldType('textarea')
      } else {
        inputRef.current?.focus()
        setIsInputFocused(true)
        setActiveFieldType('input')
      }
    }, 10)
  }

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const canProceed = formData[currentStepData.key].trim().length > 0

  if (!hasStarted) {
    return (
      <AuroraBackground className="min-h-screen cursor-pointer" onClick={beginFlow}>
        {/* Progress bar only for intro to first step transition */}
        {isLoading && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: randomDuration(), ease: 'linear' }}
            className="fixed bottom-0 left-0 w-screen h-1 bg-[#1c4584] origin-left z-50"
            style={{ width: '100vw' }}
          />
        )}
        
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0.0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: "easeInOut",
            }}
            className="relative flex flex-col gap-8 items-center justify-center px-4 text-center"
          >
          <div className="mb-4">
            <img 
              src="/assets/favicon.png" 
              alt="Fractal Finance Logo" 
              className="h-16 md:h-24 mx-auto"
            />
          </div>
          <div className="font-light text-lg md:text-2xl text-slate-700 max-w-2xl font-inter">
            Thank you for joining our waitlist. This should only take a minute.
          </div>
          
          <motion.div
            ref={startPromptRef}
            onClick={beginFlow}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="relative flex items-center gap-3 text-slate-600 font-inter cursor-pointer focus:outline-none overflow-hidden p-2"
            tabIndex={0}
            onKeyDown={handleStartKeyPress}
          >
            <motion.span
              initial={{ scaleX: 0 }}
              animate={hasStarted ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute inset-0 bg-[#1c4584] origin-left"
            />

            <span className="relative z-10">
              {isLoading ? 'Starting...' : 'Click anywhere to begin'}
            </span>
          </motion.div>
          </motion.div>
        </div>
      </AuroraBackground>
    )
  }

  return (
    <AuroraBackground className="min-h-screen">
      
      <div 
        className="flex items-center justify-center min-h-screen px-4"
onClick={(e) => {
          // If clicking outside form area and not in modal, refocus the current input
          if (!showModal && hasStarted && !isLoading) {
            e.preventDefault()
            const currentStepData = steps[currentStep]
            setTimeout(() => {
              if (currentStepData.type === 'textarea') {
                textareaRef.current?.focus()
                setIsInputFocused(true)
                setActiveFieldType('textarea')
              } else {
                inputRef.current?.focus()
                setIsInputFocused(true)
                setActiveFieldType('input')
              }
            }, 0)
          }
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
            className="w-full max-w-2xl"
          >
            {/* Question */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4 font-dm-sans">
                {currentStepData.question}
              </h1>
              <p className="text-lg text-slate-600 font-inter">
                {currentStepData.example}
              </p>
            </div>

            {/* Input Field */}
            <div className="mb-8" onClick={(e) => e.stopPropagation()}>
              {currentStepData.type === 'textarea' ? (
                <textarea
                  ref={textareaRef}
                  autoFocus
                  value={formData[currentStepData.key]}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onClick={handleTextareaClick}
                  onFocus={handleTextareaFocus}
                  onBlur={handleInputBlur}
                  placeholder={currentStepData.placeholder}
                  className={`w-full text-2xl md:text-3xl bg-transparent border-0 border-b-4 pb-4 outline-none font-inter transition-all duration-300 cursor-text resize-none ${
                    isInputFocused && activeFieldType === 'textarea'
                      ? 'border-[#1c4584] font-bold text-black'
                      : 'border-slate-300 text-slate-600'
                  }`}
                  style={{ fontWeight: isInputFocused && activeFieldType === 'textarea' ? 700 : 400 }}
                  rows={2}
                />
              ) : (
                <input
                  ref={inputRef}
                  autoFocus
                  type={currentStepData.type}
                  value={formData[currentStepData.key]}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onClick={handleInputClick}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder={currentStepData.placeholder}
                  className={`w-full text-2xl md:text-3xl bg-transparent border-0 border-b-4 pb-4 outline-none font-inter transition-all duration-300 cursor-text ${
                    isInputFocused && activeFieldType === 'input'
                      ? 'border-[#1c4584] font-bold text-black'
                      : 'border-slate-300 text-slate-600'
                  }`}
                  style={{ fontWeight: isInputFocused && activeFieldType === 'input' ? 700 : 400 }}
                />
              )}
            </div>

            {/* Instructions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: canProceed ? 1 : 0.5 }}
                  className="text-slate-500 font-inter flex items-center gap-2"
                >
                  <span className="text-sm bg-slate-200 px-2 py-1 rounded font-mono">Enter</span>
                  <span>to continue</span>
                </motion.p>
                
                {hasStarted && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-slate-500 font-inter flex items-center gap-2"
                  >
                    <span className="text-sm bg-slate-200 px-2 py-1 rounded font-mono">Esc</span>
                    <span>to go back</span>
                  </motion.p>
                )}
              </div>
              
              <div className="text-sm text-slate-400 font-inter">
                {currentStep + 1} of {steps.length}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

    
    {/* Success Modal */}
    {showModal && (
      <AnimatePresence>
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={closeModal}
        >
          <motion.div
            key="dialog"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative bg-white rounded-xl shadow-2xl p-8 w-11/12 max-w-md text-center"
            onClick={(e)=>e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* Green Checkmark */}
            <div className="flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Thank you!</h2>
            <p className="text-slate-600 mb-6">You have successfully joined our waitlist.</p>

          </motion.div>
        </motion.div>
      </AnimatePresence>
    )}
    </AuroraBackground>
  )
}
