
import { useCallback, useRef } from 'react';

export const useCardNavigation = () => {
  const scrollToCardRef = useRef<((category: string, number: number) => void) | null>(null);

  const handleScrollToCard = useCallback((category: string, number: number) => {
    if (scrollToCardRef.current) {
      scrollToCardRef.current(category, number);
    }
  }, []);

  const registerScrollToCard = useCallback((scrollFunction: (category: string, number: number) => void) => {
    scrollToCardRef.current = scrollFunction;
  }, []);

  return {
    handleScrollToCard,
    registerScrollToCard
  };
};
