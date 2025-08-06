import React from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  className?: string;
}

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  requirements: {
    length: boolean;
    lowercase: boolean;
    uppercase: boolean;
    number: boolean;
    special?: boolean;
  };
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  const requirements = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const metRequirements = Object.values(requirements).filter(Boolean).length;
  
  let score = 0;
  let label = 'Very Weak';
  let color = 'bg-red-500';

  if (metRequirements >= 4) {
    score = 4;
    label = 'Strong';
    color = 'bg-green-500';
  } else if (metRequirements >= 3) {
    score = 3;
    label = 'Good';
    color = 'bg-blue-500';
  } else if (metRequirements >= 2) {
    score = 2;
    label = 'Fair';
    color = 'bg-yellow-500';
  } else if (metRequirements >= 1) {
    score = 1;
    label = 'Weak';
    color = 'bg-orange-500';
  }

  return { score, label, color, requirements };
};

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