const parseLocalDate = (dateInput) => {
  if (!dateInput) return new Date();
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
  }
  if (dateInput instanceof Date) {
    return new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
  }
  return new Date(dateInput);
};

const formatLocalDate = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addOneMonthPreservingDay = (dateObj, targetDay) => {
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();

  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 11) {
    nextYear += Math.floor(nextMonth / 12);
    nextMonth = nextMonth % 12;
  }

  const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  const dayToSet = Math.min(targetDay, daysInNextMonth);

  return new Date(nextYear, nextMonth, dayToSet);
};

const calculateRenewalEndDate = (subEndDateInput, todayInput = new Date(), isVisit = false, durationDays = 30) => {
  const subEnd = parseLocalDate(subEndDateInput);
  const today = parseLocalDate(todayInput);

  if (isVisit || durationDays < 28) {
    const baseDate = subEnd >= today ? subEnd : today;
    const newEnd = new Date(baseDate);
    newEnd.setDate(newEnd.getDate() + durationDays);
    return newEnd;
  }

  const targetDay = subEnd.getDate();
  let candidate = new Date(subEnd);

  if (candidate >= today) {
    candidate = addOneMonthPreservingDay(candidate, targetDay);
  } else {
    while (candidate <= today) {
      candidate = addOneMonthPreservingDay(candidate, targetDay);
    }
  }

  return candidate;
};

const addOneYearPreservingDayAndMonth = (dateObj, targetMonth, targetDay) => {
  const nextYear = dateObj.getFullYear() + 1;
  const daysInNextMonth = new Date(nextYear, targetMonth + 1, 0).getDate();
  const dayToSet = Math.min(targetDay, daysInNextMonth);
  return new Date(nextYear, targetMonth, dayToSet);
};

const calculateAnnualRenewalEndDate = (enrollmentExpiresInput, todayInput = new Date()) => {
  const currentEnd = parseLocalDate(enrollmentExpiresInput);
  const today = parseLocalDate(todayInput);

  const targetMonth = currentEnd.getMonth();
  const targetDay = currentEnd.getDate();

  let candidate = new Date(currentEnd);

  if (candidate >= today) {
    candidate = addOneYearPreservingDayAndMonth(candidate, targetMonth, targetDay);
  } else {
    while (candidate <= today) {
      candidate = addOneYearPreservingDayAndMonth(candidate, targetMonth, targetDay);
    }
  }

  return candidate;
};

module.exports = {
  parseLocalDate,
  formatLocalDate,
  addOneMonthPreservingDay,
  calculateRenewalEndDate,
  addOneYearPreservingDayAndMonth,
  calculateAnnualRenewalEndDate,
};
