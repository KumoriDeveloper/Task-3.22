import { registerEnumType } from '@nestjs/graphql';
import { LinkKind, SkillCategory, SkillLevel } from '@prisma/client';

registerEnumType(SkillCategory, {
  name: 'SkillCategory',
  description: 'Grouping of a skill on the card',
});

registerEnumType(SkillLevel, {
  name: 'SkillLevel',
  description: 'Self-assessed proficiency level',
});

registerEnumType(LinkKind, {
  name: 'LinkKind',
  description: 'Kind of an external professional resource',
});

export { LinkKind, SkillCategory, SkillLevel };
