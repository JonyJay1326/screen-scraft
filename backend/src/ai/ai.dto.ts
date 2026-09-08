import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class ChatDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class UpsertKbDto {
  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  format?: 'md' | 'txt';
}

export class AiSettingsDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  @IsString()
  baseUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  apiKey?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  textModel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  visionModel!: string;

  @IsBoolean()
  visionEnabled!: boolean;
}

export class AiSettingsTestDto {
  @IsIn(['text', 'vision'])
  capability!: 'text' | 'vision';
}
