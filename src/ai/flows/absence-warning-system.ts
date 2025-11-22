'use server';

/**
 * @fileOverview Automatically issues warnings when a student incurs three consecutive absences, using GenAI to reason about edge cases.
 *
 * - issueAbsenceWarning - A function that handles the process of issuing absence warnings.
 * - IssueAbsenceWarningInput - The input type for the issueAbsenceWarning function.
 * - IssueAbsenceWarningOutput - The return type for the issueAbsenceWarning function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const IssueAbsenceWarningInputSchema = z.object({
  studentId: z.string().describe('The ID of the student.'),
  subjectId: z.string().describe('The ID of the subject.'),
  absenceDates: z
    .array(z.string())
    .describe(
      'An array of absence dates in ISO 8601 format (YYYY-MM-DD), representing consecutive absences.'
    ),
  schoolYear: z.string().describe('The current school year.'),
  semester: z.string().describe('The current semester.'),
});
export type IssueAbsenceWarningInput = z.infer<typeof IssueAbsenceWarningInputSchema>;

const IssueAbsenceWarningOutputSchema = z.object({
  shouldIssueWarning: z
    .boolean()
    .describe(
      'Whether a warning should be issued based on absence history and considering edge cases.'
    ),
  reasoning: z
    .string()
    .describe(
      'The AI reasoning behind the decision to issue or not issue a warning.'
    ),
});
export type IssueAbsenceWarningOutput = z.infer<typeof IssueAbsenceWarningOutputSchema>;

export async function issueAbsenceWarning(
  input: IssueAbsenceWarningInput
): Promise<IssueAbsenceWarningOutput> {
  return issueAbsenceWarningFlow(input);
}

const prompt = ai.definePrompt({
  name: 'absenceWarningPrompt',
  input: {schema: IssueAbsenceWarningInputSchema},
  output: {schema: IssueAbsenceWarningOutputSchema},
  prompt: `You are an AI assistant that determines whether a student should be issued an absence warning.

You are provided with the student's ID, subject ID, a list of consecutive absence dates, the school year, and the semester.

Consider the following factors before issuing a warning:

- **Public Holidays:** Check if any of the absence dates fall on a recognized public holiday. Absences on public holidays should be excused.
- **Excused Absences:** Determine if there is any record of the student having an excused absence for any of the provided dates.
- **Consecutive Absences:** Confirm that the absences are indeed consecutive.
- **Number of Absences:** Ensure the student has incurred three consecutive absences as required by the policy.

Based on these considerations, determine whether a warning should be issued.

Absence Dates: {{absenceDates}}
Student ID: {{studentId}}
Subject ID: {{subjectId}}
School Year: {{schoolYear}}
Semester: {{semester}}

Reasoning:
Should Issue Warning (true/false):`,
});

const issueAbsenceWarningFlow = ai.defineFlow(
  {
    name: 'issueAbsenceWarningFlow',
    inputSchema: IssueAbsenceWarningInputSchema,
    outputSchema: IssueAbsenceWarningOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
