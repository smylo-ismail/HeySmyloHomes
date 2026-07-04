import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

export function InkButton({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = 'rounded px-5 py-3 text-sm uppercase tracking-wide transition-colors disabled:opacity-40';
  const styles =
    variant === 'primary'
      ? 'bg-ink text-bg dark:bg-dark-ink dark:text-dark-bg hover:opacity-90'
      : 'border border-ink text-ink dark:border-dark-ink dark:text-dark-ink hover:bg-ink/5 dark:hover:bg-dark-ink/10';
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
