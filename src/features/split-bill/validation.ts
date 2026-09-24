import { z } from "zod";
export const participantNameSchema = z
  .string()
  .trim()
  .min(1, "Nama wajib diisi")
  .max(60);
export const titleSchema = z
  .string()
  .trim()
  .min(1, "Judul wajib diisi")
  .max(100);
