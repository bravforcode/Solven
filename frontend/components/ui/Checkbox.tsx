"use client";

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

/** Indeterminate-capable checkbox for batch selection (accent color via .draft-checkbox) */
export default function Checkbox({ checked, indeterminate = false, disabled = false, onChange, label }: CheckboxProps) {
  return (
    <label className="draft-checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate && !checked;
        }}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
