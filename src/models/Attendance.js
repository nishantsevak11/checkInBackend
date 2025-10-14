const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true
  },
  checkInAt: {
    type: Date,
    required: true
  },
  checkOutAt: {
    type: Date,
    default: null  // Actual checkout time (when user checks out)
  },
  computedCheckOutAt: {
    type: Date,
    required: true  // Expected checkout time (check-in + work duration)
  },
  manualCheckOutAt: {
    type: Date,
    default: null  // Manual override (for editing past records)
  },
  note: {
    type: String,
    maxlength: [500, 'Note cannot exceed 500 characters']
  },
  isCheckedOut: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Virtuals
attendanceSchema.virtual('actualCheckOutAt').get(function() {
  return this.manualCheckOutAt || this.checkOutAt || this.computedCheckOutAt;
});

attendanceSchema.virtual('durationMinutes').get(function() {
  const checkOut = this.manualCheckOutAt || this.checkOutAt || this.computedCheckOutAt;
  return Math.round((checkOut - this.checkInAt) / (1000 * 60));
});

attendanceSchema.virtual('status').get(function() {
  if (this.manualCheckOutAt) {
    return 'manual_override';
  }
  if (this.isCheckedOut && this.checkOutAt) {
    return 'completed';
  }
  const now = new Date();
  if (now >= this.computedCheckOutAt) {
    return 'completed';
  }
  return 'active';
});

attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Attendance', attendanceSchema);