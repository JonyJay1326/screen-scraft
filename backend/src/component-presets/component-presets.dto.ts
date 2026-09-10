import type { ComponentDefinitionSnapshot } from '@screencraft/shared';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateComponentPresetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsObject()
  definition!: ComponentDefinitionSnapshot;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  thumbnail?: string;
}

export class UpdateComponentPresetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  definition?: ComponentDefinitionSnapshot;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  thumbnail?: string;
}
