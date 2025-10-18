/**
 * Test Passcode Format Conversion
 * Verifies that the format conversion works correctly
 */

// Test the format conversion logic
function testFormatConversion() {
  console.log('🧪 Testing Passcode Format Conversion...\n');

  const testCases = [
    { input: 'UN1234', expected: 'UN-1234' },
    { input: 'UN0000', expected: 'UN-0000' },
    { input: 'UN9999', expected: 'UN-9999' },
    { input: 'UNabcd', expected: 'UNabcd' }, // Invalid format
    { input: 'UN123', expected: 'UN123' },   // Too short
    { input: 'UN12345', expected: 'UN12345' } // Too long
  ];

  testCases.forEach(({ input, expected }) => {
    const result = input.replace(/^(UN)(\d{4})$/, '$1-$2');
    const status = result === expected ? '✅' : '❌';
    console.log(`${status} Input: "${input}" → Output: "${result}" (Expected: "${expected}")`);
  });

  console.log('\n📝 Note: Only valid UNxxxx format (6 characters) will be converted to UN-xxxx');
}

// Test regex validation
function testRegexValidation() {
  console.log('\n🔍 Testing Regex Validation...\n');

  const testCodes = [
    'UN-1234',  // Valid
    'UN-0000',  // Valid
    'UN-9999',  // Valid
    'UN1234',   // Invalid (no hyphen)
    'UN-123',   // Invalid (too short)
    'UN-12345', // Invalid (too long)
    'UN-abcd',  // Invalid (letters)
    'UN-12ab',  // Invalid (mixed)
  ];

  const codeRegex = /^UN-[0-9]{4}$/;

  testCodes.forEach(code => {
    const isValid = codeRegex.test(code);
    const status = isValid ? '✅' : '❌';
    console.log(`${status} "${code}" - ${isValid ? 'Valid' : 'Invalid'}`);
  });
}

// Run tests
testFormatConversion();
testRegexValidation();

console.log('\n🎯 Summary:');
console.log('- Frontend sends: UNxxxx (6 characters)');
console.log('- Database stores: UN-xxxx (7 characters with hyphen)');
console.log('- Conversion: UNxxxx → UN-xxxx using regex replace');
console.log('- Validation: Uses /^UN-[0-9]{4}$/ pattern');
