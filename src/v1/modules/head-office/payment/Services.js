const moment = require('moment'); // you already have moment

/**
 * Returns { from: Date, to: Date } (both JS Date objects) or { from: null, to: null }
 * dateFilterType: "currentMonth" | "lastMonth" | "last3Months" | "last6Months" | "custom"
 * startDate/endDate are expected in "DD-MM-YYYY" (as you mentioned).
 */
function buildDateRange(dateFilterType, startDate, endDate ) {
  let from = null;
  let to = null;

  const today = moment().endOf('day');

  switch ((dateFilterType || '').toLowerCase()) {
    case 'currentmonth': {
      from = moment().startOf('month');
      to   = moment().endOf('month');
      break;
    }
    case 'lastmonth': {
      from = moment().subtract(1, 'month').startOf('month');
      to   = moment().subtract(1, 'month').endOf('month');
      break;
    }
    case 'last3months': {
      from = moment().subtract(3, 'months').startOf('month');
      to   = today;
      break;
    }
    case 'last6months': {
      from = moment().subtract(6, 'months').startOf('month');
      to   = today;
      break;
    }
    case 'custom': {
      if (startDate && endDate) {
        from = moment(startDate, 'DD-MM-YYYY').startOf('day');
        to   = moment(endDate,   'DD-MM-YYYY').endOf('day');
      }
      break;
    }
    default:
      // no filtering
      break;
  }

  if (from && to && from.isValid() && to.isValid()) {
    return { from: from.toDate(), to: to.toDate() };
  }

  return { from: null, to: null };
}

module.exports = { buildDateRange };
