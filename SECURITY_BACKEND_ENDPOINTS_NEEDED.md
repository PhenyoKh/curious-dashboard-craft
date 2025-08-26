# Required Backend Security Endpoints

## Critical Security Fix Implementation

### OAuth Token Exchange Endpoints

#### 1. Google OAuth Token Exchange
**Endpoint**: `POST /api/auth/google/token`
**Purpose**: Securely handle Google OAuth code-to-token exchange using client secret
**Request**: 
```json
{
  "code": "oauth_authorization_code",
  "redirectUri": "frontend_redirect_uri"
}
```

#### 2. Microsoft OAuth Token Exchange  
**Endpoint**: `POST /api/auth/microsoft/token`
**Purpose**: Securely handle Microsoft OAuth code-to-token exchange using client secret
**Request**:
```json
{
  "code": "oauth_authorization_code", 
  "redirectUri": "frontend_redirect_uri"
}
```

### Backend Environment Variables Needed

Add these to backend `.env` (NOT frontend):
```bash
# OAuth Client Secrets (BACKEND ONLY)
GOOGLE_CLIENT_SECRET=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
MICROSOFT_CLIENT_SECRET=pFn8Q~epHA-KlSe5Vb3RYB74nUvja84anmBtRdoe

# Security Keys (BACKEND ONLY)  
CALENDAR_ENCRYPTION_KEY=ead7c0171ec88f30fe4b42f24e174caaf79965edc912603cd9b6c0b8898f9fba
JWT_SECRET=2b6067cc670c6ac5a8ef90fc2bac2ebc1f08a6cdeec2271664de2369b975c905

# Database Access (BACKEND ONLY)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Payment Gateway (BACKEND ONLY)
PAYFAST_MERCHANT_ID=14995632
PAYFAST_MERCHANT_KEY=zpyqhpgclh6wb
PAYFAST_PASSPHRASE=/ations49veC0me2omy1ite

# Email Service (BACKEND ONLY)
SMTP_PASS=your-email-password
```

### Frontend Changes Required

Update OAuth callback pages to call backend endpoints:
- `/src/pages/auth/GoogleCallback.tsx` - Use backend token exchange
- `/src/pages/auth/MicrosoftCallback.tsx` - Use backend token exchange
- Remove all client secret references from frontend

### Security Benefits

✅ **Client secrets protected** - Never exposed to browser
✅ **Zero client-side secrets** - All sensitive data on backend  
✅ **Reduced attack surface** - Frontend can't leak credentials
✅ **Compliance ready** - Follows OAuth security best practices
✅ **Audit friendly** - Clear separation of concerns

### Implementation Priority

🔴 **CRITICAL** - These endpoints must be implemented before production deployment