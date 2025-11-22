
// src/ai/flows/attendance-validator.ts
'use server';

/**
 * @fileOverview An AI-powered attendance validation tool.
 *
 * - validateAttendance - A function that validates attendance based on QR code data.
 * - ValidateAttendanceInput - The input type for the validateAttendance function.
 * - ValidateAttendanceOutput - The return type for the validateAttendance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateAttendanceInputSchema = z.object({
  qrCodeData: z.string().describe('The JSON string data extracted from the QR code.'),
  qrCodeSecret: z.string().describe('The secret key for the currently active attendance session.'),
  attendanceSessionActive: z.boolean().describe('Indicates if the attendance session is currently active.'),
});
export type ValidateAttendanceInput = z.infer<typeof ValidateAttendanceInputSchema>;

const ValidateAttendanceOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the attendance entry is valid or not.'),
  reason: z.string().describe('The reason for invalid attendance, if any.'),
});
export type ValidateAttendanceOutput = z.infer<typeof ValidateAttendanceOutputSchema>;

export async function validateAttendance(input: ValidateAttendanceInput): Promise<ValidateAttendanceOutput> {
  return validateAttendanceFlow(input);
}

const validateAttendancePrompt = ai.definePrompt({
  name: 'validateAttendancePrompt',
  input: {schema: ValidateAttendanceInputSchema},
  output: {schema: ValidateAttendanceOutputSchema},
  prompt: `You are an AI assistant that validates attendance entries based on QR code data.

  Your task is to determine if an attendance entry is valid. A valid entry must satisfy ALL of the following conditions:
  1. The attendance session for the subject must be active.
  2. The 'qrCodeSecret' from the QR code must exactly match the 'qrCodeSecret' of the active session.

  Here is the information for the current attempt:
  - Attendance Session is Active: {{{attendanceSessionActive}}}
  - Active Session's Secret Key: {{{qrCodeSecret}}}
  - QR Code Data (JSON String): {{{qrCodeData}}}

  First, parse the 'qrCodeData' JSON string. It should contain a 'qrCodeSecret'.
  Then, compare the parsed secret from the QR code with the 'Active Session's Secret Key'.

  Based on all conditions, determine if the attendance is valid.
  - If valid, set 'isValid' to true and 'reason' to "Attendance validated."
  - If invalid, set 'isValid' to false and provide a clear, single reason for the failure (e.g., "QR code is for a different session.", "Attendance session is not active.").
  `,
});

const validateAttendanceFlow = ai.defineFlow(
  {
    name: 'validateAttendanceFlow',
    inputSchema: ValidateAttendanceInputSchema,
    outputSchema: ValidateAttendanceOutputSchema,
  },
  async input => {
    // The prompt is now structured to handle the validation logic.
    const {output} = await validateAttendancePrompt(input);
    return output!;
  }
);
