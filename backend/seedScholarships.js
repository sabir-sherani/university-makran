const mongoose = require('mongoose');
require('dotenv').config();

const Scholarship = require('./models/Scholarship');

const data = [
  {
    serialNo: 1,
    name: 'BEEF',
    eligibility: 'From Govt. of Balochistan. For BS top 10 students per class but result not below 60% Marks / 3 CGPA.',
    award: "Scholarship Amount = Rs. 84,000 (Deposit in students' account)",
  },
  {
    serialNo: 2,
    name: 'PEEF',
    eligibility: 'Students who have done Intermediate (12th) fresh and submitted forms to PEEF office.',
    award: 'Awarded amount is Rs. 240,000 for four years.',
  },
  {
    serialNo: 3,
    name: 'UoMP Merit-Based',
    eligibility: 'From University of Makran, Panjgur. Result of last semester should be 3 GPA or above 3 GPA.',
    award: 'Pay fee of current semester based on result of previous semester.',
  },
  {
    serialNo: 4,
    name: 'UoMP Need-Based',
    eligibility: 'From University of Makran, Panjgur. Students who have submitted forms will be interviewed for recommendations of deserving students.',
    award: 'Pay fee for the current semester and fee of all coming semesters.',
  },
  {
    serialNo: 5,
    name: 'Honhaar',
    eligibility: 'Initiative of Punjab Higher Educational Commission and selection is based on aggregate of Intermediate (12th).',
    award: 'Pay fee of 8 semesters of selected students.',
  },
];

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/university_makran')
  .then(async () => {
    await Scholarship.deleteMany({});
    await Scholarship.insertMany(data);
    console.log('✅ 5 scholarships seeded successfully.');
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
