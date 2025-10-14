const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  manualCheckOut,
  getTodayAttendance,
  getHistory,
  getAttendanceById,
  deleteAttendance,
  exportAttendance
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/auth');
const {
  checkInValidator,
  checkOutValidator,
  historyValidator
} = require('../middleware/validators');

// All routes are protected
router.use(protect);

router.post('/checkin', checkInValidator, checkIn);
  router.post('/checkout', checkOutValidator, checkOut);
router.get('/today', getTodayAttendance);
router.get('/export', historyValidator, exportAttendance);
router.get('/', historyValidator, getHistory);
router.get('/:id', getAttendanceById);
router.put('/:id/checkout', checkOutValidator, manualCheckOut);
router.delete('/:id', deleteAttendance);

module.exports = router;