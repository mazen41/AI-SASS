'use client';

import React, { isValidElement } from 'react';
import { LucideIcon } from 'lucide-react';

export interface StudioInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelRight?: React.ReactNode;
  icon?: LucideIcon | React.ReactNode;
  leadIcon?: LucideIcon | React.ReactNode;
  trailAction?: React.ReactNode;
  trailIcon?: LucideIcon | React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export const StudioInput = React.forwardRef<HTMLInputElement, StudioInputProps>(
  (
    {
      label,
      labelRight,
      icon,
      leadIcon,
      trailAction,
      trailIcon,
      error,
      containerClassName = '',
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const effectiveLead = leadIcon ?? icon;
    const effectiveTrail = trailIcon ?? trailAction;

    const hasLead = Boolean(effectiveLead);
    const hasTrail = Boolean(effectiveTrail);

    const classNames = [
      'studio-input-field',
      hasLead ? 'studio-input-has-lead' : '',
      hasTrail ? 'studio-input-has-trail' : '',
      error ? 'has-error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const renderIconNode = (item: unknown) => {
      if (!item) return null;
      if (isValidElement(item)) {
        return item;
      }
      if (
        typeof item === 'function' ||
        (typeof item === 'object' && item !== null && ('render' in item || '$$typeof' in item))
      ) {
        const IconComponent = item as React.ComponentType<{ className?: string }>;
        return <IconComponent className="w-4 h-4" />;
      }
      return item as React.ReactNode;
    };

    return (
      <div className={`w-full ${containerClassName}`}>
        {(label || labelRight) && (
          <div className="flex items-center justify-between mb-2">
            {label && (
              <label
                htmlFor={inputId}
                className="block text-xs font-bold uppercase tracking-wider text-[var(--text-3)]"
              >
                {label}
              </label>
            )}
            {labelRight && <div>{labelRight}</div>}
          </div>
        )}

        <div className="studio-input-wrap">
          {hasLead && (
            <div className="studio-input-icon-lead" aria-hidden="true">
              {renderIconNode(effectiveLead)}
            </div>
          )}

          <input ref={ref} id={inputId} className={classNames} {...props} />

          {hasTrail && (
            <div className="studio-input-icon-trail">
              {renderIconNode(effectiveTrail)}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

StudioInput.displayName = 'StudioInput';

export default StudioInput;
