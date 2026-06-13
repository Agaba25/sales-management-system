import User from "../models/User.js";
import pool from "../config/db.js";

const users = [
  {
    name: "CEO User",
    email: "ceo@example.com",
    password: "password123",
    role: "CEO",
  },
  {
    name: "Manager User",
    email: "manager@example.com",
    password: "password123",
    role: "MANAGER",
  },
  {
    name: "Salesperson User",
    email: "salesperson@example.com",
    password: "password123",
    role: "SALESPERSON",
  },
];

const customers = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "555-1234",
    address: "123 Main St",
  },
  {
    name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "555-9876",
    address: "456 Industrial Rd",
  },
  {
    name: "Walk-in Customer",
    email: "walkin@example.com",
    phone: "000-000-0000",
    address: "N/A",
  },
];

try {
  for (const userData of users) {
    const existingUser = await User.findByEmail(userData.email);

    if (existingUser) {
      console.log(`User already exists: ${userData.email}`);
      continue;
    }

    const user = await User.create(userData);
    console.log(`User created: ${user.email} (${user.role})`);
  }

  for (const customerData of customers) {
    const result = await pool.query(
      `SELECT id FROM customers WHERE email = $1 LIMIT 1`,
      [customerData.email]
    );

    if (result.rows.length > 0) {
      console.log(`Customer already exists: ${customerData.email}`);
      continue;
    }

    await pool.query(
      `INSERT INTO customers (name, email, phone, address, is_active)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [customerData.name, customerData.email, customerData.phone, customerData.address]
    );
    console.log(`Customer created: ${customerData.name}`);
  }
} catch (error) {
  console.error("Seed failed:", error.message);
} finally {
  await pool.end();
}
