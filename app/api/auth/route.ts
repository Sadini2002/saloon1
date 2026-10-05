import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { compare } from "bcryptjs";
import * as jose from "jose";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Input validation
    if (!body?.email || !body?.password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // 2. Find user by email
    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
      },
    });

    // 3. User check (Generic error message prevents email enumeration)
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }

        
      );
    }

    // 4. Check status with explicit 403 status code
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account is disabled. Please contact the administrator." },
        { status: 403 }
      );
    }

    // 5. Compare password
    const isPasswordValid = await compare(body.password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 6. Check environment secrets
    const secretText = process.env.JOSE_SECRET;
    if (!secretText) {
      return NextResponse.json(
        { error: "JOSE_SECRET is not configured" },
        { status: 500 }
      );
    }

    // 7. Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // 8. Create JWT Token
    const secret = new TextEncoder().encode(secretText);
    const token = await new jose.SignJWT({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastname,
      role: user.role,
      privileges: user.privileges,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("2h")
      .sign(secret);

    // 9. Send Response with Cookie
    const response = NextResponse.json(
      {
        message: "Login successful",
        role: user.role,
      },
      { status: 200 }
    );

    response.cookies.set({
      name: "logintoken",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 2,
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Auth Handler Error:", error);
    return NextResponse.json(
      { error: "Invalid request payload or server error" },
      { status: 400 }
    );
  }
}