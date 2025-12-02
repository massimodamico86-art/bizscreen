/**
 * Form Elements
 *
 * A collection of refined form inputs following Apple design patterns.
 * Consistent styling, accessible, and easy to compose.
 *
 * @example
 * <FormField label="Email" hint="We'll never share your email">
 *   <Input type="email" placeholder="you@example.com" />
 * </FormField>
 */

import { forwardRef, createContext, useContext, useId } from 'react';

// Context for form field state
const FormFieldContext = createContext({
  id: undefined,
  hintId: undefined,
  errorId: undefined,
  error: undefined,
  disabled: false,
});

/**
 * Form Field wrapper with label, hint, and error handling
 */
export const FormField = forwardRef(function FormField(
  {
    label,
    hint,
    error,
    required = false,
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <FormFieldContext.Provider value={{ id, hintId, errorId, error, disabled }}>
      <div
        ref={ref}
        className={`${className}`}
        {...props}
      >
        {label && (
          <label
            htmlFor={id}
            className={`
              block text-sm font-medium mb-1.5
              ${error ? 'text-red-700' : 'text-gray-700'}
              ${disabled ? 'text-gray-400' : ''}
            `.trim()}
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        {children}
        {(hint || error) && (
          <p
            id={error ? errorId : hintId}
            className={`
              mt-1.5 text-sm
              ${error ? 'text-red-600' : 'text-gray-500'}
            `.trim()}
            role={error ? 'alert' : undefined}
          >
            {error || hint}
          </p>
        )}
      </div>
    </FormFieldContext.Provider>
  );
});

/**
 * Base input styles (shared)
 */
const inputBaseStyles = `
  w-full px-3 py-2
  bg-white border border-gray-200 rounded-lg
  text-gray-900 text-sm
  placeholder:text-gray-400
  transition-all duration-100 ease-out
  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
  disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
  read-only:bg-gray-50 read-only:cursor-default
`;

const inputErrorStyles = `
  border-red-300 focus:border-red-500 focus:ring-red-500/20
`;

/**
 * Text Input
 */
export const Input = forwardRef(function Input(
  {
    type = 'text',
    size = 'md', // 'sm' | 'md' | 'lg'
    leftIcon,
    rightIcon,
    error: propError,
    className = '',
    ...props
  },
  ref
) {
  const { id, hintId, errorId, error: contextError, disabled } = useContext(FormFieldContext);
  const error = propError || contextError;
  // Build aria-describedby from available IDs
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const sizeStyles = {
    sm: 'py-1.5 text-sm',
    md: 'py-2 text-sm',
    lg: 'py-2.5 text-base',
  };

  // If there are icons, wrap in a container
  if (leftIcon || rightIcon) {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`
            ${inputBaseStyles}
            ${sizeStyles[size]}
            ${error ? inputErrorStyles : ''}
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${className}
          `.trim()}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      id={id}
      type={type}
      disabled={disabled}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy}
      className={`
        ${inputBaseStyles}
        ${sizeStyles[size]}
        ${error ? inputErrorStyles : ''}
        ${className}
      `.trim()}
      {...props}
    />
  );
});

/**
 * Textarea
 */
export const Textarea = forwardRef(function Textarea(
  {
    rows = 4,
    resize = 'vertical', // 'none' | 'vertical' | 'horizontal' | 'both'
    error: propError,
    className = '',
    ...props
  },
  ref
) {
  const { id, hintId, errorId, error: contextError, disabled } = useContext(FormFieldContext);
  const error = propError || contextError;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const resizeStyles = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  };

  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      disabled={disabled}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={describedBy}
      className={`
        ${inputBaseStyles}
        ${resizeStyles[resize]}
        ${error ? inputErrorStyles : ''}
        ${className}
      `.trim()}
      {...props}
    />
  );
});

/**
 * Select dropdown
 */
