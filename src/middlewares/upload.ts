import multer, { memoryStorage } from "multer";

const ONE_MB = 1 * 1024 * 1024;

const storage = memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: ONE_MB },
  fileFilter: (req, file, callback) => {
    const allowedExtensions = [".txt", ".pdf"];
    const allowedMimetypes = ["text/plain", "application/pdf"];

    const extension = file.originalname
      .substring(file.originalname.lastIndexOf("."))
      .toLowerCase();

    if (
      !allowedExtensions.includes(extension) ||
      !allowedMimetypes.includes(file.mimetype)
    ) {
      return callback(new Error("Invalid file type."));
    }

    callback(null, true);
  },
});
