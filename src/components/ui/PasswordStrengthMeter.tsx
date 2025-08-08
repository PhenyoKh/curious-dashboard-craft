import React from 'react';
import { Check, X } from 'lucide-react';
import { PasswordStrength, calculatePasswordStrength } from '@/lib/password-utils';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}


const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  className = ''
}) => {
  const strength = calculatePasswordStrength(password);
  
  if (!password) return null;

  return (
    <div className={`mt-2 ${className}`}>
      {/* Strength Bar */}
      <div className="flex space-x-1 mb-2">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full transition-colors duration-200 ${
              level <= strength.score ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Strength Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Password Strength: <span className={`${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
        </span>
      </div>

      {/* Requirements List */}
      <div className="space-y-1">
        <RequirementItem
          met={strength.requirements.length}
          text="At least 8 characters"
        />
        <RequirementItem
          met={strength.requirements.lowercase}
          text="One lowercase letter"
        />
        <RequirementItem
          met={strength.requirements.uppercase}
          text="One uppercase letter"
        />
        <RequirementItem
          met={strength.requirements.number}
          text="One number"
        />
      </div>
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text }) => (
  <div className="flex items-center space-x-2 text-xs">
    {met ? (
      <Check className="w-3 h-3 text-green-500" />
    ) : (
      <X className="w-3 h-3 text-gray-400" />
    )}
    <span className={met ? 'text-green-700' : 'text-gray-500'}>{text}</span>
  </div>
);

export default PasswordStrengthMeter;