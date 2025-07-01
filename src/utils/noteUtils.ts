
export const calculateWordCount = (text: string): number => {
  const plainText = text.replace(/<[^>]*>/g, '').trim();
  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  return words.length;
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export const exportAsText = (title: string, content: string) => {
  const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'note'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportAsPDF = () => {
  window.print();
};
