import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: ReactNode;
}

export default function ModalPortal({ children }: ModalPortalProps) {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) {
    // Fallback: create the element if it doesn't exist
    const root = document.createElement('div');
    root.id = 'modal-root';
    root.style.position = 'fixed';
    root.style.top = '0';
    root.style.left = '0';
    root.style.right = '0';
    root.style.bottom = '0';
    root.style.zIndex = '9999';
    document.body.appendChild(root);
    return createPortal(children, root);
  }
  return createPortal(children, modalRoot);
}
