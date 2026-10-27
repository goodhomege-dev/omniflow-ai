/**
 * GEORGIAN LINGUISTIC SANITIZER & GRAMMAR VALIDATOR
 * უზრუნველყოფს, რომ ყველა გამავალი შეტყობინება მომხმარებელთან
 * მივიდეს გამართულ, სალიტერატურო და გრამატიკულად სწორ ქართულ ენაზე.
 */

// ჩანაცვლებების ლექსიკონი: კალკები, BPE ტოკენაიზერის ხარვეზები და გრამატიკული შესწორებები
const GEORGIAN_CORRECTIONS: [RegExp, string][] = [
  // 1. ტოკენაიზერის ჰალუცინაციები და უცხოენოვანი ნარჩენები
  [/შეიარაღოთ გვერდი[,\s]*/gi, 'მოგვაწოდოთ შემდეგი მონაცემები: '],
  [/შეიარაღეთ გვერდი[,\s]*/gi, 'მოგვაწოდოთ შემდეგი მონაცემები: '],
  [/შეიარაღოთ/gi, 'მოგვაწოდოთ'],
  [/შეიარაღეთ/gi, 'მოგვაწოდეთ'],
  [/kívანiredი/gi, 'სასურველი'],
  [/kivaniredi/gi, 'სასურველი'],
  [/kívánt/gi, 'სასურველი'],
  [/გსურნხemo/gi, 'გსურთ'],
  [/გსურნხ/gi, 'გსურთ'],
  [/مکირე/gi, 'ზუსტი'],
  [/მოკირე/gi, 'ზუსტი'],

  // 2. რუსული/ინგლისური ენის პირდაპირი თარგმანის კალკები
  [/შეკვეთის გაკეთება/gi, 'შეკვეთის გაფორმება'],
  [/გაკეთება შეკვეთის/gi, 'შეკვეთის გაფორმება'],
  [/შეკვეთის გაკეთებას/gi, 'შეკვეთის გაფორმებას'],
  [/მოახდინოთ შეკვეთა/gi, 'გააფორმოთ შეკვეთა'],
  [/მოახდინოთ გადახდა/gi, 'გადაიხადოთ'],
  [/შეკვეთის მოხდენა/gi, 'შეკვეთის გაფორმება'],
  [/ხელმისაწვდომია შეძენისთვის/gi, 'ხელმისაწვდომია შესაძენად'],
  [/საქონელის/gi, 'პროდუქციის'],
  [/საქონელი/gi, 'პროდუქცია'],
  [/მომსახურეობა/gi, 'მომსახურება'],
  [/მომსახურეობას/gi, 'მომსახურებას'],
  [/კურიერული მომსახურეობა/gi, 'საკურიერო მომსახურება'],
  [/კურიერული მომსახურება/gi, 'საკურიერო მომსახურება'],
  [/დაბრუნების პოლიტიკა/gi, 'დაბრუნების პირობები'],
  [/საგარანტიო პერიოდი/gi, 'საგარანტიო ვადა'],
  [/ფასდაკლების აქცია/gi, 'აქცია'],
  [/თანხის უკან დაბრუნება/gi, 'თანხის დაბრუნება'],

  // 3. უცხოური ანბანის (არაბული, კირილიცა) სრული ამოშლა
  [/[\u0600-\u06FF]/g, ''],
  [/[\u0400-\u04FF]/g, ''],
  [/[áéíóúőűãõñ]/gi, ''],

  // 4. პუნქტუაციისა და ინტერვალების ნორმალიზაცია
  [/\s+([,.:!?])/g, '$1'],
  [/([,.:!?])([^\s0-9,.:!?\n])/g, '$1 $2'],
  [/[ \t]+/g, ' '],
  [/\n{3,}/g, '\n\n'],
];

/**
 * ამოწმებს, შეიცავს თუ არა ტექსტი უცხოურ ანბანს, ტოკენიზაციის შეცდომას ან დამახინჯებულ სიტყვებს
 */
export function isCorruptedOrAlien(text: string): boolean {
  if (!text || typeof text !== 'string') return true;

  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  const hasWeirdAccents = /[áéíóúőűãõñ]/i.test(text);
  const hasGlitchWords = /(შეიარაღოთ|გსურნხemo|kív|مکირე)/i.test(text);

  return hasArabic || hasCyrillic || hasWeirdAccents || hasGlitchWords;
}

/**
 * ასუფთავებს და გრამატიკულად ასწორებს ქართულ ტექსტს
 */
export function sanitizeGeorgianText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let result = text;

  for (const [regex, replacement] of GEORGIAN_CORRECTIONS) {
    result = result.replace(regex, replacement);
  }

  return result.trim();
}

/**
 * უზრუნველყოფს, რომ ნებისმიერი გამავალი პასუხი იყოს გრამატიკულად გამართული ქართული.
 * თუ ტექსტი დამახინჯებულია და გასწორებას არ ექვემდებარება, აბრუნებს სუფთა ქართულ ტექსტს.
 */
export function ensureProperGeorgian(text: string, fallbackText: string): string {
  if (!text || isCorruptedOrAlien(text)) {
    return sanitizeGeorgianText(fallbackText);
  }

  const cleaned = sanitizeGeorgianText(text);

  // თუ გაწმენდის შემდეგ მაინც დარჩა ხარვეზები
  if (isCorruptedOrAlien(cleaned) || cleaned.length < 5) {
    return sanitizeGeorgianText(fallbackText);
  }

  return cleaned;
}
