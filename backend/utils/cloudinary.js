const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function createStorage(folder, formats) {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder:         `uomp/${folder}`,
      allowed_formats: formats || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx'],
      resource_type:  'auto',
    },
  });
}

module.exports = { cloudinary, createStorage };
