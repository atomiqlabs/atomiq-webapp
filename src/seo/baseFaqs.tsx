import { FAQContent } from '../data/FAQContent';
import type { FaqItem } from './types';

const noop = () => {};

// Indices into FAQContent: "Do I have to trust anyone?", "Why should you use atomiq.exchange?", "Are you audited?"
const BASE_INDICES = [2, 3, 7];

export const BASE_FAQS: FaqItem[] = BASE_INDICES.map((i) => {
  const item = FAQContent[i];
  return {
    question: item.question,
    answer: typeof item.answer === 'function' ? item.answer(noop) : item.answer,
  };
});
