const { v2: cloudinary } = require('cloudinary');

function configureCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return false;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return true;
}

async function uploadImage(base64Data) {
  if (!configureCloudinary()) {
    return { url: base64Data, publicId: null, fallback: true };
  }
  const result = await cloudinary.uploader.upload(base64Data, {
    folder: 'sketchforge',
    resource_type: 'image',
  });
  return { url: result.secure_url, publicId: result.public_id };
}

module.exports = { uploadImage, configureCloudinary };
