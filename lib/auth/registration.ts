import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "./password";
import { isValidUserUid, normalizeEmail, normalizeUserUid } from "./normalization";
import { generateUniqueUserUid } from "./uid";
import { recalculateAuthoritativeNetwork } from "@/lib/rank-recalculation.server";
import { isValidIanaTimeZone, resolveUserTimeZone } from "@/lib/timezone.server";
import { countryName, isCountryCode } from "@/lib/countries";

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().email("Enter a valid email address.").transform(normalizeEmail),
  password: z.string().min(8, "Password must be at least 8 characters.").refine(value => value.trim().length >= 8, "Password cannot be whitespace only."),
  referralUid: z.string().trim().optional().transform(value => value ? normalizeUserUid(value) : undefined).refine(value => !value || isValidUserUid(value), "Invalid referral UID."),
  countryCode:z.string({message:"Please select your country."}).trim().toUpperCase().length(2,"Please select your country.").refine(isCountryCode,"Please select your country."),
  timezone:z.string().trim().refine(isValidIanaTimeZone,"Select a valid timezone.").optional(),
});

export type RegistrationInput = z.input<typeof registrationSchema>;
export type SafeRegisteredUser = { uid: string; email: string; name: string; role: "USER" | "ADMIN"; createdAt: Date };

export class RegistrationError extends Error {
  constructor(public code: "DUPLICATE_EMAIL" | "INVALID_REFERRAL" | "UID_UNAVAILABLE", message: string) { super(message); }
}

export async function registerUser(input: RegistrationInput): Promise<SafeRegisteredUser> {
  const data = registrationSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  try {
    return await prisma.$transaction(async tx => {
      if (await tx.user.findUnique({ where: { email: data.email }, select: { id: true } }))
        throw new RegistrationError("DUPLICATE_EMAIL", "An account with this email already exists.");
      const sponsor = data.referralUid
        ? await tx.user.findUnique({ where: { uid: data.referralUid }, select: { id: true, uid: true } })
        : null;
      if (data.referralUid && !sponsor) throw new RegistrationError("INVALID_REFERRAL", "Invalid referral UID.");
      const uid = await generateUniqueUserUid(tx);
      const selectedCountryName=countryName(data.countryCode),created=await tx.user.create({
        data: { uid, email: data.email, passwordHash, name: data.name, sponsorId: sponsor?.id, sponsorUid: sponsor?.uid,country:selectedCountryName,countryName:selectedCountryName,countryCode:data.countryCode,timezone:resolveUserTimeZone(data.timezone,selectedCountryName) },
        select: { uid: true, email: true, name: true, role: true, createdAt: true },
      });
      await recalculateAuthoritativeNetwork(tx);return created;
    });
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const fields = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [];
      if (fields.includes("email")) throw new RegistrationError("DUPLICATE_EMAIL", "An account with this email already exists.");
      if (fields.includes("uid")) throw new RegistrationError("UID_UNAVAILABLE", "Unable to create the account. Please retry.");
    }
    throw error;
  }
}
