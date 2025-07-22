'use server';

import { generatePersonalizedContent, PersonalizedContentInput } from '@/ai/flows/generate-personalized-content';
import { z } from 'zod';

const PersonalizedContentSchema = z.object({
  regulatoryNeeds: z.string().min(1, 'Regulatory needs are required.'),
  companySize: z.string().min(1, 'Company size is required.'),
  techStack: z.string().min(1, 'Technology stack is required.'),
  riskTolerance: z.string().min(1, 'Risk tolerance is required.'),
});

export async function getPersonalizedSolution(
  values: PersonalizedContentInput
) {
  const validatedFields = PersonalizedContentSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: 'Invalid input. Please fill all fields.',
      data: null,
    };
  }

  try {
    const result = await generatePersonalizedContent(validatedFields.data);
    return { error: null, data: result.personalizedContent };
  } catch (error) {
    console.error(error);
    return {
      error: 'Failed to generate content. Please try again.',
      data: null,
    };
  }
}
