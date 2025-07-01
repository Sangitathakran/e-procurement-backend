function GetPagination(page, limit) {
  const defaultPage = 1;
  const defaultLimit = 10;

  const currentPage = page && page > 0 ? page : defaultPage;
  const currentLimit = limit && limit > 0 ? limit : defaultLimit;
  const offset = (currentPage - 1) * currentLimit;

  return {
    page: currentPage,
    limit: currentLimit,
    offset: offset,
  };
}

function TitleCase(input) {
  return input
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


function parseJsonData(fieldName) {
  try {
    if (typeof fieldName !== "string") {
      fieldName = JSON.stringify(fieldName);
    }
    const parsedData = JSON.parse(fieldName);
    return parsedData;
  } catch (error) {
    throw new Error(`Invalid data format for ${fieldName}: ${error.message}`);
  }
}

module.exports = {
  GetPagination,
  TitleCase,
  parseJsonData,
};
