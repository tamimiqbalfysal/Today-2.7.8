'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating personalized content for cloud infrastructure needs.
 *
 * It allows business owners to tailor their cloud offering to suit their unique business requirements.
 * generatePersonalizedContent - A function that generates personalized content based on user input.
 * PersonalizedContentInput - The input type for the generatePersonalizedContent function.
 * PersonalizedContentOutput - The return type for the generatePersonalizedContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedContentInputSchema = z.object({
  regulatoryNeeds: z
    .string()
    .describe('The regulatory requirements that the business must adhere to.'),
  companySize: z
    .string()
    .describe('The size of the company (e.g., small, medium, large).'),
  techStack: z.string().describe('The technology stack used by the company.'),
  riskTolerance: z
    .string()
    .describe('The risk tolerance of the company (e.g., low, medium, high).'),
});
export type PersonalizedContentInput = z.infer<typeof PersonalizedContentInputSchema>;

const PersonalizedContentOutputSchema = z.object({
  personalizedContent: z
    .string()
    .describe('The personalized content for the cloud infrastructure.'),
});
export type PersonalizedContentOutput = z.infer<typeof PersonalizedContentOutputSchema>;

export async function generatePersonalizedContent(
  input: PersonalizedContentInput
): Promise<PersonalizedContentOutput> {
  return generatePersonalizedContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedContentPrompt',
  input: {schema: PersonalizedContentInputSchema},
  output: {schema: PersonalizedContentOutputSchema},
  prompt: `You are an AI assistant specializing in cloud infrastructure solutions for businesses.

  Based on the following information about the business, generate personalized content that highlights how our cloud offering can perfectly suit their needs.

  Regulatory Needs: {{{regulatoryNeeds}}}
  Company Size: {{{companySize}}}
  Tech Stack: {{{techStack}}}
  Risk Tolerance: {{{riskTolerance}}}

  The personalized content should address the specific requirements and concerns of the business, and it should be persuasive and engaging.
  `,
});

const generatePersonalizedContentFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedContentFlow',
    inputSchema: PersonalizedContentInputSchema,
    outputSchema: PersonalizedContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
