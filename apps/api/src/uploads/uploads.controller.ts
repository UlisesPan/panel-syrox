import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UploadsService } from './uploads.service.js';

@ApiTags('Imágenes')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Indica si la subida de imágenes (Cloudinary) está configurada' })
  status() {
    return this.uploads.status();
  }

  @Post('signature')
  @HttpCode(200)
  @ApiOperation({ summary: 'Firma una subida directa a Cloudinary (el archivo no pasa por la API)' })
  sign() {
    return this.uploads.sign();
  }
}
