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