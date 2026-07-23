import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyPassword, createAccessToken } from '@/lib/auth-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username_or_email, password } = body;

    if (!username_or_email || !password) {
      return NextResponse.json(
        { detail: 'Username/email dan password wajib diisi' },
        { status: 400 }
      );
    }

    const cleanInput = String(username_or_email).trim();

    // Query user by username or email
    const user = db
      .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(cleanInput, cleanInput) as any;

    if (!user) {
      return NextResponse.json(
        { detail: 'Username atau password salah' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { detail: 'Akun Anda dinonaktifkan. Silakan hubungi admin.' },
        { status: 403 }
      );
    }

    const isPasswordValid = verifyPassword(password, user.hashed_password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { detail: 'Username atau password salah' },
        { status: 401 }
      );
    }

    const token = createAccessToken({
      username: user.username,
      role: user.role,
    });

    return NextResponse.json({
      access_token: token,
      token_type: 'bearer',
      role: user.role,
      username: user.username,
    });
  } catch (err: any) {
    console.error('Error on POST /api/auth/login:', err);
    return NextResponse.json(
      { detail: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
