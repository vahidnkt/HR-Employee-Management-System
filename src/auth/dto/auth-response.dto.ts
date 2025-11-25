export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string = 'Bearer';
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
