import { describe, expect, it } from 'vitest';
import { signParams } from './uploads.service.js';

describe('signParams (Cloudinary)', () => {
  // Ejemplo de la documentación de Cloudinary ("Generating authentication signatures").
  it('coincide con el ejemplo oficial', () => {
    expect(
      signParams(
        { eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop', public_id: 'sample_image', timestamp: 1315060510 },
        'abcd',
      ),
    ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
});
