/**
 * Security Status Badge Component
 * Visual indicators for security status throughout the app
 */

import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type SecurityStatus = 'secure' | 'warning' | 'danger' | 'quarantined' | 'scanning' | 'unknown';

export interface SecurityStatusBadgeProps {
  status: SecurityStatus;
  threatCount?: number;
  details?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'icon' | 'full';
  className?: string;
  showTooltip?: boolean;
}

const SecurityStatusBadge: React.FC<SecurityStatusBadgeProps> = ({
  status,
  threatCount = 0,
  details,
  size = 'md',
  variant = 'badge',
  className = '',
  showTooltip = true
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'secure':
        return {
          icon: ShieldCheck,
          label: 'Secure',
          color: 'bg-green-100 text-green-800 border-green-200',
          iconColor: 'text-green-600',
          description: 'File passed all security checks'
        };
      case 'warning':
        return {
          icon: ShieldAlert,
          label: `${threatCount} Warning${threatCount !== 1 ? 's' : ''}`,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          iconColor: 'text-yellow-600',
          description: details || `${threatCount} potential security concern${threatCount !== 1 ? 's' : ''} detected`
        };
      case 'danger':
        return {
          icon: ShieldX,
          label: `${threatCount} Threat${threatCount !== 1 ? 's' : ''}`,
          color: 'bg-red-100 text-red-800 border-red-200',
          iconColor: 'text-red-600',
          description: details || `${threatCount} security threat${threatCount !== 1 ? 's' : ''} detected`
        };
      case 'quarantined':
        return {
          icon: Shield,
          label: 'Quarantined',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          iconColor: 'text-purple-600',
          description: details || 'File has been quarantined for security reasons'
        };
      case 'scanning':
        return {
          icon: Shield,
          label: 'Scanning...',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          iconColor: 'text-blue-600',
          description: 'Security scan in progress'
        };
      case 'unknown':
      default:
        return {
          icon: Info,
          label: 'Unknown',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          iconColor: 'text-gray-600',
          description: details || 'Security status unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          badge: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          text: 'text-xs'
        };
      case 'lg':
        return {
          badge: 'px-3 py-2 text-sm',
          icon: 'w-5 h-5',
          text: 'text-sm'
        };
      case 'md':
      default:
        return {
          badge: 'px-2 py-1 text-xs',
          icon: 'w-4 h-4',
          text: 'text-xs'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const renderBadgeContent = () => {
    switch (variant) {
      case 'icon':
        return (
          <Icon 
            className={cn(sizeClasses.icon, config.iconColor, 
              status === 'scanning' && 'animate-pulse'
            )} 
          />
        );
      case 'full':
        return (
          <div className="flex items-center space-x-1">
            <Icon 
              className={cn(sizeClasses.icon, config.iconColor,
                status === 'scanning' && 'animate-pulse'
              )} 
            />
            <span className={sizeClasses.text}>{config.label}</span>
          </div>
        );
      case 'badge':
      default:
        return (
          <div className="flex items-center space-x-1">
            <Icon 
              className={cn(sizeClasses.icon,
                status === 'scanning' && 'animate-pulse'
              )} 
            />
            <span className={sizeClasses.text}>{config.label}</span>
          </div>
        );
    }
  };

  const badgeElement = (
    <Badge
      className={cn(
        config.color,
        'border font-medium',
        sizeClasses.badge,
        className
      )}
    >
      {renderBadgeContent()}
    </Badge>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">
            {config.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Convenience components for common use cases
export const SecureFileBadge: React.FC<Omit<SecurityStatusBadgeProps, 'status'>> = (props) => (
  <SecurityStatusBadge status="secure" {...props} />
);

export const QuarantinedFileBadge: React.FC<Omit<SecurityStatusBadgeProps, 'status'>> = (props) => (
  <SecurityStatusBadge status="quarantined" {...props} />
);

export const ScanningFileBadge: React.FC<Omit<SecurityStatusBadgeProps, 'status'>> = (props) => (
  <SecurityStatusBadge status="scanning" {...props} />
);

// Security level indicator for settings
export interface SecurityLevelBadgeProps {
  level: 'strict' | 'balanced' | 'permissive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export const SecurityLevelBadge: React.FC<SecurityLevelBadgeProps> = ({
  level,
  size = 'md',
  className = '',
  showTooltip = true
}) => {
  const getLevelConfig = () => {
    switch (level) {
      case 'strict':
        return {
          icon: ShieldCheck,
          label: 'Strict',
          color: 'bg-red-100 text-red-800 border-red-200',
          description: 'Maximum security - blocks all potentially risky files'
        };
      case 'balanced':
        return {
          icon: Shield,
          label: 'Balanced',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Recommended - balances security with usability'
        };
      case 'permissive':
        return {
          icon: ShieldAlert,
          label: 'Permissive',
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'Minimal restrictions - allows most file types'
        };
    }
  };

  const config = getLevelConfig();
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return { badge: 'px-2 py-1 text-xs', icon: 'w-3 h-3' };
      case 'lg':
        return { badge: 'px-3 py-2 text-sm', icon: 'w-5 h-5' };
      case 'md':
      default:
        return { badge: 'px-2 py-1 text-xs', icon: 'w-4 h-4' };
    }
  };

  const sizeClasses = getSizeClasses();

  const badgeElement = (
    <Badge className={cn(config.color, 'border font-medium', sizeClasses.badge, className)}>
      <div className="flex items-center space-x-1">
        <Icon className={sizeClasses.icon} />
        <span>{config.label}</span>
      </div>
    </Badge>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">
            {config.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Threat severity indicator
export interface ThreatSeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export const ThreatSeverityBadge: React.FC<ThreatSeverityBadgeProps> = ({
  severity,
  count,
  size = 'md',
  className = '',
  showTooltip = true
}) => {
  const getSeverityConfig = () => {
    switch (severity) {
      case 'critical':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          description: 'Critical security threat - immediate action required'
        };
      case 'high':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          description: 'High security risk - should be addressed'
        };
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'Medium security concern - review recommended'
        };
      case 'low':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          description: 'Low security risk - minor concern'
        };
    }
  };

  const config = getSeverityConfig();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-3 py-2 text-sm';
      case 'md':
      default:
        return 'px-2 py-1 text-xs';
    }
  };

  const sizeClass = getSizeClasses();
  const label = count ? `${severity.toUpperCase()} (${count})` : severity.toUpperCase();

  const badgeElement = (
    <Badge className={cn(config.color, 'border font-medium', sizeClass, className)}>
      {label}
    </Badge>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">
            {config.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default SecurityStatusBadge;