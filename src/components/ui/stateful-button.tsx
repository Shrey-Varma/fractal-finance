"use client";
import React, { useState } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children: React.ReactNode;
}

export const Button = ({ className, children, ...props }: ButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      await props.onClick?.(event);
      
      // Show success state
      setIsLoading(false);
      setShowSuccess(true);
      
      // Reset after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      setIsLoading(false);
      console.error('Button action failed:', error);
    }
  };

  const {
    onClick,
    ...buttonProps
  } = props;

  const baseClasses = "flex min-w-[120px] cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 font-medium text-white transition duration-200 hover:ring-2 ring-offset-2 ring-offset-white dark:ring-offset-black";
  const combinedClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return (
    <button
      className={combinedClasses}
      style={{
        backgroundColor: "#1c4587",
        "--tw-ring-color": "#1c4587"
      } as React.CSSProperties & { [key: string]: string }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.backgroundColor = "#174a7e";
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.backgroundColor = "#1c4587";
        }
      }}
      disabled={isLoading}
      {...buttonProps}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2">
        {isLoading && <Loader />}
        {showSuccess && <CheckIcon />}
        <span>{children}</span>
      </div>
    </button>
  );
};

const Loader = () => {
  return (
    <svg
      className="animate-spin h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

const CheckIcon = () => {
  return (
    <svg
      className="h-4 w-4 text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}; 