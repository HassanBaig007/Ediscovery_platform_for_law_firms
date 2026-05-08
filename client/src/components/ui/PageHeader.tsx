import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface PageHeaderProps {
  title: string;
  description?: string;
  onBack?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, onBack }) => {
  return (
    <div className="flex items-start justify-between gap-4 md:gap-6">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="-ml-1 mt-0.5">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <div className="section-stack">
          <h1 className="text-page-title">{title}</h1>
          {description && <p className="text-page-subtitle">{description}</p>}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
