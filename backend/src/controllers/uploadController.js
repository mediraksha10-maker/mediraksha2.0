import { pool } from '../config/db.js';

/**
 * @route   POST /api/user/report/upload
 * @desc    Upload a new medical report (Converts file buffer to Base64 and saves to DB)
 */
export const uploadReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, category, visibility, doctorId, uploadedBy } = req.body;
    
    // 1. Validate that the file was caught by Multer memory storage
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const originalFileName = req.file.originalname;
    const fileSize = req.file.size;
    
    // FIX: Convert the binary RAM buffer into a clean Base64 string that maps to your TEXT/VARCHAR column
    const base64FileData = req.file.buffer.toString('base64'); 

    // 2. Insert into the database
    const query = `
      INSERT INTO "Report" 
      ("userId", "uploadedBy", "doctorId", "title", "category", "fileSize", "fileId", "visibility", "originalFileName", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *;
    `;

    const values = [
      userId,
      uploadedBy || 'user',
      doctorId || null,
      title,
      category || null,
      fileSize,
      base64FileData, // <-- Fixed: Sending a text-safe string representation of the file instead of raw bytes
      visibility || 'private',
      originalFileName
    ];

    const result = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: 'Report uploaded and saved successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error uploading report:', error);
    return res.status(500).json({ success: false, message: 'Server error during upload.' });
  }
};

/**
 * @route   GET /api/user/report/all
 * @desc    Get all reports for the logged-in user
 */
export const getAllReports = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `SELECT * FROM "Report" WHERE "userId" = $1 ORDER BY "created_at" DESC;`;
    const result = await pool.query(query, [userId]);

    return res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching reports.' });
  }
};

/**
 * @route   GET /api/user/report/:id
 * @desc    Get a specific report by ID (restricted to the owner)
 */
export const getReportById = async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    const query = `SELECT * FROM "Report" WHERE "id" = $1 AND "userId" = $2;`;
    const result = await pool.query(query, [reportId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized access.' });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching report.' });
  }
};

/**
 * @route   DELETE /api/user/report/:id
 * @desc    Delete a report by ID (restricted to the owner)
 */
export const deleteReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const reportId = req.params.id;

    const query = `DELETE FROM "Report" WHERE "id" = $1 AND "userId" = $2 RETURNING *;`;
    const result = await pool.query(query, [reportId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized action.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      deletedReportId: reportId
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting account.' });
  }
};