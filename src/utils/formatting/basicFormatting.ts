
export const applyBasicFormat = (command: string, value?: string) => {
  const selection = window.getSelection();
  if (!selection) return;

  try {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editor) {
      editor.focus();
    }

    document.execCommand(command, false, value);
  } catch (error) {
    console.error('Error applying basic formatting:', error);
  }
};

export const applyTextStyle = (command: 'bold' | 'italic' | 'underline') => {
  applyBasicFormat(command);
};

export const applyAlignment = (alignment: 'justifyLeft' | 'justifyCenter' | 'justifyRight') => {
  applyBasicFormat(alignment);
};

export const applyList = (listType: 'insertUnorderedList' | 'insertOrderedList') => {
  applyBasicFormat(listType);
};