export const Select = forwardRef(function Select(
  {
    options = [],
    placeholder = 'Select...',
    size = 'md',
    error: propError,
    className = '',
    children,
    ...props
  },
  ref
) {
  const { id, hintId, errorId, error: contextError, disabled } = useContext(FormFieldContext);
  const error = propError || contextError;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  const sizeStyles = {
    sm: 'py-1.5 text-sm',
    md: 'py-2 text-sm',
    lg: 'py-2.5 text-base',
  };

  return (
    <div className="relative">
      <select
        ref={ref}
        id={id}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        className={`
          ${inputBaseStyles}
          ${sizeStyles[size]}
          ${error ? inputErrorStyles : ''}
          appearance-none pr-10 cursor-pointer
          ${className}
        `.trim()}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.length > 0
          ? options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))
          : children}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
});

/**
 * Checkbox
 */
export const Checkbox = forwardRef(function Checkbox(
  {
    label,
    description,
    error: propError,
    className = '',
    ...props
  },
  ref
) {
  const { id, error: contextError, disabled } = useContext(FormFieldContext);
  const error = propError || contextError;
  const checkboxId = useId();

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input
        ref={ref}
        id={id || checkboxId}
        type="checkbox"
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        className={`
          w-4 h-4 mt-0.5
          text-blue-600 bg-white border-gray-300 rounded
          focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          ${error ? 'border-red-300' : ''}
        `.trim()}
        {...props}
      />
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <label
              htmlFor={id || checkboxId}
              className={`
                text-sm font-medium cursor-pointer
                ${error ? 'text-red-700' : 'text-gray-700'}
                ${disabled ? 'text-gray-400 cursor-not-allowed' : ''}
              `.trim()}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Radio button
 */
export const Radio = forwardRef(function Radio(
  {
    label,
    description,
    error: propError,
    className = '',
    ...props
  },
  ref
) {
  const { error: contextError, disabled } = useContext(FormFieldContext);
  const error = propError || contextError;
  const radioId = useId();

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input
        ref={ref}
        id={radioId}
        type="radio"
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        className={`
          w-4 h-4 mt-0.5
          text-blue-600 bg-white border-gray-300
          focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          ${error ? 'border-red-300' : ''}
        `.trim()}
        {...props}
      />
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <label
              htmlFor={radioId}
              className={`
                text-sm font-medium cursor-pointer
                ${error ? 'text-red-700' : 'text-gray-700'}
                ${disabled ? 'text-gray-400 cursor-not-allowed' : ''}
              `.trim()}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Radio Group
 */
export const RadioGroup = forwardRef(function RadioGroup(
  {
    name,
    value,
    onChange,
    options = [],
    orientation = 'vertical', // 'vertical' | 'horizontal'
    className = '',
    children,
    ...props
  },
  ref
) {
  const orientationStyles = {
    vertical: 'flex flex-col gap-3',
    horizontal: 'flex flex-wrap gap-4',
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      className={`${orientationStyles[orientation]} ${className}`}
      {...props}
    >
      {options.length > 0
        ? options.map((option) => (
            <Radio
              key={option.value}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={onChange}
              label={option.label}
              description={option.description}
              disabled={option.disabled}
            />
          ))
        : children}
    </div>
  );
});

/**
 * Switch / Toggle
 */
export const Switch = forwardRef(function Switch(
  {
    label,
    description,
    checked = false,
    onChange,
    size = 'md', // 'sm' | 'md' | 'lg'
    className = '',
    ...props
  },
  ref
) {
  const { disabled } = useContext(FormFieldContext);
  const switchId = useId();

  const sizeStyles = {
    sm: {
      track: 'w-8 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-3',
    },
    md: {
      track: 'w-10 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-4',
    },
    lg: {
      track: 'w-12 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-5',
    },
  };

  const { track, thumb, translate } = sizeStyles[size];

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`
          relative inline-flex flex-shrink-0
          ${track}
          rounded-full cursor-pointer
          transition-colors duration-150 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${checked ? 'bg-blue-600' : 'bg-gray-200'}
        `.trim()}
        {...props}
      >
        <span
          className={`
            pointer-events-none inline-block
            ${thumb}
            rounded-full bg-white shadow-sm
            transform transition-transform duration-150 ease-out
            ${checked ? translate : 'translate-x-0.5'}
            translate-y-0.5
          `.trim()}
        />
      </button>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <label
              htmlFor={switchId}
              className={`
                text-sm font-medium cursor-pointer
                ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'}
              `.trim()}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-500 mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

export default {
  FormField,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  RadioGroup,
  Switch,
};
