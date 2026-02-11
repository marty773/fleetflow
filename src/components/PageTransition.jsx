import React from 'react';
import { motion } from 'framer-motion';

export default function PageTransition({ children, direction = 'right' }) {
  const variants = {
    hidden: {
      opacity: 0,
      x: direction === 'right' ? 100 : -100,
    },
    visible: {
      opacity: 1,
      x: 0,
    },
    exit: {
      opacity: 0,
      x: direction === 'right' ? -100 : 100,
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variants}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}