"use client";
import React, { useState, useEffect } from "react";
import { motion, useMotionValueEvent } from "framer-motion";
import { cn } from "../../../lib/utils";

export const StickyBanner = ({
  className,
  children,
  hideOnScroll = false,
}: {
  className?: string;
  children: React.ReactNode;
  hideOnScroll?: boolean;
}) => {
  const [open, setOpen] = useState(true);

  // update CSS var for navbar displacement
  useEffect(() => {
    document.documentElement.style.setProperty('--banner-height', open ? '56px' : '0px');
  }, [open]);

  if (!open) return null;

  return (
    <motion.div
      className={cn(
        "fixed inset-x-0 top-0 z-[60] flex w-full min-h-14 items-center justify-center px-4 py-3",
        className,
      )}
      initial={{
        y: -100,
        opacity: 0
      }}
      animate={{
        y: open ? 0 : -100,
        opacity: open ? 1 : 0
      }}
      exit={{
        opacity: 0,
        y: -100
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
    >
      {children}

      <motion.button
        initial={{
          scale: 0,
        }}
        animate={{
          scale: 1,
        }}
        className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer"
        onClick={() => setOpen(false)}
      >
        <CloseIcon className="h-5 w-5 text-white" />
      </motion.button>
    </motion.div>
  );
};

const CloseIcon = (props: any) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M18 6l-12 12" />
      <path d="M6 6l12 12" />
    </svg>
  );
};
