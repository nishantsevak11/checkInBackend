const formatDateToLocal = (date, timezone = 'Asia/Kolkata') => {
  const d = new Date(date);
  return d.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
};

const computeCheckout = (checkInDate, durationMinutes) => {
  return new Date(checkInDate.getTime() + durationMinutes * 60 * 1000);
};

const getTodayDate = (timezone = 'Asia/Kolkata') => {
  return formatDateToLocal(new Date(), timezone);
};

module.exports = {
  formatDateToLocal,
  computeCheckout,
  getTodayDate
};