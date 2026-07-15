const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, unique: true },
    name:            { type: String, default: '' },
    email:           { type: String, default: '' },
    universityId:    { type: String, default: '' },
    role:            { type: String, default: '' },
    department:      { type: String, default: '' },
    category:        { type: String, default: '' },
    subject:         { type: String, default: '' },
    feedback:        { type: String, required: true },
    rating:          { type: Number, min: 1, max: 5 },
    attachmentUrl:   { type: String, default: '' },
    read:            { type: Boolean, default: false },
    status:          { type: String, default: 'new' },
  },
  { timestamps: true }
);

FeedbackSchema.pre('save', async function (next) {
  if (!this.referenceNumber) {
    const year  = new Date().getFullYear();
    const count = await mongoose.model('Feedback').countDocuments();
    this.referenceNumber = `UOMP-FB-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
