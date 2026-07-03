import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const companies = [
"PT. PUTRA INDONESIA SOLUSI",
"PT. PRESTASI INDONESIA SOLUSI"];


export default function CompanyNameAnimator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % companies.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-[hsl(var(--sidebar-ring))] h-4 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: "easeInOut" }} className="text-indigo-600 text-xs font-bold normal-case tracking-wide">


          {companies[index]}
        </motion.p>
      </AnimatePresence>
    </div>);

}