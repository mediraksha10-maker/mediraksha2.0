import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { pool } from "../config/db.js";

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// SIGNUP
export const signup = async (req, res) => {
  try {
    const { name, email, age, gender, number, password } = req.body;

    // Check existing user
    const existingUser = await pool.query(
      "SELECT * FROM \"User\" WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const newUser = await pool.query(
      `INSERT INTO "User"
      (name, email, age, gender, number, password)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [name, email, age, gender, number, hashedPassword]
    );

    const user = newUser.rows[0];

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: "Signup successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query(
      "SELECT * FROM \"User\" WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// doctor signup
export const doctorSignup = async (req, res) => {
  try {
    const { name, email, number, age, gender, hospital, speciality, password } = req.body;

    // Check existing doctor
    const existingDoctor = await pool.query(
      "SELECT * FROM \"Doctor\" WHERE email = $1",
      [email]
    );

    if (existingDoctor.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Doctor already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert doctor
    const newDoctor = await pool.query(
      `INSERT INTO "Doctor"
      (name, email, number, age, gender, hospital, speciality, password)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [name, email, number, age, gender, hospital, speciality, hashedPassword]
    );

    const doctor = newDoctor.rows[0];

    // Generate token
    const token = generateToken(doctor.id);

    res.status(201).json({
      success: true,
      message: "Doctor signup successful",
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        number: doctor.number,
        age: doctor.age,
        gender: doctor.gender,
        hospital: doctor.hospital,
        speciality: doctor.speciality,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// doctor login
export const doctorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find doctor
    const result = await pool.query(
      "SELECT * FROM \"Doctor\" WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const doctor = result.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(
      password,
      doctor.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(doctor.id);

    res.status(200).json({
      success: true,
      message: "Doctor login successful",
      token,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email,
        number: doctor.number,
        age: doctor.age,
        gender: doctor.gender,
        hospital: doctor.hospital,
        speciality: doctor.speciality,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// LOGOUT
export const logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};