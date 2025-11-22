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
  qrCodeData: z.string().describe('The data extracted from the QR code.'),
  subjectId: z.string().describe('The ID of the subject for which attendance is being recorded.'),
  studentId: z.string().describe('The ID of the student whose attendance is being recorded.'),
  qrCodeSecret: z.string().describe('The secret key used to generate the QR code.'),
  attendanceSessionActive: z.boolean().describe('Indicates if the attendance session is currently active.'),
  studentRegistered: z.boolean().describe('Indicates if the student is registered for the subject.'),
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

  Your task is to determine if the attendance entry is valid based on the following information:
  - QR Code Data: {{{qrCodeData}}}
  - Subject ID: {{{subjectId}}}
  - Student ID: {{{studentId}}}
  - QR Code Secret: {{{qrCodeSecret}}}
  - Attendance Session Active: {{{attendanceSessionActive}}}
  - Student Registered: {{{studentRegistered}}}

  Consider these factors to prevent errors:
  - Verify that the QR code data contains the subjectId, studentId and qrCodeSecret.
  - Check if the attendance session is active. If not, the attendance entry is invalid.
  - Confirm that the student is registered for the subject. If not, the attendance entry is invalid.
  - Ensure that the QR code secret matches the stored secret in the database. If not, the attendance entry is invalid.

  Based on your analysis, determine if the attendance entry is valid and provide a reason for your determination.
  Set the isValid field to true if the attendance entry is valid; otherwise, set it to false and explain the reasoning behind it.
  Make sure that the output is a valid JSON object.
  `,
});

const validateAttendanceFlow = ai.defineFlow(
  {
    name: 'validateAttendanceFlow',
    inputSchema: ValidateAttendanceInputSchema,
    outputSchema: ValidateAttendanceOutputSchema,
  },
  async input => {
    const {output} = await validateAttendancePrompt(input);
    return output!;
  }
);
