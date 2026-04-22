import { cn } from '../../lib/utils';

export const SkipLink = () => {
  return (
    <a
      href="#main-content"
      className={cn(
        "absolute left-4 top-4 z-[100] rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium opacity-0 transition-opacity focus:opacity-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      Skip to main content
    </a>
  );
};
