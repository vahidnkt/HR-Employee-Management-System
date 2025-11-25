import { SetMetadata } from '@nestjs/common';

export const Device = () => SetMetadata('requireDevice', true);
