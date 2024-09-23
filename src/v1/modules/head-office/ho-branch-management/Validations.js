const validateBranchData = async (excelData, expectedHeaders, existingBranches) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  for (const [index, row] of excelData.entries()) {
    // Check for empty fields
    for (const field of expectedHeaders) {
      if (!row[field]) {
        return {
          status: 400,
          message: `Row ${index + 1}: The field "${field}" is required and cannot be empty.`,
        };
      }
    }

    // Validate max length for strings
    if (row.branchName.length > 100) {
      return {
        status: 400,
        message: `Row ${index + 1}: branchName must be less than 100 characters.`,
      };
    }

    if (row.address.length > 255) {
      return {
        status: 400,
        message: `Row ${index + 1}: address must be less than 255 characters.`,
      };
    }

    if (row.pointOfContactName.length > 100 || row.pointOfContactEmail.length > 100) {
      return {
        status: 400,
        message: `Row ${index + 1}: Point of Contact name or email must be less than 100 characters.`,
      };
    }

    if (row.cityVillageTown.length > 100 || row.state.length > 100) {
      return {
        status: 400,
        message: `Row ${index + 1}: city/Village/Town or state must be less than 100 characters.`,
      };
    }

    // Phone number length validation
    if (row.pointOfContactPhone && row.pointOfContactPhone.toString().length !== 10) {
      return {
        status: 400,
        message: `Row ${index + 1}: The phone number must be exactly 10 digits.`,
      };
    }

    // Validate email format for emailAddress
    if (!emailRegex.test(row.emailAddress)) {
      return {
        status: 400,
        message: `Row ${index + 1}: The email address "${row.emailAddress}" is invalid.`,
      };
    }

    // Validate email format for pointOfContactEmail
    if (!emailRegex.test(row.pointOfContactEmail)) {
      return {
        status: 400,
        message: `Row ${index + 1}: The point of contact email "${row.pointOfContactEmail}" is invalid.`,
      };
    }

    // Validate pincode length 
    if (row.pincode && row.pincode.toString().length !== 6) {
      return {
        status: 400,
        message: `Row ${index + 1}: The pincode must be exactly 6 digits.`,
      };
    }
  }

  // Return a success if all validations pass
  return null;
};

module.exports = { validateBranchData };
