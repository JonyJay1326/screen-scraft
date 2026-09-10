import { Type } from 'class-transformer';
import { IsArray, IsIn, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class ParamDto {
  @IsString()
  name!: string;

  @IsIn(['string', 'number'])
  type!: 'string' | 'number';

  @IsOptional()
  defaultValue?: unknown;
}

class ExternalDto {
  @IsString()
  url!: string;

  @IsIn(['GET', 'POST'])
  method!: 'GET' | 'POST';

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsIn(['none', 'bearer', 'basic'])
  authType?: 'none' | 'bearer' | 'basic';

  @IsOptional()
  @IsString()
  authSecret?: string;
}

export class UpsertApiConfigDto {
  @IsString()
  name!: string;

  @IsIn(['sql', 'external'])
  type!: 'sql' | 'external';

  @IsOptional()
  @IsString()
  sql?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ExternalDto)
  external?: ExternalDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParamDto)
  params!: ParamDto[];
}

export class TestApiDto {
  @IsOptional()
  @IsObject()
  params?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  protocol?: string;
}
