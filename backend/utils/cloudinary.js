const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs   = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const hasCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Local disk storage that sets req.file.path to a URL path (e.g. /uploads/file.jpg)
// so all route code using req.file.path works the same regardless of environment.
class LocalStorage {
  constructor(folder) {
    this.folder   = folder;
    this.uploadDir = path.join(__dirname, '../public/uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  _handleFile(req, file, cb) {
    const ext      = path.extname(file.originalname) || '.bin';
    const filename = `${this.folder}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const dest     = path.join(this.uploadDir, filename);
    const out      = fs.createWriteStream(dest);
    file.stream.pipe(out);
    out.on('error', cb);
    out.on('finish', () => cb(null, { filename, path: `/uploads/${filename}`, size: out.bytesWritten }));
  }

  _removeFile(req, file, cb) {
    fs.unlink(path.join(this.uploadDir, file.filename), cb);
  }
}

function createStorage(folder, formats) {
  if (hasCloudinary) {
    return new CloudinaryStorage({
      cloudinary,
      params: {
        folder:          `uomp/${folder}`,
        allowed_formats: formats || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx'],
        resource_type:   'auto',
      },
    });
  }
  // No Cloudinary credentials — use local disk (development fallback)
  return new LocalStorage(folder);
}

module.exports = { cloudinary, createStorage };
