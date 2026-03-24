/**
 * Verhoeff Algorithm for Aadhaar Checksum Validation
 * Reference: https://en.wikipedia.org/wiki/Verhoeff_algorithm
 */
const multiplicationTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const permutationTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 1, 4, 6, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const inverseTable = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validate Aadhaar Number using Verhoeff Algorithm
 * @param {string} aadhaar 
 * @returns {boolean}
 */
function validateAadhaar(aadhaar) {
    if (!aadhaar || aadhaar.length !== 12 || !/^\d{12}$/.test(aadhaar)) {
        return false;
    }

    let c = 0;
    const array = aadhaar.split('').map(Number).reverse();

    for (let i = 0; i < array.length; i++) {
        c = multiplicationTable[c][permutationTable[i % 8][array[i]]];
    }

    return c === 0;
}

/**
 * Mask Aadhaar Number: XXXX-XXXX-1234
 * @param {string} aadhaar 
 * @returns {string}
 */
function maskAadhaar(aadhaar) {
    if (!aadhaar) return 'XXXX-XXXX-XXXX';
    // If it's the full number
    if (aadhaar.length === 12) {
        return `XXXX-XXXX-${aadhaar.slice(-4)}`;
    }
    // If it's already masked but we want standard format
    return aadhaar;
}

/**
 * Check if the provided mobile matches the Aadhaar-linked mobile
 * (Simulation for development)
 * @param {string} userAadhaar Last 4 digits or encrypted
 * @param {string} userMobile 
 * @param {string} dbAadhaar 
 * @param {string} dbLinkedMobile 
 * @returns {boolean}
 */
function simulateAadhaarMobileMatch(userAadhaar, userMobile, dbAadhaar, dbLinkedMobile) {
    // In a real scenario, this would call a UIDAI-approved KYC provider
    return userAadhaar.slice(-4) === dbAadhaar.slice(-4) && userMobile === dbLinkedMobile;
}

module.exports = {
    validateAadhaar,
    maskAadhaar,
    simulateAadhaarMobileMatch
};
