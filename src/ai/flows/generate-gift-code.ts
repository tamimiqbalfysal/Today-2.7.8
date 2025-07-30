
'use server';

/**
 * @fileOverview A flow to generate a unique, memorable gift code.
 *
 * - generateGiftCode - A function that generates the gift code.
 * - GenerateGiftCodeOutput - The return type for the generateGiftCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateGiftCodeOutputSchema = z.object({
  code: z
    .string()
    .describe(
      'A unique, memorable, and easy-to-type gift code. It should be a short sentence in lowercase, with words separated by dots or underscores, and ending with a simple number (e.g., i.love.cats_123).'
    ),
});
export type GenerateGiftCodeOutput = z.infer<
  typeof GenerateGiftCodeOutputSchema
>;

export async function generateGiftCode(): Promise<GenerateGiftCodeOutput> {
  return generateGiftCodeFlow();
}

const prompt = ai.definePrompt({
  name: 'generateGiftCodePrompt',
  output: {schema: GenerateGiftCodeOutputSchema},
  prompt: `Generate a unique, memorable, and easy-to-type gift code.

  Follow these rules:
  - The code must be a short, simple sentence (3-4 words).
  - All letters must be lowercase.
  - Separate words with either a dot (.) or an underscore (_).
  - End the code with a simple 2 or 3-digit number.
  - The overall code should be creative and fun.

  Examples:
  - we.love.coding_101
  - time.for.a.snack_42
  - happy_little_cloud_789
  - lets_build_something_cool_55
  `,
});

const generateGiftCodeFlow = ai.defineFlow(
  {
    name: 'generateGiftCodeFlow',
    outputSchema: GenerateGiftCodeOutputSchema,
  },
  async () => {
    const {output} = await prompt();
    return output!;
  }
);
