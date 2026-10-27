import { parsePhoneNumberFromString } from 'libphonenumber-js';

export interface PhoneValidationResult {
  valid: boolean;
  normalized?: string; // E.164 e.g. +995599123456
  national?: string;   // 599123456
  formatted?: string;  // +995 599 12 34 56
  error?: string;
}

/**
 * Validates and normalizes phone numbers, especially Georgian mobile numbers.
 * Georgian mobile standard: 9 digits starting with 5.
 */
export function validatePhoneNumber(rawInput: string, defaultCountry: 'GE' | string = 'GE'): PhoneValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return { valid: false, error: 'ტელეფონის ნომერი ცარიელია' };
  }

  const cleaned = rawInput.trim();

  // Try parsing with libphonenumber-js
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry as 'GE');

  if (parsed && parsed.isValid()) {
    // If country is GE, check that it's a mobile number (starts with 5 in national number)
    if (parsed.country === 'GE') {
      const nationalNumber = parsed.nationalNumber;
      if (!nationalNumber.startsWith('5') || nationalNumber.length !== 9) {
        return {
          valid: false,
          error: 'გთხოვთ მიუთითოთ მობილურის 9-ნიშნა ნომერი (იწყება 5-ით, მაგ.: 599 12 34 56)',
        };
      }
      return {
        valid: true,
        normalized: parsed.format('E.164'), // +995599123456
        national: nationalNumber,           // 599123456
        formatted: parsed.formatInternational(), // +995 599 12 34 56
      };
    }

    return {
      valid: true,
      normalized: parsed.format('E.164'),
      national: parsed.nationalNumber,
      formatted: parsed.formatInternational(),
    };
  }

  // Fallback heuristic for raw Georgian 9-digit format: e.g. "599123456" or "599 12-34-56"
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length === 9 && digitsOnly.startsWith('5')) {
    return {
      valid: true,
      normalized: `+995${digitsOnly}`,
      national: digitsOnly,
      formatted: `+995 ${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 5)} ${digitsOnly.slice(5, 7)} ${digitsOnly.slice(7, 9)}`,
    };
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith('9955')) {
    const national = digitsOnly.slice(3);
    return {
      valid: true,
      normalized: `+${digitsOnly}`,
      national: national,
      formatted: `+995 ${national.slice(0, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7, 9)}`,
    };
  }

  return {
    valid: false,
    error: 'არასწორი ტელეფონის ნომერი. გამოიყენეთ 9-ნიშნა ქართული მობილურის ნომერი (მაგ.: 599 12 34 56)',
  };
}
