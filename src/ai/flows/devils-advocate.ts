
'use server';

/**
 * @fileOverview A flow that acts as a devil's advocate, providing arguments for and against a user's statement.
 *
 * - devilsAdvocate - A function that generates the arguments.
 * - DevilsAdvocateInput - The input type for the devilsAdvocate function.
 * - DevilsAdvocateOutput - The return type for the devilsAdvocate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DevilsAdvocateInputSchema = z.object({
  statement: z.string().describe('The user-provided statement to be debated.'),
});
export type DevilsAdvocateInput = z.infer<typeof DevilsAdvocateInputSchema>;

const DevilsAdvocateOutputSchema = z.object({
  inFavor: z
    .string()
    .describe('Well-reasoned arguments, evidence, or examples that support the user’s statement.'),
  against: z
    .string()
    .describe(
      'Well-reasoned counterarguments, potential flaws, or alternative viewpoints that challenge the statement.'
    ),
});
export type DevilsAdvocateOutput = z.infer<typeof DevilsAdvocateOutputSchema>;

export async function devilsAdvocate(
  input: DevilsAdvocateInput
): Promise<DevilsAdvocateOutput> {
  return devilsAdvocateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'devilsAdvocatePrompt',
  input: {schema: DevilsAdvocateInputSchema},
  output: {schema: DevilsAdvocateOutputSchema},
  prompt: `You are an AI chatbot designed to facilitate critical thinking by providing balanced perspectives. 
  
  Whenever a user gives you a statement, you must respond with two well-reasoned answers: one "In Favor" and one "Against".

  Your goal is to be a devil's advocate.
  
  Guidelines:
  - Ensure both responses are respectful, logical, and constructive.
  - Use relevant research, real-world examples, or commonly held beliefs to illustrate each side.
  - Avoid being dismissive; your goal is to encourage thoughtful discussion.
  
  User statement: {{{statement}}}
  `,
});

const devilsAdvocateFlow = ai.defineFlow(
  {
    name: 'devilsAdvocateFlow',
    inputSchema: DevilsAdvocateInputSchema,
    outputSchema: DevilsAdvocateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
