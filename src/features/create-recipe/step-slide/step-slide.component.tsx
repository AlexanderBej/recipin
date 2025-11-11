import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StepSlideProps {
  children: React.ReactNode;
  stepKey: React.Key;
  direction: number;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
    position: 'absolute' as const,
  }),
  center: {
    x: 0,
    opacity: 1,
    position: 'relative' as const,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
    position: 'absolute' as const,
  }),
};

const transition = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 35,
  mass: 0.7,
};

const StepSlide: React.FC<StepSlideProps> = ({
  children,
  stepKey,
  direction,
  onSwipePrev,
  onSwipeNext,
}) => {
  return (
    <AnimatePresence initial={false} custom={direction} mode="popLayout">
      <motion.div
        key={stepKey}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        className="w-full"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragEnd={(e, info) => {
          if (info.offset.x > 80) onSwipePrev();
          if (info.offset.x < -80) onSwipeNext();
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default StepSlide;
