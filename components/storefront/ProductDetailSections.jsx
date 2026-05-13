'use client';
import { useState } from 'react';
import { Check, Circle, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AccordionSections({ openSections, toggleSection, description, category, sku }) {
  const [descExpanded, setDescExpanded] = useState(false);

  return (
    <div className="divide-y divide-sf-border-light border-t border-b border-sf-border-light mt-8">
      {/* Item Details — the only section kept */}
      <div className="flex flex-col">
        <button onClick={() => toggleSection('details')} className="w-full flex items-center justify-between py-5 hover:bg-black/[0.01] transition-colors">
          <span className="font-bold text-[15px]">Item details</span>
          <ChevronUp className={`w-5 h-5 transition-transform duration-300 ${openSections.includes('details') ? '' : 'rotate-180'}`} />
        </button>
        <AnimatePresence initial={false}>
          {openSections.includes('details') && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="pb-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-[15px] opacity-80 uppercase tracking-wide text-xs">Highlights</h3>
                  <ul className="space-y-3.5 text-[15.4px]">
                    <li className="flex items-start gap-3.5">
                      <Check className="w-5 h-5 mt-0.5 text-sf-accent-green" />
                      <span>Category: <span className="font-bold">{category}</span></span>
                    </li>
                    <li className="flex items-start gap-3.5 text-sf-primary-light">
                      <Circle className="w-5 h-5 mt-0.5 fill-sf-primary-light/10" />
                      <span>SKU: {sku}</span>
                    </li>
                  </ul>
                </div>
                <div className="relative">
                  <p className={`text-[15.3px] leading-relaxed text-sf-primary/80 ${descExpanded ? '' : 'line-clamp-4'}`}>{description}</p>
                  {!descExpanded && (
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-sf-bg-primary via-sf-bg-primary/80 to-transparent pointer-events-none" />
                  )}
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="relative z-10 w-full pt-3 text-[13px] font-bold hover:underline underline-offset-4 decoration-sf-primary/30 hover:decoration-sf-primary"
                  >
                    {descExpanded ? 'Show less' : 'Learn more about this item'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
