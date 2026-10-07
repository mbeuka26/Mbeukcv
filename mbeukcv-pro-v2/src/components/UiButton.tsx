import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  children: ReactNode;
}

export function UiButton({
  loading = false,
  variant = 'primary',
  children,
  disabled,
  className,
  ...rest
}: UiButtonProps) {
  return (
    <button
      className={['ui-btn', `ui-btn-${variant}`, className].filter(Boolean).join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="ui-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
