/**
 * ============================================
 * VALIDATION UTILITIES
 * ============================================
 */

const validators = {
  login: {
    nik: (val) => val && val.length > 0,
    password: (val) => val && val.length >= 6,
  },
  employee: {
    nik_karyawan: (val) => val && val.length > 0,
    nama_lengkap: (val) => val && val.length > 0,
  },
  shift: {
    area_id: (val) => val && val.length > 0,
    shift_start: (val) => val && !isNaN(Date.parse(val)),
    shift_end: (val) => val && !isNaN(Date.parse(val)),
  },
};

export function validateInput(type, data) {
  const rules = validators[type];

  if (!rules) {
    return { valid: true };
  }

  const errors = [];

  for (const [field, validator] of Object.entries(rules)) {
    if (!validator(data[field])) {
      errors.push(`${field} is invalid`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone) {
  // Indonesian phone format
  const phoneRegex = /^(\+62|0)[0-9]{9,12}$/;
  return phoneRegex.test(phone.replace(/[- ]/g, ''));
}
