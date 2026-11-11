'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StudioInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelRight?: React.ReactNode;
  icon?: LucideIcon | React.ReactNode;
  leadIcon?: React.ReactNode;
  trailAction?: React.ReactNode;
  trailIcon?: React.ReactNode;
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

    const renderLeadIcon = () => {
      if (!effectiveLead) return null;
      // If it's a component function (LucideIcon)
      if (typeof effectiveLead === 'function') {
        const IconComponent = effectiveLead as LucideIcon;
        return <IconComponent className="w-4 h-4" />;
      }
      return effectiveLead;
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
              {renderLeadIcon()}
            </div>
          )}

          <input ref={ref} id={inputId} className={classNames} {...props} />

          {hasTrail && <div className="studio-input-icon-trail">{effectiveTrail}</div>}
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
