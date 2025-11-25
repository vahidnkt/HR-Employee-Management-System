import { Schools } from './schools.entity';

export const schoolsProviders = [
  {
    provide: 'SCHOOLS_REPOSITORY',
    useValue: Schools,
  },
];
