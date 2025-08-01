const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const protect = require("../middleware/authMiddleware");
const path = require("path");
const fs = require("fs");

router.post("/", protect, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
  
  res.json({ 
    imageUrl: `/uploads/${req.file.filename}`,
    fullImageUrl: imageUrl,
    filename: req.file.filename
  });
});

router.get("/check/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "..", "public", "uploads", filename);
  
  if (fs.existsSync(filePath)) {
    res.json({ 
      exists: true, 
      filename,
      url: `/uploads/${filename}`,
      fullUrl: `${req.protocol}://${req.get('host')}/uploads/${filename}`
    });
  } else {
    res.status(404).json({ 
      exists: false, 
      filename,
      message: "File not found" 
    });
  }
});

module.exports = router;
