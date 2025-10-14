const Attendance = require('../models/Attendance');
const { formatDateToLocal, computeCheckout, getTodayDate } = require('../utils/dateUtils');

// @desc    Check in
// @route   POST /api/attendance/checkin
// @access  Private
const checkIn = async (req, res, next) => {
  try {
    const { checkInAt, note } = req.body;
    
    // Use provided time or current time
    const checkInTime = checkInAt ? new Date(checkInAt) : new Date();
    
    // Get date in user's timezone
    const dateString = formatDateToLocal(checkInTime, req.user.timezone);
    
    // Check if already checked in today
    const existingRecord = await Attendance.findOne({
      userId: req.user._id,
      date: dateString
    });

    if (existingRecord) {
      return res.status(409).json({
        status: 'error',
        message: 'Already checked in for today',
        data: {
          record: existingRecord
        }
      });
    }

    // Compute checkout time
    const computedCheckOut = computeCheckout(checkInTime, req.user.defaultWorkDurationMinutes);

    // Create attendance record
    const attendance = await Attendance.create({
      userId: req.user._id,
      date: dateString,
      checkInAt: checkInTime,
      computedCheckOutAt: computedCheckOut,
      note,
      isCheckedOut: false
    });

    res.status(201).json({
      status: 'success',
      message: 'Checked in successfully',
      data: {
        record: attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check out (NEW ROUTE)
// @route   POST /api/attendance/checkout
// @access  Private
const checkOut = async (req, res, next) => {
  try {
    const { checkOutAt } = req.body;
    
    // Use provided time or current time
    const checkOutTime = checkOutAt ? new Date(checkOutAt) : new Date();
    
    // Get today's date in user's timezone
    const todayDate = getTodayDate(req.user.timezone);
    
    // Find today's attendance record
    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: todayDate
    });

    if (!attendance) {
      return res.status(404).json({
        status: 'error',
        message: 'No check-in record found for today. Please check in first.'
      });
    }

    if (attendance.isCheckedOut) {
      return res.status(400).json({
        status: 'error',
        message: 'Already checked out for today',
        data: {
          record: attendance
        }
      });
    }

    // Validate checkout is after checkin
    if (checkOutTime <= attendance.checkInAt) {
      return res.status(400).json({
        status: 'error',
        message: 'Check-out time must be after check-in time'
      });
    }

    // Validate checkout is on same date
    const checkOutDate = formatDateToLocal(checkOutTime, req.user.timezone);
    if (checkOutDate !== attendance.date) {
      return res.status(400).json({
        status: 'error',
        message: 'Check-out must be on the same date as check-in'
      });
    }

    // Update checkout time
    attendance.checkOutAt = checkOutTime;
    attendance.isCheckedOut = true;
    await attendance.save();

    res.status(200).json({
      status: 'success',
      message: 'Checked out successfully',
      data: {
        record: attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manual checkout (for editing past records)
// @route   PUT /api/attendance/:id/checkout
// @access  Private
const manualCheckOut = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { manualCheckOutAt } = req.body;

    const attendance = await Attendance.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!attendance) {
      return res.status(404).json({
        status: 'error',
        message: 'Attendance record not found'
      });
    }

    const checkOutTime = new Date(manualCheckOutAt);
    
    // Validate checkout is after checkin
    if (checkOutTime <= attendance.checkInAt) {
      return res.status(400).json({
        status: 'error',
        message: 'Check-out time must be after check-in time'
      });
    }

    // Validate checkout is on same date
    const checkOutDate = formatDateToLocal(checkOutTime, req.user.timezone);
    if (checkOutDate !== attendance.date) {
      return res.status(400).json({
        status: 'error',
        message: 'Check-out must be on the same date as check-in'
      });
    }

    attendance.manualCheckOutAt = checkOutTime;
    attendance.isCheckedOut = true;
    await attendance.save();

    res.status(200).json({
      status: 'success',
      message: 'Manual check-out recorded',
      data: {
        record: attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's attendance
// @route   GET /api/attendance/today
// @access  Private
const getTodayAttendance = async (req, res, next) => {
  try {
    const todayDate = getTodayDate(req.user.timezone);

    const attendance = await Attendance.findOne({
      userId: req.user._id,
      date: todayDate
    });

    res.status(200).json({
      status: 'success',
      data: {
        record: attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance
// @access  Private
const getHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, from, to, sort = '-date', status } = req.query;

    const query = { userId: req.user._id };

    // Date range filter
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        query.isCheckedOut = false;
      } else if (status === 'completed') {
        query.isCheckedOut = true;
        query.manualCheckOutAt = null;
      } else if (status === 'manual_override') {
        query.manualCheckOutAt = { $ne: null };
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .sort(sort)
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      Attendance.countDocuments(query)
    ]);

    // Add computed fields to each record
    const enrichedRecords = records.map(record => {
      const actualCheckOut = record.manualCheckOutAt || record.checkOutAt || record.computedCheckOutAt;
      const duration = Math.round((actualCheckOut - record.checkInAt) / (1000 * 60));
      
      let status = 'active';
      if (record.manualCheckOutAt) {
        status = 'manual_override';
      } else if (record.isCheckedOut && record.checkOutAt) {
        status = 'completed';
      } else if (new Date() >= record.computedCheckOutAt) {
        status = 'completed';
      }

      return {
        ...record,
        actualCheckOutAt: actualCheckOut,
        durationMinutes: duration,
        status: status
      };
    });

    res.status(200).json({
      status: 'success',
      data: {
        records: enrichedRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
const getAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findOne({
      _id: id,
      userId: req.user._id
    });

    if (!attendance) {
      return res.status(404).json({
        status: 'error',
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        record: attendance
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private
const deleteAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findOneAndDelete({
      _id: id,
      userId: req.user._id
    });

    if (!attendance) {
      return res.status(404).json({
        status: 'error',
        message: 'Attendance record not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Attendance record deleted'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export attendance as CSV
// @route   GET /api/attendance/export
// @access  Private
const exportAttendance = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    const query = { userId: req.user._id };

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
    }

    const records = await Attendance.find(query).sort('date').lean();

    // Create CSV
    const csv = [
      ['Date', 'Check In', 'Check Out', 'Computed Check Out', 'Manual Check Out', 'Duration (mins)', 'Status', 'Note'].join(','),
      ...records.map(r => {
        const actualCheckOut = r.manualCheckOutAt || r.checkOutAt || r.computedCheckOutAt;
        const duration = Math.round((actualCheckOut - r.checkInAt) / 60000);
        
        let status = 'Active';
        if (r.manualCheckOutAt) {
          status = 'Manual Override';
        } else if (r.isCheckedOut && r.checkOutAt) {
          status = 'Completed';
        } else if (new Date() >= r.computedCheckOutAt) {
          status = 'Completed';
        }

        return [
          r.date,
          new Date(r.checkInAt).toLocaleString(),
          r.checkOutAt ? new Date(r.checkOutAt).toLocaleString() : 'Not checked out',
          new Date(r.computedCheckOutAt).toLocaleString(),
          r.manualCheckOutAt ? new Date(r.manualCheckOutAt).toLocaleString() : '',
          duration,
          status,
          r.note || ''
        ].map(field => `"${field}"`).join(',');
      })
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${from || 'all'}_${to || 'all'}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,  // NEW
  manualCheckOut,
  getTodayAttendance,
  getHistory,
  getAttendanceById,
  deleteAttendance,
  exportAttendance
};