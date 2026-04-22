import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TAG_COLORS, getColorByValue } from '../../lib/colors';


interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedColor = getColorByValue(value);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-md border transition-colors',
          'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/40',
          selectedColor.border
        )}
      >
        <div className={cn('w-4 h-4 rounded-full', selectedColor.bg.replace('bg-', 'bg-').replace('100', '500'))} />
        <span className="text-sm">{selectedColor.label}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 p-2 bg-card rounded-lg border shadow-lg z-50 grid grid-cols-4 gap-1 min-w-[200px]">
            {TAG_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => {
                  onChange(color.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-md transition-all',
                  'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1',
                  color.bg.replace('bg-', 'bg-').replace('100', '500'),
                  value === color.value && 'ring-2 ring-offset-1 ring-slate-400'
                )}
                title={color.label}
              >
                {value === color.value && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ColorBadgeProps {
  color: string;
  label: string;
  className?: string;
}

export function ColorBadge({ color, label, className }: ColorBadgeProps) {
  const colorOption = getColorByValue(color);
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorOption.bg,
        colorOption.text,
        className
      )}
    >
      {label}
    </span>
  );
}
