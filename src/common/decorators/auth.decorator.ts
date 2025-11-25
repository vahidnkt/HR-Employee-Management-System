import { SetMetadata } from '@nestjs/common';

export const Auth = () => SetMetadata('isAuth', true);
