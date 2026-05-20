import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request
) {
  try {
    const body = await request.json()

    const {
      name,
      lastName,
      phone,
      email,
      password,
    } = body

    // Validate
    if (
      !name ||
      !lastName ||
      !phone ||
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          message:
            "Missing required fields",
        },
        {
          status: 400,
        }
      )
    }

    // Check existing user
    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      })

    if (existingUser) {
      return NextResponse.json(
        {
          message:
            "Email already exists",
        },
        {
          status: 409,
        }
      )
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(password, 10)

    // Create user
    await prisma.user.create({
      data: {
        name,
        lastName,
        phone,
        email,
        password: hashedPassword,
        role: "USER",
      },
    })

    return NextResponse.json(
      {
        message:
          "Register successful",
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message:
          "Internal server error",
      },
      {
        status: 500,
      }
    )
  }
}