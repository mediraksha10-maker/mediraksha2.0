import { pool } from '../config/db.js';

/**
 * @route   POST /api/user/report/upload
 * @desc    Upload a new medical report
 */
export const uploadReport = async (req, res) => {
  try {
    const userId = req.user.id; // Assumes authVerify sets req.user
    const { title, category, visibility, doctorId, uploadedBy, fileId } = req.body;
    
    // Check if file is present
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const originalFileName = req.file.originalname;
    const fileSize = req.file.size;

    // Note: If you are saving the file to S3/Cloudinary, you'd do it here 
    // and grab the resulting fileId/URL. For now, we store metadata.

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
      fileId || null, // placeholder or actual ID from cloud storage
      visibility || 'private',
      originalFileName
    ];

    const result = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: 'Report uploaded successfully',
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

    const query = `SELECT * FROM "Report" WHERE "Id" = $1 AND "userId" = $2;`;
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

    // You can perform a DELETE directly but using RETURNING helps confirm it existed
    const query = `DELETE FROM "Report" WHERE "Id" = $1 AND "userId" = $2 RETURNING *;`;
    const result = await pool.query(query, [reportId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized action.' });
    }

    // Note: If actual files are stored in AWS S3/Cloudinary, trigger the file deletion here using result.rows[0].fileId

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully',
      deletedReportId: reportId
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting report.' });
  }
};