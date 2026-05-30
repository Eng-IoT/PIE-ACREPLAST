import { motion } from 'motion/react';

export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, repeatType: "reverse", duration: 1 }}
      className={`animate-pulse bg-surface-hover rounded-sm ${className}`}
    />
  );
}
