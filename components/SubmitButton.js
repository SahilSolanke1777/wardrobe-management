'use client';
import { useFormStatus } from 'react-dom';

export default function SubmitButton({ children, className = 'btn btn-primary', pendingText = 'Saving…', disabled = false, ...rest }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}
