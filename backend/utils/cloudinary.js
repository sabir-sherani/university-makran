const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Hard ceiling for every upload in the app, regardless of what an individual
// route asks for — a route's `formats` list may only narrow this, never
// extend it. Keeps the LocalStorage fallback from ever writing something
// like .exe/.html into public/uploads, which express.static would serve.
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'];
const EXT_MIME_MAP = {
  jpg:  ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png:  ['image/png'],
  webp: ['image/webp'],
  pdf:  ['application/pdf'],
  doc:  ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

function sanitizeFormats(formats) {
  const list = (Array.isArray(formats) && formats.length ? formats : ALLOWED_EXTENSIONS)
    .map((f) => String(f).toLowerCase())
    .filter((f) => ALLOWED_EXTENSIONS.includes(f));
  return list.length ? list : ALLOWED_EXTENSIONS;
}

// Local disk storage that sets req.file.path to a URL path (e.g. /uploads/file.jpg)
// so all route code using req.file.path works the same regardless of environment.
class LocalStorage {
  constructor(folder, formats) {
    this.folder = folder;
    this.allowed = sanitizeFormats(formats);
    this.uploadDir = path.join(__dirname, '../public/uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  _handleFile(req, file, cb) {
    // fileFilter (see createFileFilter below) already rejects disallowed
    // extensions before multer ever calls this, but never trust the
    // client-supplied extension blindly for the filename we write to disk —
    // re-derive it against the same whitelist here too.
    const rawExt = path.extname(file.originalname).slice(1).toLowerCase();
    const ext = this.allowed.includes(rawExt) ? rawExt : this.allowed[0];
    const safeFolder = String(this.folder).replace(/[^a-zA-Z0-9/_-]/g, '_');
    const filename = `${safeFolder.replace(/\//g, '-')}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const dest = path.join(this.uploadDir, filename);
    const out = fs.createWriteStream(dest);
    file.stream.pipe(out);
    out.on('error', cb);
    out.on('finish', () => cb(null, { filename, path: `/uploads/${filename}`, size: out.bytesWritten }));
  }

  _removeFile(req, file, cb) {
    fs.unlink(path.join(this.uploadDir, file.filename), cb);
  }
}

function createStorage(folder, formats) {
  const allowed = sanitizeFormats(formats);
  if (hasCloudinary) {
    return new CloudinaryStorage({
      cloudinary,
      params: {
        folder: `uomp/${folder}`,
        allowed_formats: allowed,
        resource_type: 'auto',
      },
    });
  }
  // No Cloudinary credentials — use local disk (development fallback)
  return new LocalStorage(folder, allowed);
}

// Rejects anything outside the whitelist by BOTH file extension and MIME
// type, so a renamed .exe (e.g. "resume.pdf" that's actually an executable)
// can't slip through on extension alone.
function createFileFilter(formats) {
  const allowed = sanitizeFormats(formats);
  const validMimes = new Set(allowed.flatMap((e) => EXT_MIME_MAP[e] || []));
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error(`Only these file types are allowed: ${allowed.join(', ')}.`));
    }
    if (!validMimes.has(file.mimetype)) {
      return cb(new Error('The uploaded file\'s content does not match its extension.'));
    }
    cb(null, true);
  };
}

// One-stop helper: storage + fileFilter + a 10MB default limit, all sharing
// the same format whitelist. Prefer this over calling multer() directly.
function createUpload(folder, formats, opts = {}) {
  const { limits, ...rest } = opts;
  return multer({
    storage: createStorage(folder, formats),
    fileFilter: createFileFilter(formats),
    limits: { fileSize: 10 * 1024 * 1024, ...(limits || {}) },
    ...rest,
  });
}

module.exports = { cloudinary, createStorage, createFileFilter, createUpload, ALLOWED_EXTENSIONS };
