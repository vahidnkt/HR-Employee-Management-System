import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    // i use this for to show the validation errors properly
    app.useGlobalPipes(new ValidationPipe());

    await app.listen(process.env.PORT ?? 3000);
    console.log(
      `Server is running http://localhost ${process.env.PORT ?? 3000}`,
    );
  } catch (error) {
    console.log('Error in server sid', error);
    process.exit(1);
  }
}
bootstrap().catch((err) => {
  console.log('Error in server sid', err);
  process.exit(1);
});
