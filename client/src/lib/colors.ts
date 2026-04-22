export interface ColorOption {
  value: string;
  label: string;
  bg: string;
  text: string;
  border: string;
  hex: string;
}

export const TAG_COLORS: ColorOption[] = [
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', hex: '#3b82f6' },
  { value: 'red', label: 'Red', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', hex: '#ef4444' },
  { value: 'green', label: 'Green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', hex: '#22c55e' },
  { value: 'yellow', label: 'Yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', hex: '#eab308' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', hex: '#a855f7' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', hex: '#ec4899' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', hex: '#6366f1' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', hex: '#f97316' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', hex: '#14b8a6' },
  { value: 'cyan', label: 'Cyan', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', hex: '#06b6d4' },
  { value: 'slate', label: 'Slate', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', hex: '#64748b' },
  { value: 'amber', label: 'Amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', hex: '#f59e0b' },
];

export function getColorByValue(value: string): ColorOption {
  return TAG_COLORS.find(c => c.value === value) || TAG_COLORS[0];
}

export function getColorClasses(value: string): { bg: string; text: string; border: string } {
  const color = getColorByValue(value);
  return {
    bg: color.bg,
    text: color.text,
    border: color.border,
  };
}
