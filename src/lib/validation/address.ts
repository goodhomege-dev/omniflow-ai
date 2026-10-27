export interface AddressValidationResult {
  valid: boolean;
  city?: string;
  address?: string;
  error?: string;
}

const COMMON_GEORGIAN_CITIES = [
  'თბილისი', 'tbilisi',
  'ბათუმი', 'batumi',
  'ქუთაისი', 'kutaisi',
  'რუსთავი', 'rustavi',
  'ზუგდიდი', 'zugdidi',
  'გორი', 'gori',
  'ფოთი', 'poti',
  'თელავი', 'telavi',
  'ახალციხე', 'akhaltsikhe',
  'მარნეული', 'marneuli',
  'ხაშური', 'khashuri',
  'სამტრედია', 'samtredia',
  'სენაკი', 'senaki',
  'ოზურგეთი', 'ozurgeti',
  'კასპი', 'kaspi',
  'ჭიათურა', 'chiatura',
  'წყალტუბო', 'tskaltubo',
  'საგარეჯო', 'sagarejo',
  'გარდაბანი', 'gardabani',
  'ბორჯომი', 'borjomi',
  'მცხეთა', 'mtskheta',
];

/**
 * Validates delivery address completeness.
 * Prevents vague inputs like just "Tbilisi" without a street/building.
 */
export function validateDeliveryAddress(cityInput?: string | null, addressInput?: string | null): AddressValidationResult {
  const city = (cityInput || '').trim();
  const address = (addressInput || '').trim();

  if (!city && !address) {
    return {
      valid: false,
      error: 'გთხოვთ მიუთითოთ ქალაქი და ზუსტი მისამართი (ქუჩა, კორპუსი/სახლი, ბინა)',
    };
  }

  // If city is missing or too short
  if (!city || city.length < 2) {
    // Check if city is mentioned in address string
    const detectedCity = COMMON_GEORGIAN_CITIES.find(c => address.toLowerCase().includes(c.toLowerCase()));
    if (!detectedCity) {
      return {
        valid: false,
        error: 'გთხოვთ დააზუსტოთ მიწოდების ქალაქი ან დასახლება',
      };
    }
  }

  // If address is too short or just the city name
  if (!address || address.length < 5) {
    return {
      valid: false,
      error: 'გთხოვთ მიუთითოთ ზუსტი მისამართი (ქუჩა, ნომერი ან ბინა)',
    };
  }

  // Address cannot be identical to the city name alone
  if (address.toLowerCase() === city.toLowerCase()) {
    return {
      valid: false,
      error: 'მხოლოდ ქალაქის მითითება საკმარისი არ არის. გთხოვთ დაამატოთ ზუსტი ქუჩა და სახლის ნომერი',
    };
  }

  return {
    valid: true,
    city: city || 'თბილისი',
    address,
  };
}
