import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerUser, RegistrationError } from "@/lib/auth/registration";

export async function POST(request: Request) {
  try {
    const input: unknown = await request.json();
    const user = await registerUser(input as never);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid registration details." }, { status: 400 });
    if (error instanceof RegistrationError) {
      const status = error.code === "DUPLICATE_EMAIL" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    console.error("Registration failed", { cause: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Unable to create the account. Please try again." }, { status: 500 });
  }
}
